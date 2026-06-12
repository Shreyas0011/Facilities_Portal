import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Layers, Calendar, Database, BarChart3, Lock, CheckCircle2, XCircle, Clock4, Users, Building, UserPlus, PlusCircle, Settings, Globe, RefreshCw, FileText, Package, Clock, User, Mail } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/CalendarView';

function formatDate(d) {
  if (!d) return '';
  const dateOnlyStr = d.includes('T') ? d.split('T')[0] : d;
  const parsed = new Date(dateOnlyStr + 'T00:00:00');
  if (isNaN(parsed.getTime())) {
    const fallback = new Date(d);
    if (isNaN(fallback.getTime())) return d;
    return fallback.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Queue Page ────────────────────────────────────────────────────────────────
function QueuePage() {
  const { token, user } = useAuth();
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);

  const load = useCallback(() => {
    fetch(`${API_BASE_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const bks = d.bookings || [];
        setPending(bks.filter(b => b.status === 'PENDING'));
        setAll(bks);
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener('reloadBookings', load);
    return () => window.removeEventListener('reloadBookings', load);
  }, [load]);

  const act = async (id, action, reason = '') => {
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await fetch(`${API_BASE_URL}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, remarks: reason }),
    });
    load();
  };

  const BookingRow = ({ b, showActions, onView }) => {
    const requesterName = b.userId?.name || b.requesterName || b.requester || 'Unknown';
    const requesterEmail = b.userId?.email || b.requesterEmail || '';
    const facilityName = b.facilityId?.name || b.facilityName || b.facility || 'Unknown';
    const attendeesCount = b.attendeesCount || b.attendees || 0;

    return (
      <tr>
        <td>
          <div style={{ fontWeight: 700 }}>{requesterName}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{requesterEmail}</div>
        </td>
        <td>{facilityName}</td>
        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</td>
        <td>
          <div>{formatDate(b.date)}</div>m
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{b.time || `${b.startTime} – ${b.endTime}`}</div>
        </td>
        {showActions ? (
          <td>{attendeesCount}</td>
        ) : (
          <td>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className={`feed-status ${(b.status || '').toLowerCase()}`}>{b.status}</span>
              {b.approval && (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {b.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {b.approval.approvedById?.name || 'Admin'}
                  {b.approval.remarks ? ` (${b.approval.remarks})` : ''}
                </span>
              )}
            </div>
          </td>
        )}
        <td>
          {showActions ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }} onClick={() => act(b._id || b.id, 'approve')}>Approve</button>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => {
                const r = prompt('Reason for rejection (mandatory):');
                if (r === null) return;
                if (!r.trim()) { alert('Rejection reason is mandatory.'); return; }
                act(b._id || b.id, 'reject', r.trim());
              }}>Reject</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }} onClick={() => onView(b)}>View</button>
              {b.status === 'APPROVED' && (
                <button className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => {
                  const r = prompt('Reason for rejecting/revoking booking (mandatory):');
                  if (r === null) return;
                  if (!r.trim()) { alert('Rejection reason is mandatory.'); return; }
                  act(b._id || b.id, 'reject', r.trim());
                }}>Reject</button>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  const [detailBooking, setDetailBooking] = useState(null);

  const Table = ({ rows, showActions, emptyMsg }) => (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead><tr>
          <th>Requester</th><th>Facility</th><th>Purpose</th><th>Date & Time</th>
          <th>{showActions ? 'Attendees' : 'Status'}</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>{emptyMsg}</td></tr>
            : rows.map(b => <BookingRow key={b._id || b.id} b={b} showActions={showActions} onView={setDetailBooking} />)
          }
        </tbody>
      </table>
      {detailBooking && createPortal(
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && setDetailBooking(null)}>
          <div className="modal animate-scale-in" style={{ maxWidth: 520, borderRadius: 20, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Top status bar indicator */}
            <div style={{
              height: 6,
              background: detailBooking.status === 'APPROVED' ? '#10b981' : detailBooking.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
            }} />

            <button className="modal-close" onClick={() => setDetailBooking(null)} style={{ top: 16, right: 16 }}>✕</button>

            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className={`feed-status ${(detailBooking.status || '').toLowerCase()}`} style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 20 }}>
                  {detailBooking.status}
                </span>
                {detailBooking.isRecurring && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', background: '#faf5ff', padding: '0.2rem 0.6rem', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <RefreshCw size={10} /> RECURRING
                  </span>
                )}
              </div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {detailBooking.facilityId?.name || detailBooking.facilityName || detailBooking.facility}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {detailBooking.facilityId?.location || 'Campus Facility'}
              </p>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <User size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Requester</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{detailBooking.userId?.name || detailBooking.requesterName || detailBooking.requester || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Email</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={detailBooking.userId?.email || detailBooking.requesterEmail}>
                      {detailBooking.userId?.email || detailBooking.requesterEmail || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Date</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDate(detailBooking.date)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Clock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Time Slot</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {detailBooking.time || `${detailBooking.startTime} – ${detailBooking.endTime}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurring schedule card */}
              {detailBooking.isRecurring && detailBooking.recurringDays && detailBooking.recurringDays.length > 0 && (
                <div style={{
                  background: '#faf5ff', borderRadius: 12, padding: '0.75rem 1rem',
                  border: '1px solid #7c3aed20', display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                  <RefreshCw size={16} style={{ color: '#7c3aed' }} />
                  <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
                    Repeats every {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].filter((_, i) => detailBooking.recurringDays.includes(i)).join(', ')}
                    {detailBooking.recurringEndDate && ` until ${formatDate(detailBooking.recurringEndDate)}`}
                  </div>
                </div>
              )}

              {/* External meeting alert card */}
              {detailBooking.isExternal && (
                <div style={{
                  background: 'rgba(37,99,235,0.06)', borderRadius: 12, padding: '0.75rem 1rem',
                  border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                  <Globe size={16} style={{ color: 'var(--primary)' }} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                    External Meeting (Guests from outside the institution are attending)
                  </div>
                </div>
              )}

              {/* Purpose Block */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  <FileText size={12} /> Purpose of Booking
                </div>
                <div style={{
                  background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 12,
                  border: '1px solid var(--surface-border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)',
                  lineHeight: 1.5,
                }}>
                  {detailBooking.purpose}
                </div>
              </div>

              {/* Supplies Block */}
              {detailBooking.requirements && detailBooking.requirements.trim() && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    <Package size={12} /> Additional Supplies Needed
                  </div>
                  <div style={{
                    background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 12,
                    border: '1px solid var(--surface-border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)',
                    lineHeight: 1.5,
                  }}>
                    {detailBooking.requirements}
                  </div>
                </div>
              )}

              {/* Action/Approval Logs */}
              {detailBooking.approval && (
                <div style={{
                  marginTop: '0.5rem',
                  borderTop: '1px dashed var(--surface-border)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Approval Log
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {detailBooking.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {detailBooking.approval.approvedById?.name || 'Admin'} ({detailBooking.approval.approvedById?.role || 'admin'})
                  </div>
                  {detailBooking.approval.remarks && (
                    <div style={{
                      background: detailBooking.status === 'APPROVED' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${detailBooking.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                      padding: '0.6rem 0.8rem',
                      borderRadius: 10,
                      fontSize: '0.78rem',
                      color: detailBooking.status === 'APPROVED' ? '#059669' : '#dc2626',
                      fontWeight: 600,
                      lineHeight: 1.4,
                    }}>
                      Remarks: "{detailBooking.approval.remarks}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer / Close Area */}
            <div style={{
              background: '#f8fafc',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button className="btn btn-secondary" onClick={() => setDetailBooking(null)} style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem' }}>
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <>
      <header className="hero">
        <div className="hero-badge animate-fade"><Shield size={16} /><span>Admin Control Center</span></div>
        <h1 className="animate-slide-up">Booking Approval Queue</h1>
        <p className="animate-slide-up delay-1">Review incoming facility reservation requests and approve or reject them.</p>
      </header>
      <div className="content-container animate-fade delay-2">
        <div className="admin-panel">
          <div className="panel-header"><div className="panel-badge pending"><Layers size={14} /> Pending Decisions</div><h3>Approval Queue</h3></div>
          <Table rows={pending} showActions emptyMsg="No pending requests." />
        </div>
        <div className="admin-panel" style={{ marginTop: '2rem' }}>
          <div className="panel-header"><div className="panel-badge total"><Layers size={14} /> All Requests</div><h3>Booking History</h3></div>
          <Table rows={all} showActions={false} emptyMsg="No bookings yet." />
        </div>
      </div>
    </>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const bks = d.bookings || [];
        setBookings(bks);
        setStats({
          pending: bks.filter(b => b.status === 'PENDING').length,
          approved: bks.filter(b => b.status === 'APPROVED').length,
          rejected: bks.filter(b => b.status === 'REJECTED').length,
        });
      });
  }, [token]);

  const upcoming = bookings.filter(b => b.status === 'APPROVED' && new Date(b.date) >= new Date()).slice(0, 5);
  const facilityCount = {};
  bookings.forEach(b => { const k = b.facilityName || b.facility; if (k) facilityCount[k] = (facilityCount[k] || 0) + 1; });
  const leaderboard = Object.entries(facilityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <header className="hero">
        <div className="hero-badge animate-fade"><BarChart3 size={16} /><span>Portal Analytics</span></div>
        <h1 className="animate-slide-up">System Dashboard</h1>
        <p className="animate-slide-up delay-1">Detailed statistics on facility utilization and reservation trends.</p>
      </header>
      <div className="content-container animate-fade delay-2">
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Pending', val: stats.pending, icon: <Clock4 size={20} />, cls: 'pending' },
            { label: 'Approved', val: stats.approved, icon: <CheckCircle2 size={20} />, cls: 'approved' },
            { label: 'Rejected', val: stats.rejected, icon: <XCircle size={20} />, cls: 'danger' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-details"><span className="stat-label">{s.label}</span><span className="stat-val">{s.val}</span></div>
            </div>
          ))}
        </div>

        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '2rem' }}>
          <div className="admin-panel">
            <div className="panel-header"><div className="panel-badge approved"><BarChart3 size={14} /> Leaderboard</div><h3>Most Booked Facilities</h3></div>
            <div className="leaderboard">
              {leaderboard.length === 0
                ? <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No data yet.</p>
                : leaderboard.map(([name, count], i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: 20 }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{count} bookings</span>
                  </div>
                ))
              }
            </div>
          </div>
          <div className="admin-panel">
            <div className="panel-header"><div className="panel-badge total"><Calendar size={14} /> Upcoming</div><h3>Upcoming Bookings</h3></div>
            <div className="upcoming-list">
              {upcoming.length === 0
                ? <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No upcoming bookings.</p>
                : upcoming.map(b => (
                  <div key={b._id || b.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                    <div style={{ fontWeight: 700 }}>{b.facilityName || b.facility}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(b.date)} · {b.time || `${b.startTime} – ${b.endTime}`}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.requesterName || b.requester}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Manage Page ───────────────────────────────────────────────────────────────
function ManagePage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'faculty', password: 'Transcend@2026' });
  const [newVenue, setNewVenue] = useState({ name: '', capacity: '', category: 'academic', icon: 'building', description: '' });
  const [userError, setUserError] = useState('');

  const loadUsers = () => fetch(`${API_BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setUsers(d.users || []));
  const loadVenues = () => fetch(`${API_BASE_URL}/facilities`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setVenues(d.facilities || []));

  useEffect(() => { loadUsers(); loadVenues(); }, [token]);

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
  };

  const createUser = async () => {
    setUserError('');
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newUser),
    });
    const d = await res.json();
    if (!res.ok) { setUserError(d.error || 'Failed to create user'); return; }
    setShowAddUser(false); setNewUser({ name: '', email: '', role: 'faculty', password: 'Transcend@2026' });
    loadUsers();
  };

  const createVenue = async () => {
    const res = await fetch(`${API_BASE_URL}/facilities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newVenue, label: newVenue.name }),
    });
    if (res.ok) { setShowAddVenue(false); setNewVenue({ name: '', capacity: '', category: 'academic', icon: 'building', description: '' }); loadVenues(); }
  };

  const deleteVenue = async (id) => {
    if (!confirm('Delete this venue?')) return;
    await fetch(`${API_BASE_URL}/facilities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadVenues();
  };

  const roleColors = { superadmin: '#8b5cf6', admin: '#2563eb', faculty: '#059669', viewer: '#64748b' };

  return (
    <>
      <header className="hero">
        <div className="hero-badge animate-fade"><Database size={16} /><span>Portal Administration</span></div>
        <h1 className="animate-slide-up">Manage Users & Venues</h1>
        <p className="animate-slide-up delay-1">Add or remove campus facilities and manage faculty user records.</p>
      </header>
      <div className="content-container animate-fade delay-2">
        <div className="admin-grid" style={{ gridTemplateColumns: '1fr 1.1fr', gap: '2rem' }}>
          {/* Users */}
          <div className="admin-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div className="panel-badge total"><Users size={14} /> Faculty Registry</div><h3>Registered Users</h3></div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowAddUser(p => !p)}>
                <UserPlus size={14} /> Add User
              </button>
            </div>
            {showAddUser && (
              <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px dashed var(--surface-border)', borderRadius: 16, background: 'rgba(255,255,255,0.4)' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Pre-Create New User</h4>
                {userError && <div className="auth-error" style={{ marginBottom: '0.75rem' }}>{userError}</div>}
                {[['Full Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'text']].map(([lbl, key, type]) => (
                  <div className="form-group" key={key}>
                    <label style={{ fontSize: '0.68rem' }}>{lbl}</label>
                    <input type={type} value={newUser[key]} onChange={e => setNewUser(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem' }} />
                  </div>
                ))}
                <div className="form-group">
                  <label style={{ fontSize: '0.68rem' }}>Role</label>
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem', height: 36 }}>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={createUser}>Create User</button>
                </div>
              </div>
            )}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead><tr><th>Name / Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id || u.id}>
                      <td><div style={{ fontWeight: 700 }}>{u.name}</div><div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{u.email}</div></td>
                      <td><span style={{ fontSize: '0.72rem', fontWeight: 700, color: roleColors[u.role] || '#64748b', textTransform: 'uppercase' }}>{u.role}</span></td>
                      <td><span style={{ fontSize: '0.72rem', fontWeight: 700, color: u.isActive ? '#10b981' : '#ef4444' }}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td><button className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => deleteUser(u._id || u.id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Venues */}
          <div className="admin-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div className="panel-badge total" style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--primary)' }}><Building size={14} /> Venue Inventory</div><h3>Campus Facilities</h3></div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowAddVenue(p => !p)}>
                <PlusCircle size={14} /> Add Venue
              </button>
            </div>
            {showAddVenue && (
              <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px dashed var(--surface-border)', borderRadius: 16, background: 'rgba(255,255,255,0.4)' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Create New Venue</h4>
                {[['Venue Name', 'name'], ['Capacity', 'capacity'], ['Icon (lucide)', 'icon']].map(([lbl, key]) => (
                  <div className="form-group" key={key}>
                    <label style={{ fontSize: '0.68rem' }}>{lbl}</label>
                    <input type="text" value={newVenue[key]} onChange={e => setNewVenue(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem' }} />
                  </div>
                ))}
                <div className="form-group">
                  <label style={{ fontSize: '0.68rem' }}>Category</label>
                  <select value={newVenue.category} onChange={e => setNewVenue(p => ({ ...p, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem', height: 36 }}>
                    <option value="academic">Academic & Labs</option>
                    <option value="media">Performance & Media</option>
                    <option value="recreation">Recreation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.68rem' }}>Description</label>
                  <textarea value={newVenue.description} onChange={e => setNewVenue(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', minHeight: 60, padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowAddVenue(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={createVenue}>Save Venue</button>
                </div>
              </div>
            )}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Details</th><th>Action</th></tr></thead>
                <tbody>
                  {venues.map((v, i) => (
                    <tr key={v._id || v.id}>
                      <td><div style={{ fontWeight: 700 }}>#{i + 1} {v.label || v.name}</div></td>
                      <td><div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{v.category} · {v.capacity} seats</div></td>
                      <td><button className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => deleteVenue(v._id || v.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPortal({ activePage = 'queue', onChangePassword }) {
  const { token, user } = useAuth();
  const [activePopupBooking, setActivePopupBooking] = useState(null);
  const [seenBookings, setSeenBookings] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setSeenBookings([]);
  }, [token]);

  // Poll for new pending bookings
  useEffect(() => {
    if (!token) return;

    const poll = () => {
      fetch(`${API_BASE_URL}/bookings?status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => {
          const bookings = d.bookings || [];
          if (bookings.length > 0) {
            // Find first pending booking that we haven't seen yet and isn't currently populating the popup
            const unseen = bookings.find(b => !seenBookings.includes(b._id || b.id));
            if (unseen && (!activePopupBooking || (activePopupBooking.id !== unseen.id && activePopupBooking._id !== unseen._id))) {
              setActivePopupBooking(unseen);
            }
          }
        })
        .catch(err => console.error('Error polling bookings:', err));
    };

    // Run immediately and poll every 8 seconds
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [token, seenBookings, activePopupBooking]);

  const markSeen = (id) => {
    setSeenBookings(prev => [...prev, id]);
  };

  const handlePopupAct = async (action) => {
    if (!activePopupBooking) return;
    const id = activePopupBooking._id || activePopupBooking.id;

    if (action === 'reject' && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    setIsProcessing(true);
    try {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const res = await fetch(`${API_BASE_URL}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, remarks: action === 'reject' ? rejectReason : '' })
      });
      if (res.ok) {
        markSeen(id);
        setActivePopupBooking(null);
        setShowRejectInput(false);
        setRejectReason('');
        // Notify other pages to reload bookings
        window.dispatchEvent(new CustomEvent('reloadBookings'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const closePopup = () => {
    if (activePopupBooking) {
      markSeen(activePopupBooking._id || activePopupBooking.id);
    }
    setActivePopupBooking(null);
    setShowRejectInput(false);
    setRejectReason('');
  };

  const popupRequester = activePopupBooking?.userId?.name || activePopupBooking?.requesterName || activePopupBooking?.requester || 'Unknown';
  const popupFacility = activePopupBooking?.facilityId?.name || activePopupBooking?.facilityName || activePopupBooking?.facility || 'Unknown';

  return (
    <div id="adminPortal">
      {activePage === 'queue' && <QueuePage />}
      {activePage === 'dashboard' && <DashboardPage />}
      {activePage === 'calendar' && (
        <>
          <header className="hero">
            <div className="hero-badge animate-fade"><Calendar size={16} /><span>Admin Control Center</span></div>
            <h1 className="animate-slide-up">Master Schedule</h1>
            <p className="animate-slide-up delay-1">Day-by-day feed of all campus facility bookings.</p>
          </header>
          <div className="content-container animate-fade delay-2"><CalendarView /></div>
        </>
      )}
      {activePage === 'manage' && user?.role === 'superadmin' && <ManagePage />}
      {activePage === 'settings' && (
        <>
          <header className="hero">
            <div className="hero-badge animate-fade"><Settings size={16} /><span>System Preferences</span></div>
            <h1 className="animate-slide-up">Settings</h1>
            <p className="animate-slide-up delay-1">Manage your administrator account security settings.</p>
          </header>
          <div className="content-container animate-fade delay-2">
            <div className="settings-card card" style={{ maxWidth: 600, margin: '0 auto' }}>
              <div className="card-body">
                <h3 className="card-title">Security & Password</h3>
                <p className="card-desc">Update your administrator account password to keep management actions secure.</p>
                <button className="btn btn-primary" type="button" onClick={onChangePassword}><Lock size={16} /><span>Change Password</span></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Real-time New Booking Request Notification Popup Modal */}
      {activePopupBooking && (
        <div className="modal-overlay active" style={{ zIndex: 9999 }}>
          <div className="modal animate-scale-in" style={{ maxWidth: 480, borderRadius: 20, padding: 0, overflow: 'hidden', border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

            {/* Pulsing indicator banner */}
            <div style={{
              height: 6,
              background: 'var(--primary)',
              animation: 'pulse 2s infinite'
            }} />

            <button className="modal-close" onClick={closePopup} style={{ top: 16, right: 16 }}>✕</button>

            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{
                  background: 'var(--primary)', color: 'white', fontSize: '0.68rem', fontWeight: 800,
                  padding: '0.2rem 0.6rem', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5
                }}>
                  <span style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  NEW BOOKING REQUEST
                </span>
                {activePopupBooking.isRecurring && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', background: '#faf5ff', padding: '0.2rem 0.6rem', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <RefreshCw size={10} /> RECURRING
                  </span>
                )}
              </div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {popupFacility}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Requested by <strong style={{ color: 'var(--text-main)' }}>{popupRequester}</strong>
              </p>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Date</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDate(activePopupBooking.date)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Clock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Time Slot</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {activePopupBooking.time || `${activePopupBooking.startTime} – ${activePopupBooking.endTime}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurring schedule card */}
              {activePopupBooking.isRecurring && activePopupBooking.recurringDays && activePopupBooking.recurringDays.length > 0 && (
                <div style={{
                  background: '#faf5ff', borderRadius: 12, padding: '0.75rem 1rem',
                  border: '1px solid #7c3aed20', display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                  <RefreshCw size={16} style={{ color: '#7c3aed' }} />
                  <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
                    Repeats every {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].filter((_, i) => activePopupBooking.recurringDays.includes(i)).join(', ')}
                    {activePopupBooking.recurringEndDate && ` until ${formatDate(activePopupBooking.recurringEndDate)}`}
                  </div>
                </div>
              )}

              {/* External meeting alert card */}
              {activePopupBooking.isExternal && (
                <div style={{
                  background: 'rgba(37,99,235,0.06)', borderRadius: 12, padding: '0.75rem 1rem',
                  border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                  <Globe size={16} style={{ color: 'var(--primary)' }} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                    External Meeting (Guests from outside the institution are attending)
                  </div>
                </div>
              )}

              {/* Purpose Block */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  <FileText size={12} /> Purpose of Booking
                </div>
                <div style={{
                  background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 12,
                  border: '1px solid var(--surface-border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)',
                  lineHeight: 1.5,
                }}>
                  {activePopupBooking.purpose}
                </div>
              </div>

              {/* Supplies Block */}
              {activePopupBooking.requirements && activePopupBooking.requirements.trim() && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    <Package size={12} /> Supplies Requested
                  </div>
                  <div style={{
                    background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 12,
                    border: '1px solid var(--surface-border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)',
                    lineHeight: 1.5,
                  }}>
                    {activePopupBooking.requirements}
                  </div>
                </div>
              )}

              {/* Rejection input box */}
              {showRejectInput && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--surface-border)', paddingTop: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Rejection Reason (Mandatory)
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Enter why this booking is being rejected..."
                    style={{
                      width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ef444450',
                      borderRadius: 10, fontSize: '0.85rem', background: 'rgba(239,68,68,0.02)',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{
              background: '#f8fafc',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
            }}>
              {showRejectInput ? (
                <>
                  <button className="btn btn-secondary" disabled={isProcessing} onClick={() => { setShowRejectInput(false); setRejectReason(''); }} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                    Cancel
                  </button>
                  <button className="btn btn-outline" disabled={isProcessing || !rejectReason.trim()} onClick={() => handlePopupAct('reject')} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}>
                    Submit Rejection
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline" disabled={isProcessing} onClick={() => handlePopupAct('reject')} style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}>
                    Reject
                  </button>
                  <button className="btn btn-primary" disabled={isProcessing} onClick={() => handlePopupAct('approve')} style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', background: '#10b981', borderColor: '#10b981' }}>
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
