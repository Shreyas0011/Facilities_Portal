import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';

export default function CalendarView() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters State
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [viewMode, setViewMode] = useState('month');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const bookingsUrl = isAdmin ? `${API_BASE_URL}/bookings` : `${API_BASE_URL}/bookings/public`;
    Promise.all([
      fetch(bookingsUrl, { headers }).then(r => r.json()).catch(() => ({ bookings: [] })),
      fetch(`${API_BASE_URL}/facilities`, { headers }).then(r => r.json()).catch(() => ({ facilities: [] })),
    ]).then(([bd, fd]) => {
      setBookings(bd.bookings || []);
      setFacilities(fd.facilities || []);
    });
  }, [token, user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Time conversion helper
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Main Filter Handler
  const filterBooking = (b) => {
    // 1. Venue Filter
    if (selectedVenue !== 'all') {
      const bVenueId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
      if (bVenueId !== selectedVenue) return false;
    }

    // 2. Time Filter
    if (selectedTimeFilter !== 'all') {
      const startMins = timeToMinutes(b.startTime || b.time?.split(' – ')[0]);
      const morningStart = timeToMinutes('06:00');
      const noonStart = timeToMinutes('12:00');
      const eveningStart = timeToMinutes('17:00');
      const eveningEnd = timeToMinutes('22:00');

      if (selectedTimeFilter === 'morning') {
        if (startMins < morningStart || startMins >= noonStart) return false;
      } else if (selectedTimeFilter === 'afternoon') {
        if (startMins < noonStart || startMins >= eveningStart) return false;
      } else if (selectedTimeFilter === 'evening') {
        if (startMins < eveningStart || startMins > eveningEnd) return false;
      }
    }

    return true;
  };

  const getBookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => {
      const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
      return bDate === dateStr && (b.status === 'APPROVED' || b.status === 'PENDING') && filterBooking(b);
    });
  };

  const statusColor = { APPROVED: '#10b981', PENDING: '#f59e0b' };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();

  return (
    <div className="custom-calendar">
      {/* Filters Control Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: 16, border: '1px solid var(--surface-border)', backdropFilter: 'blur(10px)' }}>
        {/* View Mode Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>View</label>
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, padding: 2 }}>
            <button className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('month')}>Month</button>
            <button className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('day')}>Day</button>
          </div>
        </div>

        {/* Venue Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Venue / Facility</label>
          <select value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)} style={{ padding: '0.4rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem', height: 34, width: '100%' }}>
            <option value="all">All Venues</option>
            {facilities.map(f => (
              <option key={f._id || f.id} value={f._id || f.id}>{f.label || f.name}</option>
            ))}
          </select>
        </div>

        {/* Time Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 140 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time Slot</label>
          <select value={selectedTimeFilter} onChange={e => setSelectedTimeFilter(e.target.value)} style={{ padding: '0.4rem', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: '0.85rem', height: 34 }}>
            <option value="all">All Day</option>
            <option value="morning">Morning (6 AM - 12 PM)</option>
            <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
            <option value="evening">Evening (5 PM - 10 PM)</option>
          </select>
        </div>
      </div>

      {viewMode === 'day' ? (
        <div className="day-view-container" style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--surface-border)', backdropFilter: 'blur(10px)' }}>
          {/* Day Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => {
                const prev = new Date(year, month, selectedDay - 1);
                setCurrentDate(prev);
                setSelectedDay(prev.getDate());
              }}>‹ Prev Day</button>
            <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
              {new Date(year, month, selectedDay).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h4>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => {
                const next = new Date(year, month, selectedDay + 1);
                setCurrentDate(next);
                setSelectedDay(next.getDate());
              }}>Next Day ›</button>
          </div>

          {/* Bookings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {getBookingsForDay(selectedDay).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                No reservations scheduled for this day matching filters.
              </div>
            ) : (
              getBookingsForDay(selectedDay)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                .map((b, i) => (
                  <div key={b._id || b.id || i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.25rem', background: 'white', border: '1px solid var(--surface-border)',
                    borderRadius: 14, boxShadow: 'var(--surface-shadow)', borderLeft: `4px solid ${statusColor[b.status] || '#64748b'}`
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {b.facilityId?.name || b.facilityName || b.facility}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {b.purpose} {b.userId?.name ? `· Requested by ${b.userId.name}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>
                        {b.startTime || b.time?.split(' – ')[0]} – {b.endTime || b.time?.split(' – ')[1]}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: statusColor[b.status], background: `${statusColor[b.status]}12`, padding: '2px 8px', borderRadius: 50, display: 'inline-block', marginTop: '4px' }}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Month Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹ Prev</button>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{monthName}</h3>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>Next ›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.5rem 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const dayBookings = getBookingsForDay(day);
              return (
                <div key={day}
                  onClick={() => {
                    setSelectedDay(day);
                    setViewMode('day');
                  }}
                  style={{
                    minHeight: 80, padding: '0.4rem', borderRadius: 10, cursor: 'pointer',
                    border: isToday ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                    background: isToday ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = isToday ? 'var(--primary)' : 'var(--surface-border)'; }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--primary)' : 'var(--text-main)', marginBottom: '0.25rem' }}>{day}</div>
                  {dayBookings.slice(0, 3).map((b, i) => (
                    <div key={i} style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white', background: statusColor[b.status] || '#64748b', borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.facilityId?.name || b.facilityName || b.facility}
                    </div>
                  ))}
                  {dayBookings.length > 3 && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>+{dayBookings.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
