import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Lock, User, ShieldAlert, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activePage, onNavigate, onLogout, onChangePassword }) {
  const { user } = useAuth();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isFaculty = user?.role === 'faculty';

  const facultyLinks = [
    { page: 'amenities', label: 'Amenities' },
    { page: 'calendar', label: 'Calendar' },
    { page: 'myBookings', label: 'My Bookings' },
    { page: 'settings', label: 'Settings' },
  ];

  const adminLinks = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'queue', label: 'Approval Queue' },
    { page: 'calendar', label: 'Calendar' },
    ...(isSuperAdmin ? [{ page: 'manage', label: 'Manage' }] : []),
    { page: 'settings', label: 'Settings' },
  ];

  const links = isFaculty ? facultyLinks : adminLinks;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo">
          <img src="./logo.png" alt="Transcend Logo" className="logo-img" />
        </div>
        <div className="nav-links">
          {links.map(({ page, label }) => (
            <a
              key={page} href="#"
              className={activePage === page ? 'active' : ''}
              onClick={e => { e.preventDefault(); onNavigate(page); }}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <div className="profile-dropdown" ref={dropRef}>
            <div
              className="user-badge"
              style={{ cursor: 'pointer' }}
              onClick={() => setDropOpen(p => !p)}
            >
              {isSuperAdmin
                ? <><ShieldAlert size={14} style={{ color: '#8b5cf6' }} /> <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{user?.name}</span></>
                : <><User size={14} /> <span>{user?.name}</span></>
              }
            </div>
            {dropOpen && (
              <div className="dropdown-menu" id="profileDropdownMenu">
                <button className="dropdown-item" type="button" onClick={() => { setDropOpen(false); onChangePassword(); }}>
                  <Lock size={14} /><span>Change Password</span>
                </button>
                <button className="dropdown-item" type="button" onClick={() => { setDropOpen(false); onLogout(); }}>
                  <LogOut size={14} /><span>Log Out</span>
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onLogout}>
            <LogOut size={16} style={{ width: 16, height: 16 }} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
