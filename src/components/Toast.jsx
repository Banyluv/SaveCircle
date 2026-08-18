import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 200,
      background: '#1e293b',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.85rem 1.2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: 'var(--shadow-lg)',
      animation: 'scaleUp 0.2s ease-out'
    }}>
      {getIcon()}
      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
        {toast.message}
      </span>
      <button 
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
