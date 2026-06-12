import React, { useState, useEffect, useCallback } from 'react';
import { X, CalendarPlus, FileText, Users, Phone, User, ChevronLeft, ChevronRight, Send, Sliders } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00',
];

function buildDateStrip(anchor) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function BookingModal({ facility, onClose, onBooked }) {
  const { token, user } = useAuth();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState('');
  const [requirements, setRequirements] = useState('');
  const [pocName, setPocName] = useState(user?.name || '');
  const [pocContact, setPocContact] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingBookings, setExistingBookings] = useState([]);

  // Fetch approved bookings for this facility on the selected date
  useEffect(() => {
    if (!selectedDate) {
      setExistingBookings([]);
      return;
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const facId = facility._id || facility.id;
    fetch(`${API_BASE_URL}/bookings/public`, { headers })
      .then(r => r.json())
      .then(d => {
        const list = d.bookings || [];
        const filtered = list.filter(b => {
          const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
          const bFacId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
          return bDate === selectedDate && bFacId === facId && b.status === 'APPROVED';
        });
        setExistingBookings(filtered);
      })
      .catch(() => {});
  }, [selectedDate, facility, token]);

  const days = buildDateStrip(anchorDate);

  const toggleSlot = (slot) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort());
  };

  const getTimeRange = () => {
    if (!selectedSlots.length) return '';
    const sorted = [...selectedSlots].sort();
    return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const isSlotBooked = (slot) => {
    const slotMins = timeToMinutes(slot);
    return existingBookings.some(b => {
      const startMins = timeToMinutes(b.startTime);
      const endMins = timeToMinutes(b.endTime);
      return slotMins >= startMins && slotMins < endMins;
    });
  };

  const formatDay = (d) => ({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.getDate(), full: d.toISOString().split('T')[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) { setError('Please select a date.'); return; }
    if (!selectedSlots.length) { setError('Please select at least one time slot.'); return; }
    if (!purpose) { setError('Please enter the purpose.'); return; }
    setError(''); setSubmitting(true);
    try {
      const sorted = [...selectedSlots].sort();
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          facilityId: facility._id || facility.id,
          facilityName: facility.label || facility.name,
          date: selectedDate,
          startTime: sorted[0],
          endTime: sorted[sorted.length - 1],
          time: getTimeRange(),
          purpose, attendeesCount: parseInt(attendees) || 0, requirements,
          pocName, pocContact, isExternal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      onBooked();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18} /></button>
        <div className="modal-header">
          <div className="modal-badge"><CalendarPlus size={16} /><span>Reservation Request</span></div>
          <h3>{facility.label || facility.name}</h3>
          <p>{facility.capacity} {facility.capacity !== 'Open Space' ? 'Seats' : ''}</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Date strip */}
          <div className="form-group">
            <label>Select Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" className="btn btn-action" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd; })}>
                <ChevronLeft size={16} />
              </button>
              <div className="date-selector" style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 4 }}>
                {days.map(d => {
                  const f = formatDay(d); const isSelected = selectedDate === f.full;
                  const isPast = d < new Date(new Date().setHours(0,0,0,0));
                  return (
                    <button key={f.full} type="button" disabled={isPast}
                      onClick={() => setSelectedDate(f.full)}
                      style={{ flex: 1, padding: '0.4rem 0.2rem', borderRadius: 10, border: isSelected ? '2px solid var(--primary)' : '1px solid var(--surface-border)', background: isSelected ? 'var(--primary)' : isPast ? 'rgba(0,0,0,0.03)' : 'white', color: isSelected ? 'white' : isPast ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: isSelected ? 800 : 600, fontSize: '0.7rem', cursor: isPast ? 'not-allowed' : 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span>{f.day}</span><span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{f.date}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn-action" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd; })}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Time slots */}
          <div className="form-group">
            <label>Select Time Slot(s)</label>
            <div className="time-slots-grid">
              {TIME_SLOTS.map(slot => {
                const booked = isSlotBooked(slot);
                const selected = selectedSlots.includes(slot);
                return (
                  <button key={slot} type="button"
                    disabled={booked}
                    className={`time-slot${selected ? ' selected' : ''}${booked ? ' booked' : ''}`}
                    style={booked ? { background: '#f1f5f9', color: '#94a3b8', border: '1px dashed #cbd5e1', cursor: 'not-allowed' } : {}}
                    onClick={() => toggleSlot(slot)}>{slot}</button>
                );
              })}
            </div>
            {selectedSlots.length > 0 && (
              <div className="time-range-summary" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.4rem' }}>
                ⏰ {getTimeRange()}
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className="form-group">
            <label>Purpose of Booking</label>
            <div className="input-wrapper">
              <FileText size={16} />
              <input type="text" placeholder="e.g., Guest Lecture / Team Workshop" value={purpose} onChange={e => setPurpose(e.target.value)} required />
            </div>
          </div>

          {/* Attendees */}
          <div className="form-group">
            <label>Number of Attendees</label>
            <div className="input-wrapper">
              <Users size={16} />
              <input type="number" placeholder="e.g., 25" min="1" value={attendees} onChange={e => setAttendees(e.target.value)} required />
            </div>
          </div>

          {/* Requirements */}
          <div className="form-group">
            <label>Venue Requirements (Optional)</label>
            <div className="input-wrapper">
              <Sliders size={16} />
              <input type="text" placeholder="e.g., Projector, whiteboard, collar mic" value={requirements} onChange={e => setRequirements(e.target.value)} />
            </div>
          </div>

          {/* POC */}
          <div className="form-row">
            <div className="form-group">
              <label>POC Name</label>
              <div className="input-wrapper"><User size={16} /><input type="text" placeholder="e.g., Dr. Jane Doe" value={pocName} onChange={e => setPocName(e.target.value)} required /></div>
            </div>
            <div className="form-group">
              <label>POC Contact</label>
              <div className="input-wrapper"><Phone size={16} /><input type="tel" placeholder="+91 98765 43210" value={pocContact} onChange={e => setPocContact(e.target.value)} required /></div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>
              <input type="checkbox" checked={isExternal} onChange={e => setIsExternal(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              External Meeting
            </label>
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-submit" disabled={submitting}>
            <span>{submitting ? 'Submitting…' : 'Send for Approval'}</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
