import React from 'react';
import { ArrowLeft } from 'lucide-react';

// A predictable "Back" control placed at the top of a secondary screen.
//
// On a phone the sidebar is an off-canvas drawer, so tapping a nav item can
// leave the user on a screen with no visible way out. This bar gives every such
// screen a consistent escape hatch. It is hidden above the mobile breakpoint
// via CSS (.mobile-back-bar), so desktop layouts are unchanged.
export default function MobileBackBar({ onBack, label = 'Back', title }) {
  if (!onBack) return null;
  return (
    <div className="mobile-back-bar">
      <button onClick={onBack} aria-label={label}>
        <ArrowLeft className="w-4 h-4" /> {label}
      </button>
      {title && <span className="mobile-back-title">{title}</span>}
    </div>
  );
}
