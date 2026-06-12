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
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
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

  // Weekly calculations
  const getSundayOfWeek = (d) => {
    const sunday = new Date(d);
    const day = sunday.getDay();
    const diff = sunday.getDate() - day;
    return new Date(sunday.setDate(diff));
  };

  const getDaysOfWeek = (sun) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sun);
      day.setDate(sun.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const sunday = getSundayOfWeek(currentDate);
  const weekDays = getDaysOfWeek(sunday);

  const getWeekRangeString = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, options)} – ${end.toLocaleDateString(undefined, options)}, ${start.getFullYear()}`;
  };

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

  const getBookingsForDateObj = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return bookings.filter(b => {
      const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
      return bDate === dateStr && (b.status === 'APPROVED' || b.status === 'PENDING') && filterBooking(b);
    });
  };

  const statusColor = { APPROVED: '#10b981', PENDING: '#f59e0b' };
  const recurringColor = '#7c3aed'; // Purple for recurring bookings
  const getEventColor = (b) => b.isRecurring ? recurringColor : (statusColor[b.status] || '#64748b');

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
            <button className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('week')}>Week</button>
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

      {/* Unified Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
          onClick={() => {
            if (viewMode === 'month') {
              setCurrentDate(new Date(year, month - 1, 1));
            } else if (viewMode === 'week') {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - 7);
              setCurrentDate(d);
            } else {
              const prev = new Date(year, month, selectedDay - 1);
              setCurrentDate(prev);
              setSelectedDay(prev.getDate());
            }
          }}>‹ Prev</button>
        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
          {viewMode === 'month' && monthName}
          {viewMode === 'week' && getWeekRangeString()}
          {viewMode === 'day' && new Date(year, month, selectedDay).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
          onClick={() => {
            if (viewMode === 'month') {
              setCurrentDate(new Date(year, month + 1, 1));
            } else if (viewMode === 'week') {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + 7);
              setCurrentDate(d);
            } else {
              const next = new Date(year, month, selectedDay + 1);
              setCurrentDate(next);
              setSelectedDay(next.getDate());
            }
          }}>Next ›</button>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="day-view-container" style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--surface-border)', backdropFilter: 'blur(10px)' }}>
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
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '1rem 1.25rem', background: b.isRecurring ? '#faf5ff' : 'white',
                    border: `1px solid ${b.isRecurring ? '#7c3aed30' : 'var(--surface-border)'}`,
                    borderRadius: 14, boxShadow: 'var(--surface-shadow)',
                    borderLeft: `4px solid ${getEventColor(b)}`
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {b.isRecurring && <span title="Recurring booking" style={{ fontSize: '0.85rem' }}>🔁</span>}
                        {b.facilityId?.name || b.facilityName || b.facility}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {b.purpose} {b.userId?.name ? `· Requested by ${b.userId.name}` : ''}
                      </div>
                      {b.isRecurring && b.recurringDays && b.recurringDays.length > 0 && (
                        <div style={{ fontSize: '0.68rem', color: recurringColor, fontWeight: 600, marginTop: '3px' }}>
                          Repeats: {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => b.recurringDays.includes(i)).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: getEventColor(b), display: 'block' }}>
                        {b.startTime || b.time?.split(' – ')[0]} – {b.endTime || b.time?.split(' – ')[1]}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: getEventColor(b), background: `${getEventColor(b)}12`, padding: '2px 8px', borderRadius: 50, display: 'inline-block', marginTop: '4px' }}>
                        {b.isRecurring ? 'RECURRING' : b.status}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {weekDays.map((dateObj, idx) => {
            const isToday = today.getDate() === dateObj.getDate() && today.getMonth() === dateObj.getMonth() && today.getFullYear() === dateObj.getFullYear();
            const dayBookings = getBookingsForDateObj(dateObj);
            
            return (
              <div key={idx}
                onClick={() => {
                  setCurrentDate(dateObj);
                  setSelectedDay(dateObj.getDate());
                  setViewMode('day');
                }}
                style={{
                  minHeight: 250, padding: '0.6rem', borderRadius: 12, cursor: 'pointer',
                  border: isToday ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                  background: isToday ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = isToday ? 'var(--primary)' : 'var(--surface-border)'; }}
              >
                <div style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>
                    {dateObj.getDate()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1, overflowY: 'auto' }}>
                  {dayBookings.length === 0 ? (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No events</div>
                  ) : (
                    dayBookings.map((b, i) => (
                        <div key={i} style={{ 
                          fontSize: '0.65rem', padding: '4px 6px', borderRadius: 6, color: 'white', 
                          background: getEventColor(b), fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          borderLeft: b.isRecurring ? '3px solid rgba(255,255,255,0.5)' : 'none',
                        }}>
                          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 2 }}>
                            {b.isRecurring && <span style={{ fontSize: '0.6rem' }}>🔁</span>}
                            {b.startTime || b.time?.split(' – ')[0]}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.facilityId?.name || b.facilityName || b.facility}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <>
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
                    <div key={i} style={{
                      fontSize: '0.6rem', fontWeight: 600, color: 'white',
                      background: getEventColor(b),
                      borderRadius: 4, padding: '1px 4px', marginBottom: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 2,
                      borderLeft: b.isRecurring ? '3px solid rgba(255,255,255,0.4)' : 'none',
                    }}>
                      {b.isRecurring && <span style={{ fontSize: '0.55rem', flexShrink: 0 }}>🔁</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.facilityId?.name || b.facilityName || b.facility}</span>
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
