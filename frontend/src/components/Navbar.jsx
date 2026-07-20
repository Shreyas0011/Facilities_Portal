import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Lock, User, ShieldAlert, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activePage, onNavigate, onLogout, onChangePassword }) {
  const { user } = useAuth();
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
    { page: 'bookVenue', label: 'Book Venue' },
    { page: 'calendar', label: 'Calendar' },
    ...(isSuperAdmin ? [{ page: 'manage', label: 'Manage' }] : []),
    { page: 'settings', label: 'Settings' },
  ];

  const links = isFaculty ? facultyLinks : adminLinks;

  const handleNavClick = (page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Logo */}
          <div className="logo">
            <img src="/logo.png" alt="Transcend Logo" className="logo-img" />
          </div>

          {/* Desktop nav links */}
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

          {/* Desktop right actions */}
          <div className="nav-actions nav-actions-desktop">
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

          {/* Mobile: hamburger button */}
          <button
            className="nav-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="mobile-nav-header">
              <img src="/logo.png" alt="Transcend Logo" style={{ height: 48, objectFit: 'contain' }} />
              <button className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            <div className="mobile-nav-user">
              <div className="mobile-nav-user-icon">
                {isSuperAdmin ? <ShieldAlert size={16} style={{ color: '#8b5cf6' }} /> : <User size={16} style={{ color: 'var(--primary)' }} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{user?.role}</div>
              </div>
            </div>

            {/* Nav links */}
            <div className="mobile-nav-links">
              {links.map(({ page, label }) => (
                <button
                  key={page}
                  className={`mobile-nav-link${activePage === page ? ' active' : ''}`}
                  onClick={() => handleNavClick(page)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bottom actions */}
            <div className="mobile-nav-actions">
              <button className="mobile-nav-action-btn" onClick={() => { setMobileOpen(false); onChangePassword(); }}>
                <Lock size={15} /> Change Password
              </button>
              <button className="mobile-nav-action-btn mobile-nav-logout" onClick={() => { setMobileOpen(false); onLogout(); }}>
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
