import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config.js';

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);

  // Ping the backend on mount to wake Render from sleep before the user tries to login
  useEffect(() => {
    const wakeServer = async () => {
      try {
        setServerWaking(true);
        await fetch(`${API_BASE_URL.replace('/api', '')}/health`, { method: 'GET' });
      } catch {
        // Silently ignore — server may already be awake or ping may fail
      } finally {
        setServerWaking(false);
      }
    };
    wakeServer();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up">
        <div className="login-logo">
          <img src="./logo.png" alt="Transcend Logo" className="login-logo-img" />
        </div>
        <h2>Campus Facility Portal</h2>
        <p className="login-subtitle">Sign in with your institutional account</p>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on" noValidate>
          <div className="form-group">
            <label htmlFor="loginEmail">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} />
              <input
                type="email" id="loginEmail" placeholder="you@transcendgroup.org"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="loginPassword">Password</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <Lock size={16} />
              <input
                type={showPwd ? 'text' : 'password'} id="loginPassword"
                placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
              <button type="button" className="pwd-toggle-btn" tabIndex={-1} onClick={() => setShowPwd(p => !p)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {serverWaking && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.4rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.2s ease-in-out infinite' }} />
              Connecting to server…
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-submit" disabled={loading || serverWaking} style={{ width: '100%', marginTop: '0.25rem' }}>
            <span>{loading ? 'Signing in…' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="login-divider" style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
          <span style={{ padding: '0 1rem' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
        </div>

        <button
          type="button"
          onClick={() => onLogin({ role: 'calendarView' })}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderRadius: 12, background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0284c7', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} />
            <span>View Campus Calendar</span>
          </div>
          <ArrowRight size={18} />
        </button>

        <div className="login-footer" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '0.25rem' }}>OWNED BY TRANSCEND GROUP OF INSTITUTIONS</div>
          <div>Developed by <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Start Smart, SE</span></div>
        </div>
      </div>
    </div>
  );
}
