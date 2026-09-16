package com.savecircle.app;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * SaveCircle Android shell.
 *
 * Adds one thing to the stock Capacitor activity: an in-app APK updater.
 * Capacitor serves the UI from assets baked into the APK, so a web deploy does
 * NOT reach phones — the only way to ship new frontend code to an installed app
 * is to install a new APK. {@link UpdateManager} is exposed to the web layer as
 * `window.SaveCircleUpdater` so the UI can detect a newer build and install it.
 */
public class MainActivity extends BridgeActivity {

    /** Name of the JavaScript object the updater is registered under. */
    public static final String UPDATER_BRIDGE = "SaveCircleUpdater";

    private UpdateManager updateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView == null) return;

        updateManager = new UpdateManager(this, webView);
        // Only our own bundled assets are ever loaded into this WebView, so the
        // bridge is not exposed to untrusted third-party content.
        webView.addJavascriptInterface(updateManager, UPDATER_BRIDGE);
    }

    @Override
    public void onDestroy() {
        if (updateManager != null) {
            updateManager.dispose();
            updateManager = null;
        }
        super.onDestroy();
    }
}

