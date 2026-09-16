package com.savecircle.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * In-app APK updater.
 *
 * A Capacitor app bundles the web assets INSIDE the APK, so shipping new
 * frontend code to an installed phone means installing a new APK. This class
 * gives the web UI the three things it cannot do from JavaScript:
 *
 *   1. read the versionCode of the APK that is actually installed;
 *   2. download a newer APK and hand it to Android's package installer;
 *   3. relaunch the app.
 *
 * Flow: the web layer asks /api/app/version whether a newer build exists, then
 * calls downloadAndInstall(). Android's installer takes over from there and
 * replaces the running app, which Android restarts for us — the user sees the
 * app close and reopen on the new version.
 *
 * Exposed to JavaScript as `window.SaveCircleUpdater` (see MainActivity).
 */
public class UpdateManager {

    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final String DOWNLOAD_DIR = "updates";
    private static final long PROGRESS_INTERVAL_MS = 600L;

    private final Activity activity;
    private final WebView webView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private BroadcastReceiver downloadReceiver;
    private long downloadId = -1L;
    private File pendingFile;
    private String pendingSha256;

    public UpdateManager(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    // ─── Version information ────────────────────────────────────────────────

    /** versionCode of the installed APK, as a String (JS interop is string-only). */
    @android.webkit.JavascriptInterface
    public String getVersionCode() {
        return String.valueOf(readVersionCode());
    }

    /** versionName of the installed APK, e.g. "1.0". */
    @android.webkit.JavascriptInterface
    public String getVersionName() {
        try {
            PackageInfo info = packageInfo();
            return info.versionName == null ? "" : info.versionName;
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Whether this app is currently allowed to install packages. Android 8+
     * requires the user to opt in per source; without it the install intent is
     * silently ignored, so the UI asks before downloading rather than after.
     */
    @android.webkit.JavascriptInterface
    public String canInstallPackages() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return String.valueOf(activity.getPackageManager().canRequestPackageInstalls());
            }
            return "true"; // Pre-Oreo: granted at install time via manifest.
        } catch (Exception e) {
            return "false";
        }
    }

    /** Opens the system screen where the user allows installs from this app. */
    @android.webkit.JavascriptInterface
    public void openInstallPermissionSettings() {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                        intent.setData(Uri.parse("package:" + activity.getPackageName()));
                        activity.startActivity(intent);
                    }
                } catch (Exception ignored) {
                    // Some OEM builds lack this screen; the download still runs and
                    // Android will prompt during the install instead.
                }
            }
        });
    }

    // ─── Download + install ─────────────────────────────────────────────────

    /**
     * Downloads the APK then hands it to the package installer.
     * Returns a JSON string: {"status":"started"} or {"status":"error","message":"…"}.
     */
    @android.webkit.JavascriptInterface
    public String downloadAndInstall(final String url, final String expectedSha256) {
        try {
            if (url == null || url.trim().isEmpty()) {
                return errorJson("No download URL was provided.");
            }

            // A previous download may still be registered; clear it so the old
            // receiver cannot fire against the new one.
            releaseReceiver();

            cleanupOldApks();

            File dir = downloadDirectory();
            if (dir == null) {
                return errorJson("Could not open a downloads folder on this device.");
            }

            final String fileName = "savecircle-" + System.currentTimeMillis() + ".apk";
            pendingFile = new File(dir, fileName);
            pendingSha256 = expectedSha256 == null ? "" : expectedSha256.trim().toLowerCase(Locale.US);

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("SaveCircle update");
            request.setDescription("Downloading the latest version…");
            request.setMimeType(APK_MIME);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(
                    activity, Environment.DIRECTORY_DOWNLOADS, DOWNLOAD_DIR + "/" + fileName);

            DownloadManager manager =
                    (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                return errorJson("This device has no download service available.");
            }

            downloadId = manager.enqueue(request);
            registerReceiver();

            emit("{\"type\":\"started\"}");
            startProgressPolling();

            return "{\"status\":\"started\"}";
        } catch (Exception e) {
            releaseReceiver();
            return errorJson(e.getMessage() == null ? "Download could not be started." : e.getMessage());
        }
    }

    private void startProgressPolling() {
        mainHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (downloadId == -1L) return;
                DownloadManager dm =
                        (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm == null) return;

                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                android.database.Cursor cursor = null;
                try {
                    cursor = dm.query(query);
                    if (cursor != null && cursor.moveToFirst()) {
                        long downloaded = cursor.getLong(
                                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                        long total = cursor.getLong(
                                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                        int percent = total > 0
                                ? (int) Math.round((downloaded * 100.0) / total)
                                : -1;
                        emit("{\"type\":\"progress\",\"percent\":" + percent
                                + ",\"downloaded\":" + downloaded + ",\"total\":" + total + "}");
                        mainHandler.postDelayed(this, PROGRESS_INTERVAL_MS);
                    }
                } catch (Exception ignored) {
                    // Ignore transient query failures; completion is still reported
                    // by the broadcast receiver.
                } finally {
                    if (cursor != null) cursor.close();
                }
            }
        }, PROGRESS_INTERVAL_MS);
    }

    private void registerReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (id != downloadId) return;
                onDownloadFinished(id);
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            activity.registerReceiver(downloadReceiver, filter);
        }
    }

    private void onDownloadFinished(long id) {
        try {
            DownloadManager dm =
                    (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                emit("{\"type\":\"error\",\"message\":\"Download service unavailable.\"}");
                return;
            }

            // The receiver fires for failures too, so confirm the file landed.
            boolean ok = true;
            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(id);
            android.database.Cursor cursor = null;
            try {
                cursor = dm.query(query);
                if (cursor != null && cursor.moveToFirst()) {
                    int status = cursor.getInt(
                            cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    ok = status == DownloadManager.STATUS_SUCCESSFUL;
                }
            } finally {
                if (cursor != null) cursor.close();
            }

            if (!ok || pendingFile == null || !pendingFile.exists()) {
                emit("{\"type\":\"error\",\"message\":\"The download did not complete.\"}");
                releaseReceiver();
                return;
            }

            // Verify integrity before asking Android to install it: a truncated or
            // tampered file would otherwise surface as a confusing parse error from
            // the installer.
            if (pendingSha256 != null && !pendingSha256.isEmpty()) {
                String actual = sha256(pendingFile);
                if (actual == null || !actual.equalsIgnoreCase(pendingSha256)) {
                    //noinspection ResultOfMethodCallIgnored
                    pendingFile.delete();
                    emit("{\"type\":\"error\",\"message\":\"The update file failed its integrity check.\"}");
                    releaseReceiver();
                    return;
                }
            }

            emit("{\"type\":\"installing\"}");
            launchInstaller(pendingFile);
        } catch (Exception e) {
            emit("{\"type\":\"error\",\"message\":\""
                    + escape(e.getMessage() == null ? "Install failed." : e.getMessage()) + "\"}");
        } finally {
            releaseReceiver();
        }
    }

    /** Hands the downloaded APK to Android's installer. */
    private void launchInstaller(final File apk) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    Uri uri = FileProvider.getUriForFile(
                            activity, activity.getPackageName() + ".fileprovider", apk);

                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, APK_MIME);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Exception e) {
                    emit("{\"type\":\"error\",\"message\":\"Could not open the installer: "
                            + escape(e.getMessage() == null ? "unknown error" : e.getMessage()) + "\"}");
                }
            }
        });
    }

    // ─── Restart ────────────────────────────────────────────────────────────

    /**
     * Relaunches the app. Android already restarts us when the update installs,
     * so this is for the case where the user updates but the installer was
     * dismissed — the UI offers "Restart now" so the new code is picked up.
     */
    @android.webkit.JavascriptInterface
    public void restartApp() {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent intent = activity.getPackageManager()
                            .getLaunchIntentForPackage(activity.getPackageName());
                    if (intent != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP
                                | Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(intent);
                    }
                    activity.finishAffinity();
                    Runtime.getRuntime().exit(0);
                } catch (Exception ignored) {
                    // Nothing further we can do; the user can reopen the app manually.
                }
            }
        });
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private PackageInfo packageInfo() throws PackageManager.NameNotFoundException {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
    }

    private long readVersionCode() {
        try {
            PackageInfo info = packageInfo();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            //noinspection deprecation
            return info.versionCode;
        } catch (Exception e) {
            return 0L;
        }
    }

    private File downloadDirectory() {
        File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) return null;
        File target = new File(dir, DOWNLOAD_DIR);
        if (!target.exists() && !target.mkdirs()) {
            // Fall back to the app cache, which FileProvider also exposes.
            target = new File(activity.getCacheDir(), DOWNLOAD_DIR);
            if (!target.exists() && !target.mkdirs()) return null;
        }
        return target;
    }

    /** Installed APKs are large; keep at most the current download around. */
    private void cleanupOldApks() {
        try {
            File dir = downloadDirectory();
            if (dir == null) return;
            File[] files = dir.listFiles();
            if (files == null) return;
            for (File f : files) {
                if (f.isFile() && f.getName().endsWith(".apk")) {
                    //noinspection ResultOfMethodCallIgnored
                    f.delete();
                }
            }
        } catch (Exception ignored) {
            // Best effort only.
        }
    }

    private void releaseReceiver() {
        downloadId = -1L;
        if (downloadReceiver == null) return;
        try {
            activity.unregisterReceiver(downloadReceiver);
        } catch (Exception ignored) {
            // Already unregistered.
        }
        downloadReceiver = null;
    }

    private static String sha256(File file) {
        try (InputStream in = new FileInputStream(file)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            StringBuilder sb = new StringBuilder();
            for (byte b : digest.digest()) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private static String escape(String value) {
        try {
            return JSONObject.quote(value);
        } catch (Exception e) {
            return "\"\"";
        }
    }

    private static String errorJson(String message) {
        return "{\"status\":\"error\",\"message\":" + escape(message) + "}";
    }

    /** Pushes an event to `window.__savecircleUpdaterEvent(json)`. */
    private void emit(String json) {
        final String js = "window.__savecircleUpdaterEvent && window.__savecircleUpdaterEvent("
                + JSONObject.quote(json) + ");";
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (webView == null) return;
                try {
                    webView.evaluateJavascript(js, null);
                } catch (Exception ignored) {
                    // The page may have been torn down; nothing to update.
                }
            }
        });
    }

    /** Detaches the receiver; called from the activity's onDestroy. */
    public void dispose() {
        releaseReceiver();
    }
}
