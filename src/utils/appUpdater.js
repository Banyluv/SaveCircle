// Bridge to the native Android updater (see android/.../UpdateManager.java).
//
// A Capacitor app serves its UI from assets baked into the APK, so deploying a
// new frontend to the web does NOT update an installed phone. The native side
// exposes `window.SaveCircleUpdater`, which can:
//   - report the versionCode / versionName actually installed
//   - report whether Android permits installing packages from this app
//   - download an APK and hand it to the package installer
//   - relaunch the app
//
// Everything here degrades to "not available" in a browser/desktop build, so
// the components that use it stay safe to render anywhere.

const bridge = () =>
  (typeof window !== 'undefined' && window.SaveCircleUpdater) ? window.SaveCircleUpdater : null;

// True only inside the packaged Android app, where the updater bridge exists.
export const hasNativeUpdater = () => bridge() !== null;

export const getInstalledVersionCode = () => {
  const b = bridge();
  if (!b) return null;
  try {
    const raw = b.getVersionCode();
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

export const getInstalledVersionName = () => {
  const b = bridge();
  if (!b) return '';
  try {
    return String(b.getVersionName() || '');
  } catch {
    return '';
  }
};

export const canInstallPackages = () => {
  const b = bridge();
  if (!b) return false;
  try {
    return String(b.canInstallPackages()) === 'true';
  } catch {
    return false;
  }
};

export const openInstallPermissionSettings = () => {
  const b = bridge();
  if (!b) return false;
  try {
    b.openInstallPermissionSettings();
    return true;
  } catch {
    return false;
  }
};

/**
 * Starts the download. Resolves once the download has been *started* — not
 * finished. Progress and completion arrive through subscribeToUpdateEvents().
 */
export const downloadAndInstall = (url, sha256) => {
  const b = bridge();
  if (!b) return { status: 'unavailable' };
  try {
    const raw = b.downloadAndInstall(String(url || ''), String(sha256 || ''));
    return raw ? JSON.parse(raw) : { status: 'started' };
  } catch (e) {
    return { status: 'error', message: 'The updater could not be started.' };
  }
};

export const restartApp = () => {
  const b = bridge();
  if (!b) return false;
  try {
    b.restartApp();
    return true;
  } catch {
    return false;
  }
};

/**
 * Subscribes to native progress events. The native side calls
 * window.__savecircleUpdaterEvent(json) with:
 *   {type:'started'} | {type:'progress',percent,downloaded,total}
 *   | {type:'installing'} | {type:'error',message}
 * Returns an unsubscribe function.
 */
export const subscribeToUpdateEvents = (handler) => {
  if (typeof window === 'undefined') return () => {};

  window.__savecircleUpdaterEvent = (payload) => {
    let event = payload;
    if (typeof payload === 'string') {
      try { event = JSON.parse(payload); } catch { return; }
    }
    if (event && typeof event === 'object') handler(event);
  };

  return () => {
    try { delete window.__savecircleUpdaterEvent; } catch { window.__savecircleUpdaterEvent = undefined; }
  };
};
