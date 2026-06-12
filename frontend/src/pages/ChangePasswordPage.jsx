import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function getStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct: '0%', color: 'transparent', text: '' },
    { pct: '25%', color: '#ef4444', text: 'Weak' },
    { pct: '50%', color: '#f59e0b', text: 'Fair' },
    { pct: '75%', color: '#3b82f6', text: 'Good' },
    { pct: '90%', color: '#10b981', text: 'Strong' },
    { pct: '100%', color: '#059669', text: 'Very Strong' },
  ];
  return levels[Math.min(score, 5)];
}

export default function ChangePasswordPage({ onSuccess, onCancel, isFirstLogin }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = getStrength(newPwd);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!current) { setError('Please enter your current password.'); return; }
    if (newPwd.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPwd !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await changePassword(current, newPwd);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up" style={{ maxWidth: 420 }}>
        <div className="auth-icon-wrap" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
            <ShieldCheck size={28} color="white" />
          </div>
        </div>
        <h2 style={{ textAlign: 'center' }}>Set Your Password</h2>
        <p className="login-subtitle" style={{ textAlign: 'center' }}>
          {isFirstLogin ? 'This is your first login. Please create a secure new password to continue.' : 'Update your account password.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ marginTop: '1.5rem' }}>
          {[
            { label: 'Current Password', val: current, set: setCurrent, show: showCurrent, setShow: setShowCurrent, id: 'currentPassword', ac: 'current-password' },
            { label: 'New Password', val: newPwd, set: setNewPwd, show: showNew, setShow: setShowNew, id: 'newPassword', ac: 'new-password' },
            { label: 'Confirm Password', val: confirm, set: setConfirm, show: showConfirm, setShow: setShowConfirm, id: 'confirmPassword', ac: 'new-password' },
          ].map(({ label, val, set, show, setShow, id, ac }) => (
            <div className="form-group" key={id}>
              <label htmlFor={id}>{label}</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Lock size={16} />
                <input type={show ? 'text' : 'password'} id={id} value={val}
                  onChange={e => set(e.target.value)} required autoComplete={ac}
                  placeholder={label === 'Current Password' ? 'Enter current password' : label === 'New Password' ? 'At least 8 characters' : 'Re-enter password'} />
                <button type="button" className="pwd-toggle-btn" tabIndex={-1} onClick={() => setShow(p => !p)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <div className="pwd-strength-wrap">
            <div className="pwd-strength-bar" style={{ width: strength.pct, background: strength.color, transition: 'all 0.3s' }} />
          </div>
          <div className="pwd-strength-label" style={{ color: strength.color }}>{strength.text}</div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-submit"
            style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}>
            <span>{loading ? 'Updating…' : 'Set Password & Continue'}</span>
            <ArrowRight size={16} />
          </button>

          {!isFirstLogin && onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}
              style={{ width: '100%', marginTop: '0.5rem' }}>
              Cancel and Go Back
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
