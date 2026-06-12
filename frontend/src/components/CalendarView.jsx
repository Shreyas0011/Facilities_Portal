import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';

export default function CalendarView() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch(`${API_BASE_URL}/bookings`, { headers }).then(r => r.json()).catch(() => ({ bookings: [] })),
      fetch(`${API_BASE_URL}/facilities`, { headers }).then(r => r.json()).catch(() => ({ facilities: [] })),
    ]).then(([bd, fd]) => {
      setBookings(bd.bookings || []);
      setFacilities(fd.facilities || []);
    });
  }, [token]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getBookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.date === dateStr && (b.status === 'APPROVED' || b.status === 'PENDING'));
  };

  const statusColor = { APPROVED: '#10b981', PENDING: '#f59e0b' };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();

  return (
    <div className="custom-calendar">
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
            <div key={day} style={{
              minHeight: 80, padding: '0.4rem', borderRadius: 10,
              border: isToday ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
              background: isToday ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.6)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--primary)' : 'var(--text-main)', marginBottom: '0.25rem' }}>{day}</div>
              {dayBookings.slice(0, 3).map((b, i) => (
                <div key={i} style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white', background: statusColor[b.status] || '#64748b', borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.facilityName || b.facility}
                </div>
              ))}
              {dayBookings.length > 3 && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>+{dayBookings.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
