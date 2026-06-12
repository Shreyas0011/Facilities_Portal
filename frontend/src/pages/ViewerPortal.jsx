import React from 'react';
import { LogOut, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/CalendarView';

export default function ViewerPortal({ onLogout }) {
  const { user } = useAuth();

  return (
    <div id="calendarViewPortal">
      <div className="cal-view-topbar">
        <div className="cal-view-topbar-inner">
          <div className="logo">
            <img src="./logo.png" alt="Transcend Logo" className="logo-img" />
          </div>
          <div className="cal-view-topbar-title">
            <CalendarDays size={18} style={{ color: 'var(--primary)' }} />
            <span>Campus Booking Schedule</span>
            <span className="cal-view-badge">View Only</span>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: '0.85rem' }}>
            <LogOut size={15} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      <div className="cal-view-content">
        <header className="hero" style={{ paddingTop: '8rem' }}>
          <div className="hero-badge">
            <CalendarDays size={16} />
            <span>Read-Only Schedule</span>
          </div>
          <h1>Campus Booking Calendar</h1>
          <p>Browse all approved and pending facility reservations across campus.</p>
        </header>
        <div className="content-container">
          <CalendarView />
        </div>
      </div>
    </div>
  );
}
