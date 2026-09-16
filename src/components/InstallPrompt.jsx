import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';
import { appAPI } from '../utils/api';

// Prompts phone visitors to install the SaveCircle Android app.
//
// Two paths, because they are genuinely different:
//  1. Android + Chrome: a real APK download. The browser will then show its own
//     "install this app?" dialog when the downloaded file is opened — the OS
//     owns that prompt, a web page cannot trigger it. We surface a clear install
//     step here and offer the download again after it finishes.
//  2. iOS: sideloading an APK is impossible, so we explain "Add to Home Screen"
//     instead of offering a download that could never work.
//
// Deliberately NOT shown in the packaged app (there is nothing to install) or on
// desktop.
const DISMISS_KEY = 'savecircle_install_prompt_dismissed';
const DEFAULT_APK_URL = '/downloads/savecircle.apk';

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // The download link comes from the server, so a release hosted elsewhere
  // (APK_URL) is picked up without rebuilding this bundle.
  const [apkUrl, setApkUrl] = useState(DEFAULT_APK_URL);
  const [version, setVersion] = useState('');
  // A hosted deployment may have no APK at all (apk/ is gitignored). In that
  // case the server says so and we hide the download instead of offering one
  // that 404s.
  const [apkAvailable, setApkAvailable] = useState(true);

  useEffect(() => {
    // Already running inside the installed app → nothing to prompt.
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.navigator.standalone === true
      || window.Capacitor?.isNativePlatform?.() === true;
    if (standalone) return;

    // Only on phones/tablets.
    const ua = window.navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    if (!mobile) return;

    // Respect a previous dismissal, but only for this browser session.
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

    setIsIOS(/iPhone|iPad|iPod/i.test(ua));

    // Ask the server which build is current. Failure is not fatal — the local
    // route is a sensible fallback.
    appAPI.latestVersion()
      .then((data) => {
        if (data?.apkUrl) setApkUrl(data.apkUrl);
        if (data?.latestVersionName) setVersion(data.latestVersionName);
        // Only an explicit false hides the button; a missing field (older
        // server) keeps the previous permissive behaviour.
        if (data?.apkAvailable === false) setApkAvailable(false);
      })
      .catch(() => { /* keep the default */ });

    // Small delay so the login screen paints first.
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = apkUrl;
    a.download = 'SaveCircle.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the SaveCircle app"
      style={{
        position: 'fixed',
        left: '0.75rem',
        right: '0.75rem',
        bottom: '0.75rem',
        // Below --z-modal: this banner is informational and must never sit on
        // top of a dialog the user is actively working in.
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

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: '42px', height: '42px', flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Smartphone className="w-5 h-5" style={{ color: 'var(--on-brand)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: '1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {downloaded ? 'Finish installing' : 'Install the SaveCircle app'}
          </div>

          {isIOS ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              Tap <Share className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: '-2px' }} /> <strong>Share</strong>,
              then choose <Plus className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: '-2px' }} /> <strong>Add to Home Screen</strong>.
              {' '}A downloadable APK is Android-only, so iPhone installs this way.
            </div>
          ) : downloaded ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              Open <strong>SaveCircle.apk</strong> from your notifications or Downloads,
              then tap <strong>Install</strong>. If Android asks, allow
              {' '}<em>“Install unknown apps”</em> for your browser — that is the
              standard prompt for any app installed outside the Play Store.
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
              Get the full app on your home screen — faster than the browser and works
              on a poor connection.{version ? ` Version ${version}.` : ''}
            </div>
          )}

          {!isIOS && apkAvailable && (
            <button
              onClick={download}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.7rem', width: '100%' }}
            >
              <Download className="w-4 h-4" />
              {downloaded ? 'Download again' : 'Download APK'}
            </button>
          )}

          {/* The app has no downloadable build configured on this server, so
              explain that rather than showing a dead button. */}
          {!isIOS && !apkAvailable && (
            <div style={{
              marginTop: '0.7rem', padding: '0.55rem 0.7rem',
              background: 'var(--neutral-bg)', borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5
            }}>
              The Android app is not available for download here yet. Ask your
              administrator for the installer, or keep using SaveCircle in the browser.
            </div>
          )}

          <button
            onClick={dismiss}
            style={{
              marginTop: '0.4rem', width: '100%',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: '0.78rem', padding: '0.3rem'
            }}
          >
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  );
}
