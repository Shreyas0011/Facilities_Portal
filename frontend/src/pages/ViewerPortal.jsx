import React from 'react';
import { LogOut } from 'lucide-react';
import CalendarView from '../components/CalendarView';

export default function ViewerPortal({ onLogout }) {
  return (
    <div id="calendarViewPortal" style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Minimalist Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Transcend Logo" style={{ height: 32 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Campus Schedule</h2>
        </div>
        <button className="btn btn-outline" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.82rem', borderColor: 'var(--surface-border)', color: 'var(--text-main)' }}>
          <LogOut size={14} />
          <span>Exit Calendar</span>
        </button>
      </div>
      <CalendarView />
    </div>
  );
}
