import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, FileText, Users, Phone, User, ChevronLeft, ChevronRight, Send, Package, Globe, Clock } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';

const AM_SLOTS = [
  '06:00','06:30','07:00','07:30','08:00','08:30',
  '09:00','09:30','10:00','10:30','11:00','11:30',
];
const PM_SLOTS = [
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30',
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

function to12h(time24) {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function BookingModal({ facility, onClose, onBooked }) {
  const { token, user } = useAuth();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState('');
  const [supplies, setSupplies] = useState('');
  const [pocName, setPocName] = useState(user?.name || '');
  const [pocContact, setPocContact] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingBookings, setExistingBookings] = useState([]);

  useEffect(() => {
    if (!selectedDate) { setExistingBookings([]); return; }
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const facId = facility._id || facility.id;
    fetch(`${API_BASE_URL}/bookings/public`, { headers })
      .then(r => r.json())
      .then(d => {
        const list = d.bookings || [];
        setExistingBookings(list.filter(b => {
          const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
          const bFacId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
          return bDate === selectedDate && bFacId === facId && b.status === 'APPROVED';
        }));
      })
      .catch(() => {});
  }, [selectedDate, facility, token]);

  const days = buildDateStrip(anchorDate);

  const timeToMinutes = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

  const isSlotBooked = (slot) => {
    const s = timeToMinutes(slot);
    return existingBookings.some(b => s >= timeToMinutes(b.startTime) && s < timeToMinutes(b.endTime));
  };

  const toggleSlot = (slot) => {
    if (isSlotBooked(slot)) return;
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort());
  };

  const getTimeRange = () => {
    if (!selectedSlots.length) return '';
    const sorted = [...selectedSlots].sort();
    return `${to12h(sorted[0])} – ${to12h(sorted[sorted.length - 1])}`;
  };

  const formatDay = (d) => ({
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    full: d.toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) { setError('Please select a date.'); return; }
    if (!selectedSlots.length) { setError('Please select at least one time slot.'); return; }
    if (!purpose.trim()) { setError('Please enter the purpose.'); return; }
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
          purpose,
          attendeesCount: parseInt(attendees) || 0,
          requirements: supplies,
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

  const SlotGroup = ({ label, slots }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)',
        marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
      }}>
        <Clock size={11} /> {label}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
        gap: '0.35rem',
      }}>
        {slots.map(slot => {
          const booked = isSlotBooked(slot);
          const selected = selectedSlots.includes(slot);
          return (
            <button key={slot} type="button" disabled={booked}
              onClick={() => toggleSlot(slot)}
              style={{
                padding: '0.45rem 0.3rem',
                borderRadius: 10,
                border: selected
                  ? '2px solid var(--primary)'
                  : booked
                  ? '1px dashed #cbd5e1'
                  : '1px solid var(--surface-border)',
                background: selected
                  ? 'var(--primary)'
                  : booked
                  ? '#f1f5f9'
                  : 'white',
                color: selected ? 'white' : booked ? '#94a3b8' : 'var(--text-main)',
                fontWeight: selected ? 800 : 600,
                fontSize: '0.72rem',
                cursor: booked ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                position: 'relative',
              }}
            >
              {to12h(slot)}
              {booked && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.5rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>taken</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>

        {/* Sticky Header */}
        <div className="modal-header" style={{ marginBottom: '1.25rem', flexShrink: 0 }}>
          <div className="modal-badge"><CalendarPlus size={16} /><span>Reservation Request</span></div>
          <h3 style={{ margin: '0.35rem 0 0.15rem' }}>{facility.label || facility.name}</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {facility.location || ''}{facility.capacity ? ` · ${facility.capacity}${facility.capacity !== 'Open Space' ? ' Seats' : ''}` : ''}
          </p>
        </div>

        {/* Scrollable form body */}
        <form className="modal-form" onSubmit={handleSubmit}
          style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>

          {/* ── DATE STRIP ── */}
          <div className="form-group">
            <label>Select Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(d.getDate() - 7); return nd; })}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--surface-border)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <ChevronLeft size={15} />
              </button>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {days.map(d => {
                  const f = formatDay(d);
                  const isSelected = selectedDate === f.full;
                  const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <button key={f.full} type="button" disabled={isPast} onClick={() => setSelectedDate(f.full)}
                      style={{
                        flex: 1, padding: '0.4rem 0.1rem', borderRadius: 10,
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                        background: isSelected ? 'var(--primary)' : isPast ? 'rgba(0,0,0,0.03)' : 'white',
                        color: isSelected ? 'white' : isPast ? 'var(--text-muted)' : 'var(--text-main)',
                        fontWeight: 700, fontSize: '0.65rem', cursor: isPast ? 'not-allowed' : 'pointer',
                        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        transition: 'all 0.15s',
                      }}>
                      <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>{f.day}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800 }}>{f.date}</span>
                      <span style={{ fontSize: '0.55rem', opacity: isSelected ? 0.9 : 0.5 }}>{f.month}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(d.getDate() + 7); return nd; })}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--surface-border)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* ── TIME SLOTS ── */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Select Time Slot(s)</span>
              {selectedSlots.length > 0 && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)',
                  background: 'rgba(37,99,235,0.08)', padding: '0.2rem 0.6rem',
                  borderRadius: 20, display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <Clock size={11} /> {getTimeRange()}
                </span>
              )}
            </label>

            {!selectedDate && (
              <div style={{
                padding: '1rem', borderRadius: 12, background: '#f8fafc',
                border: '1px dashed var(--surface-border)', textAlign: 'center',
                fontSize: '0.8rem', color: 'var(--text-muted)',
              }}>
                👆 Select a date above to view available time slots
              </div>
            )}

            {selectedDate && (
              <div style={{
                background: '#f8fafc', borderRadius: 14, padding: '0.75rem',
                border: '1px solid var(--surface-border)',
              }}>
                <SlotGroup label="Morning (6 AM – 12 PM)" slots={AM_SLOTS} />
                <SlotGroup label="Afternoon & Evening (12 PM – 9 PM)" slots={PM_SLOTS} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} /> Selected
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#f1f5f9', border: '1px dashed #cbd5e1' }} /> Already Booked
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'white', border: '1px solid var(--surface-border)' }} /> Available
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── PURPOSE ── */}
          <div className="form-group">
            <label>Purpose of Booking</label>
            <div className="input-wrapper">
              <FileText size={16} />
              <input type="text" placeholder="e.g., Guest Lecture / Team Workshop"
                value={purpose} onChange={e => setPurpose(e.target.value)} required />
            </div>
          </div>

          {/* ── ATTENDEES ── */}
          <div className="form-group">
            <label>Number of Attendees</label>
            <div className="input-wrapper">
              <Users size={16} />
              <input type="number" placeholder="e.g., 25" min="1"
                value={attendees} onChange={e => setAttendees(e.target.value)} required />
            </div>
          </div>

          {/* ── ADDITIONAL SUPPLIES ── */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Package size={14} /> Additional Supplies Needed
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Projector, 2x collar microphones, whiteboard, extension cord, HDMI adapter…"
              value={supplies}
              onChange={e => setSupplies(e.target.value)}
              style={{
                width: '100%', borderRadius: 12, border: '1.5px solid var(--surface-border)',
                padding: '0.7rem 1rem', fontSize: '0.82rem', fontFamily: 'inherit',
                color: 'var(--text-main)', background: 'white', resize: 'vertical',
                outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                minHeight: 72, lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--surface-border)'}
            />
          </div>

          {/* ── POC ── */}
          <div className="form-row">
            <div className="form-group">
              <label>Point of Contact Name</label>
              <div className="input-wrapper"><User size={16} />
                <input type="text" placeholder="e.g., Dr. Jane Doe"
                  value={pocName} onChange={e => setPocName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>POC Contact Number</label>
              <div className="input-wrapper"><Phone size={16} />
                <input type="tel" placeholder="+91 98765 43210"
                  value={pocContact} onChange={e => setPocContact(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* ── EXTERNAL MEETING TOGGLE ── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              onClick={() => setIsExternal(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', borderRadius: 14,
                border: isExternal ? '1.5px solid var(--primary)' : '1.5px solid var(--surface-border)',
                background: isExternal ? 'rgba(37,99,235,0.06)' : '#f8fafc',
                cursor: 'pointer', transition: 'all 0.2s',
                userSelect: 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Globe size={17} style={{ color: isExternal ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isExternal ? 'var(--primary)' : 'var(--text-main)' }}>External Meeting</div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>Guests from outside the institution are attending</div>
                </div>
              </div>
              {/* Custom toggle switch */}
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: isExternal ? 'var(--primary)' : '#cbd5e1',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: isExternal ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-submit" disabled={submitting}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
            <span>{submitting ? 'Submitting…' : 'Send for Approval'}</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
