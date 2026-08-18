import React from 'react';
import { Wallet, Plus, RotateCcw, ShieldCheck, MapPin, Layers, History } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenCreateModal, onResetDemoData, onLogout }) {
  return (
    <header style={{
      background: 'rgba(17, 28, 46, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-card)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #00a865 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Ajo Tracker
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                Nigeria 🇳🇬
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin className="w-3 h-3 text-emerald-400" /> Nigerian Group Thrift & Savings Pool
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn btn-sm ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Layers className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`btn btn-sm ${activeTab === 'groups' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Wallet className="w-4 h-4" /> Ajo Groups
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
          >
            <History className="w-4 h-4" /> Audit History
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={onResetDemoData}
            title="Restore default Calabar demo data"
            className="btn btn-sm btn-outline"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
          </button>

          <button 
            onClick={onLogout}
            className="btn btn-sm btn-outline"
            title="Log out of the application"
          >
            Logout
          </button>

          <button 
            onClick={onOpenCreateModal}
            className="btn btn-sm btn-gold"
          >
            <Plus className="w-4 h-4" /> Create Ajo Pool
          </button>
        </div>
      </div>
    </header>
  );
}
