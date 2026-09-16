import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Single source of truth for "which mobile build is the latest one?".
//
// The Android APK cannot update itself from the web bundle: Capacitor embeds
// dist/ INSIDE the APK, so new frontend code only reaches a phone by installing
// a new APK. To prompt an installed app that a newer APK exists, the server has
// to publish both the installed-version metadata and a place to download it.
//
// `apk/version.json` is written by scripts/build-apk.ps1 next to the APK. It is
// the only file inside apk/ that is committed (the binary is published to a
// release host and referenced by APK_URL), so a hosted deploy still knows the
// current version without shipping a multi-megabyte binary in the repo.
//
// Every value can be overridden by an environment variable, which makes it
// possible to publish a release without rebuilding the server image.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

const MANIFEST_PATH = path.join(projectRoot, 'apk', 'version.json');

// The local copy of the APK, used when nothing else is configured. It only
// exists on the machine that ran the build, which is why APK_URL matters for a
// hosted deployment.
export const LOCAL_APK_PATH = path.join(projectRoot, 'apk', 'savecircle.apk');

const readManifest = () => {
    try {
        if (!fs.existsSync(MANIFEST_PATH)) return {};
        const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.error('Could not read apk/version.json:', error.message);
        return {};
    }
};

const toInt = (value, fallback) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
};

// A relative APK_URL (or none at all) means "serve the file from this server".
// Returning a path rather than an absolute URL keeps this module free of any
// request context; the caller turns it into an absolute URL.
export const getApkPath = () => {
    const configured = (process.env.APK_URL || '').trim();
    return configured || '/downloads/savecircle.apk';
};

export const isExternalApkUrl = () => /^https?:\/\//i.test(getApkPath());

// Publish a release. `versionCode` is the number Android itself compares, so it
// must increase monotonically; `versionName` is only ever displayed.
export const getRelease = () => {
    const manifest = readManifest();

    const versionCode = toInt(
        process.env.APP_VERSION_CODE ?? manifest.versionCode,
        toInt(manifest.versionCode, 1)
    );
    const versionName = String(
        process.env.APP_VERSION_NAME || manifest.versionName || '' // eslint-disable-line
    ).trim();

    const apkPath = getApkPath();
    const isRemote = /^https?:\/\//i.test(apkPath);

    return {
        versionCode,
        versionName: versionName || '1.0',
        apkPath,
        // A remote URL is taken at face value; a local path is only available if
        // the file is actually on disk (it is not, on a hosted deploy).
        apkAvailable: isRemote || fs.existsSync(LOCAL_APK_PATH),
        sha256: String(process.env.APP_APK_SHA256 || manifest.sha256 || '').trim() || null,
        notes: String(process.env.APP_RELEASE_NOTES || manifest.notes || '').trim() || null,
        releasedAt: manifest.releasedAt || null,
        // Optional escape hatch: force every client to update regardless of the
        // version it reports (useful when a build must be retired).
        forceUpdate: String(process.env.APP_FORCE_UPDATE || manifest.forceUpdate || '').toLowerCase() === 'true'
    };
};

export default { getRelease, getApkPath, isExternalApkUrl, LOCAL_APK_PATH };
