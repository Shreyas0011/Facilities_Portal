import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ViewerPortal from './pages/ViewerPortal';
import FacultyPortal from './pages/FacultyPortal';
import AdminPortal from './pages/AdminPortal';
import Navbar from './components/Navbar';

// View states: 'loading' | 'login' | 'changePassword' | 'portal'
export default function App() {
  const { user, token, fetchMe, logout, setUser } = useAuth();
  const [view, setView] = useState('loading');
  const [activePage, setActivePage] = useState('amenities');

  // On mount: check if a token is saved and restore session
  useEffect(() => {
    if (!token) { setView('login'); return; }
    fetchMe().then(u => {
      if (!u) { setView('login'); return; }
      if (u.first_login) { setView('changePassword'); return; }
      setActivePage(u.role === 'faculty' ? 'amenities' : 'queue');
      setView('portal');
    });
  }, []);

  const handleLogin = (u) => {
    if (u.role === 'calendarView') { setActivePage('calendar'); setView('portal'); return; }
    if (u.first_login) { setView('changePassword'); return; }
    setActivePage(u.role === 'faculty' ? 'amenities' : 'queue');
    setView('portal');
  };

  const handlePasswordChanged = () => {
    setUser(prev => ({ ...prev, first_login: false }));
    setActivePage(user?.role === 'faculty' ? 'amenities' : 'queue');
    setView('portal');
  };

  const handleLogout = () => { logout(); setView('login'); };

  const handleNavigate = (page) => { setActivePage(page); };

  const handleChangePassword = () => { setView('changePassword'); };

  if (view === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>
        Loading…
      </div>
    );
  }

  const role = user?.role;
  const isCalendarView = role === 'calendarView' || (!role && view === 'portal');
  const isViewer = role === 'viewer';
  const isFaculty = role === 'faculty';
  const isAdmin = role === 'admin' || role === 'superadmin';

  return (
    <>
      {/* Background decoration */}
      <div className="bg-mesh" />
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />

      {/* Navbar — shown for logged-in non-viewer users */}
      {view === 'portal' && !isViewer && !isCalendarView && (
        <Navbar
          activePage={activePage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onChangePassword={handleChangePassword}
        />
      )}

      <main>
        {view === 'login' && <LoginPage onLogin={handleLogin} />}

        {view === 'changePassword' && (
          <ChangePasswordPage
            isFirstLogin={user?.first_login}
            onSuccess={handlePasswordChanged}
            onCancel={user?.first_login ? undefined : () => setView('portal')}
          />
        )}

        {view === 'portal' && (isViewer || isCalendarView) && (
          <ViewerPortal onLogout={handleLogout} />
        )}

        {view === 'portal' && isFaculty && (
          <FacultyPortal
            activePage={activePage}
            onNavigate={handleNavigate}
            onChangePassword={handleChangePassword}
          />
        )}

        {view === 'portal' && isAdmin && (
          <AdminPortal
            activePage={activePage}
            onNavigate={handleNavigate}
            onChangePassword={handleChangePassword}
          />
        )}
      </main>
    </>
  );
}
