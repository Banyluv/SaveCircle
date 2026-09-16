import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X, AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react';
import { appAPI } from '../utils/api';
import {
  hasNativeUpdater,
  getInstalledVersionCode,
  canInstallPackages,
  openInstallPermissionSettings,
  downloadAndInstall,
  restartApp,
  subscribeToUpdateEvents
} from '../utils/appUpdater';

// Prompts an installed Android app to install a newer APK.
//
// Why this is needed at all: the phone app ships its UI inside the APK, so a
// web deployment does not reach it. The server publishes the current version at
// /api/app/version; this component compares that with the versionCode actually
// installed, and when the server is ahead it offers a one-tap update. After the
// download, Android's installer replaces the app and Android restarts it, so
// the user lands back on the new version.
//
// Renders nothing on the web, in the desktop shell, or when up to date.
const DISMISS_KEY = 'savecircle_update_dismissed_code';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes

export default function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [release, setRelease] = useState(null);
  const [phase, setPhase] = useState('available'); // available | downloading | installing | error | done
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [needsPermission, setNeedsPermission] = useState(false);
  const installRequested = useRef(false);

  const native = hasNativeUpdater();

  const check = useCallback(async () => {
    if (!native) return;

    const installedCode = getInstalledVersionCode();
    if (installedCode === null) return;

    // Respect a dismissal, but only for that specific build: when an even newer
    // version ships, the prompt must come back.
    let dismissedFor = null;
    try { dismissedFor = Number(sessionStorage.getItem(DISMISS_KEY)) || null; } catch { /* ignore */ }

    try {
      const data = await appAPI.latestVersion(installedCode);
      if (!data || !data.updateAvailable) return;
      if (dismissedFor !== null && dismissedFor >= data.latestVersionCode) return;
      // Never offer an update the server cannot actually deliver: a hosted
      // deploy without APK_URL has no binary, and downloading the 404 page
      // would look like a corrupt update.
      if (data.apkAvailable === false) return;

      setRelease(data);
      setPhase('available');
      setError('');
      setPercent(0);
      setNeedsPermission(!canInstallPackages());
      setVisible(true);
    } catch {
      // Offline or the server is unreachable — silently retry on the next cycle.
    }
  }, [native]);

  // Check on mount and periodically, so a phone left open still gets prompted.
  useEffect(() => {
    if (!native) return;
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [native, check]);

  // Native progress events
  useEffect(() => {
    if (!visible) return;
    return subscribeToUpdateEvents((event) => {
      if (!event || !event.type) return;
      if (event.type === 'started') {
        setPhase('downloading');
      } else if (event.type === 'progress') {
        setPercent(event.percent >= 0 ? event.percent : 0);
      } else if (event.type === 'installing') {
        setPercent(100);
        setPhase('installing');
      } else if (event.type === 'error') {
        setError(event.message || 'The update failed.');
        setPhase('error');
      }
    });
  }, [visible]);

  // Re-check the install permission when the user returns from Settings.
  useEffect(() => {
    if (!visible) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNeedsPermission(!canInstallPackages());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [visible]);

  const dismiss = () => {
    try {
      if (release?.latestVersionCode) {
        sessionStorage.setItem(DISMISS_KEY, String(release.latestVersionCode));
      }
    } catch { /* ignore */ }
    setVisible(false);
  };

  const startUpdate = () => {
    if (!release?.apkUrl || release.apkAvailable === false) return;
    setError('');
    setNeedsPermission(!canInstallPackages());

    const result = downloadAndInstall(release.apkUrl, release.sha256);
    if (result?.status === 'error') {
      setError(result.message || 'The update could not be started.');
      setPhase('error');
      return;
    }
    installRequested.current = true;
    setPhase('downloading');
  };

  if (!native || !visible || !release) return null;

  const busy = phase === 'downloading' || phase === 'installing';

  return (
    <div
      role="dialog"
      aria-label="App update available"
      style={{
        position: 'fixed',
        left: '0.75rem',
        right: '0.75rem',
        bottom: '0.75rem',
        // Below --z-modal so it can never cover a dialog's buttons.
        zIndex: 'var(--z-prompt)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-card-accent)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '1rem',
        animation: 'sheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {!busy && (
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: '0.5rem', right: '0.5rem',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '0.25rem', display: 'inline-flex'
          }}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: '42px', height: '42px', flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {phase === 'done'
            ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />
            : phase === 'error'
              ? <AlertTriangle className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />
              : <Smartphone className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: busy ? 0 : '1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {phase === 'downloading' ? 'Downloading update…'
              : phase === 'installing' ? 'Ready to install'
              : phase === 'error' ? 'Update failed'
              : phase === 'done' ? 'Update installed'
              : 'A new version is available'}
          </div>

          {phase === 'available' && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              Version <strong style={{ color: 'var(--text-main)' }}>{release.latestVersionName}</strong> is ready.
              {release.notes ? <> {release.notes}</> : ' Update to get the latest features and fixes.'}
            </div>
          )}

          {busy && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                {phase === 'installing'
                  ? 'Android will now install the update and restart SaveCircle.'
                  : `Downloading… ${percent > 0 ? `${percent}%` : ''}`}
              </div>
              <div style={{
                height: '6px', borderRadius: '3px', overflow: 'hidden',
                background: 'var(--neutral-bg)'
              }}>
                <div style={{
                  height: '100%', width: `${phase === 'installing' ? 100 : percent}%`,
                  background: 'var(--brand-gradient)', transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div style={{ fontSize: '0.82rem', color: 'var(--danger-text)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {phase === 'done' && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              The new version is installed. Restart the app to use it.
            </div>
          )}

          {/* Android requires an explicit opt-in before any app may install
              packages. Say so up front — otherwise the installer appears to do
              nothing. */}
          {phase === 'available' && needsPermission && (
            <div style={{
              marginTop: '0.6rem', padding: '0.6rem 0.7rem',
              background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem', color: 'var(--warning-text)', lineHeight: 1.5
            }}>
              One-time step: allow SaveCircle to install apps.
              <button
                onClick={() => { openInstallPermissionSettings(); installRequested.current = true; }}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Open Android settings
              </button>
            </div>
          )}

          {phase === 'available' && !needsPermission && (
            <button
              onClick={startUpdate}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.7rem', width: '100%' }}
            >
              <Download className="w-4 h-4" /> Update now
            </button>
          )}

          {(phase === 'error' || phase === 'done') && (
            <button
              onClick={restartApp}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.7rem', width: '100%' }}
            >
              <RefreshCw className="w-4 h-4" /> Restart now
            </button>
          )}

          {phase === 'installing' && (
            <button
              onClick={startUpdate}
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.7rem', width: '100%' }}
            >
              <RefreshCw className="w-4 h-4" /> Reopen installer
            </button>
          )}

          {!busy && (
            <button
              onClick={dismiss}
              style={{
                marginTop: '0.4rem', width: '100%',
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: '0.78rem', padding: '0.3rem'
              }}
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
