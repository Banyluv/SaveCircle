import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ServerCrash, Server, Check } from 'lucide-react';
import { API_MISCONFIGURED, CAN_SET_SERVER_URL, getRuntimeApiUrl, setRuntimeApiUrl } from '../utils/api';

export default function Login() {
    const { login, sessionMessage, setSessionMessage } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Server address (native app only). Lets an installed APK be re-pointed at a
    // different server — e.g. a LAN IP while testing, then the hosted URL —
    // without rebuilding and reinstalling the APK.
    const [showServer, setShowServer] = useState(API_MISCONFIGURED);
    const [serverUrl, setServerUrl] = useState(getRuntimeApiUrl());
    const [serverSaved, setServerSaved] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSessionMessage && setSessionMessage('');
        setLoading(true);
        const result = await login(email, password);
        if (!result.success) {
            setError(result.message);
        }
        setLoading(false);
    };

    const saveServer = (e) => {
        e.preventDefault();
        let url = serverUrl.trim();
        // Default to http:// so users can type a bare address like 192.168.1.5:5099
        if (url && !/^https?:\/\//i.test(url)) url = `http://${url}`;
        setRuntimeApiUrl(url);
        setServerSaved(true);
        // Reload so every module re-reads the base URL.
        setTimeout(() => window.location.reload(), 600);
    };

    // A native build with no server address can never reach the backend: the app
    // is served from a local origin, so there is nothing to call. Say so
    // explicitly instead of letting it look like a wrong-password error.
    const misconfigured = API_MISCONFIGURED;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Watermark logo — tiled across the whole page */}
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    opacity: 0.05,
                    pointerEvents: 'none',
                    backgroundImage: 'url("/logo.png")',
                    backgroundSize: '260px 260px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'repeat'
                }}
            />

            {/* Soft glow accents for a premium backdrop */}
            <div aria-hidden="true" style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                background: 'radial-gradient(circle at 15% 15%, var(--primary-glow) 0%, transparent 45%), radial-gradient(circle at 85% 85%, var(--accent-gold-glow) 0%, transparent 45%)'
            }} />

            <div className="modal-content" style={{
                maxWidth: '420px',
                width: '100%',
                padding: '2.5rem 2.25rem',
                position: 'relative',
                zIndex: 1,
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 60px rgba(6, 78, 48, 0.18), var(--shadow-glow)',
                border: '1px solid var(--border-card)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15), rgba(0, 135, 81, 0.06))',
                        border: '1px solid var(--border-card-accent)',
                        marginBottom: '1.25rem',
                        boxShadow: 'var(--shadow-glow)'
                    }}>
                        <img
                            src="/logo.png"
                            alt="SaveCircle Logo"
                            style={{
                                width: '88px',
                                height: '88px',
                                borderRadius: 'var(--radius-sm)',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
                        Welcome Back
                    </h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
                        Sign in to your <strong>SaveCircle</strong> account
                    </p>
                </div>

                {sessionMessage && (
                    <div style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', textAlign: 'center', border: '1px solid var(--warning-border)' }}>
                        {sessionMessage}
                    </div>
                )}

                {misconfigured && !showServer && (
                    <div style={{
                        background: 'var(--warning-bg)', color: 'var(--warning-text)',
                        padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem',
                        fontSize: '0.85rem', border: '1px solid var(--warning-border)',
                        display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                    }}>
                        <ServerCrash className="w-4 h-4" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>No server address is set.</strong>
                            <div style={{ marginTop: '0.25rem' }}>
                                This app build cannot reach your data until you enter the server address.
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowServer(true)}
                                className="btn btn-sm"
                                style={{ marginTop: '0.5rem', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-card)' }}
                            >
                                <Server className="w-3.5 h-3.5" /> Set server address
                            </button>
                        </div>
                    </div>
                )}

                {(showServer || CAN_SET_SERVER_URL) && showServer && (
                    <form onSubmit={saveServer} style={{
                        background: 'var(--soft-bg)', border: '1px solid var(--border-card)',
                        borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem'
                    }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                            Server address
                        </label>
                        <input
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                            placeholder="http://192.168.1.5:5099"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            The address of your SaveCircle server. On the same Wi-Fi as your computer,
                            use your computer's LAN address (not “localhost”).
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                                <Check className="w-3.5 h-3.5" /> {serverSaved ? 'Saved — reloading…' : 'Save & reload'}
                            </button>
                            {!misconfigured && (
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowServer(false)}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {error && (
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid var(--danger-border)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(s => !s)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-md)' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.1rem'
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-card)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Demo Accounts
                        </span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-card)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <p style={{ margin: 0 }}>Super Admin: <strong style={{ color: 'var(--text-main)' }}>superadmin@savecircle.com</strong> / <strong style={{ color: 'var(--text-main)' }}>superadmin123</strong></p>
                        <p style={{ margin: 0 }}>Group Admin: <strong style={{ color: 'var(--text-main)' }}>admin1@savecircle.com</strong> / <strong style={{ color: 'var(--text-main)' }}>admin123</strong></p>
                        <p style={{ margin: 0 }}>Member: <strong style={{ color: 'var(--text-main)' }}>member1@savecircle.com</strong> / <strong style={{ color: 'var(--text-main)' }}>member123</strong></p>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Nigerian Group Thrift &amp; Rotating Savings Platform 🇳🇬
                </div>
            </div>
        </div>
    );
}
