import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, FileText, ChevronLeft, ChevronRight, Send, Package, Globe, Clock, RefreshCw } from 'lucide-react';
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
  '21:00','21:30',
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function ToggleCard({ icon, title, subtitle, value, onChange, color = 'var(--primary)' }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem', borderRadius: 14, cursor: 'pointer',
        border: value ? `1.5px solid ${color}` : '1.5px solid var(--surface-border)',
        background: value ? `${color}0f` : '#f8fafc',
        transition: 'all 0.2s', userSelect: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ color: value ? color : 'var(--text-muted)' }}>{icon}</div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: value ? color : 'var(--text-main)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
      </div>
      {/* Toggle switch */}
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? color : '#cbd5e1',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  );
}

export default function BookingModal({ facility, onClose, onBooked }) {
  const { token, user } = useAuth();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [supplies, setSupplies] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
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
          if (bFacId !== facId || (b.status !== 'APPROVED' && b.status !== 'PENDING')) return false;

          if (b.isRecurring) {
            if (selectedDate < bDate) return false;
            if (b.recurringEndDate) {
              const endYMD = b.recurringEndDate.includes('T') ? b.recurringEndDate.split('T')[0] : b.recurringEndDate;
              if (selectedDate > endYMD) return false;
            }
            if (b.cancelledDates && b.cancelledDates.includes(selectedDate)) return false;

            const [y, m, d] = selectedDate.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const dayOfWeek = dateObj.getUTCDay();
            return Array.isArray(b.recurringDays) && b.recurringDays.includes(dayOfWeek);
          }

          return bDate === selectedDate;
        }));
      })
      .catch(() => {});
  }, [selectedDate, facility, token]);

  const days = buildDateStrip(anchorDate);
  const timeToMinutes = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const getLocalHour = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false
      });
      return parseInt(formatter.format(new Date()), 10);
    } catch {
      return new Date().getHours();
    }
  };
  const isPadmaja = user?.email?.toLowerCase() === 'padmaja@transcendgroup.org';
  const isTimeRestricted = (getLocalHour() >= 20 || getLocalHour() < 6) && !isPadmaja;

  useEffect(() => {
    if (isTimeRestricted) {
      setError('Booking after 8pm is not allowed, please contact Padmaja N in case of any booking, Thank You');
    } else {
      setError('');
    }
  }, [isTimeRestricted]);

  const isSlotBooked = (slot) => {
    const s = timeToMinutes(slot);
    return existingBookings.some(b => s >= timeToMinutes(b.startTime) && s < timeToMinutes(b.endTime));
  };
  const toggleSlot = (slot) => {
    if (isSlotBooked(slot)) return;
    if (isTimeRestricted) return;
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort());
  };
  const toggleRecurringDay = (dayIdx) => {
    setRecurringDays(prev => prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx].sort((a, b) => a - b));
  };
  const getTimeRange = () => {
    if (!selectedSlots.length) return '';
    const sorted = [...selectedSlots].sort();
    return `${to12h(sorted[0])} – ${to12h(sorted[sorted.length - 1])}`;
  };
  const getLocalYYYYMMDD = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayVal = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  const formatDay = (d) => ({
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    full: getLocalYYYYMMDD(d),
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTimeRestricted) {
      setError('Booking after 8pm is not allowed, please contact Padmaja N in case of any booking, Thank You');
      return;
    }
    if (!selectedDate) { setError('Please select a date.'); return; }
    if (!selectedSlots.length) { setError('Please select at least one time slot.'); return; }
    if (purpose.trim().length < 2) { setError('Purpose must be at least 2 characters.'); return; }
    if (isRecurring && recurringDays.length === 0) { setError('Please select at least one day for recurring booking.'); return; }
    if (isRecurring && !recurringEndDate) { setError('Please select an end date for the recurring booking.'); return; }
    setError(''); setSubmitting(true);
    try {
      const sorted = [...selectedSlots].sort();
      // Compute the real end time: last slot's start + 30 minutes
      const lastSlot = sorted[sorted.length - 1];
      const [lh, lm] = lastSlot.split(':').map(Number);
      const endTotalMins = lh * 60 + lm + 30;
      const endHour = String(Math.floor(endTotalMins / 60)).padStart(2, '0');
      const endMin  = String(endTotalMins % 60).padStart(2, '0');
      const computedEndTime = `${endHour}:${endMin}`;
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          facilityId: facility._id || facility.id,
          facilityName: facility.label || facility.name,
          date: selectedDate,
          startTime: sorted[0],
          endTime: computedEndTime,
          time: getTimeRange(),
          purpose,
          requirements: supplies,
          isExternal,
          isRecurring,
          recurringDays: isRecurring ? recurringDays : [],
          recurringEndDate: isRecurring ? recurringEndDate : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Booking failed';
        if (data.details && data.details.length > 0) {
          msg = data.details.map(d => d.message).join(', ');
        }
        throw new Error(msg);
      }
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.35rem' }}>
        {slots.map(slot => {
          const booked = isSlotBooked(slot);
          const selected = selectedSlots.includes(slot);
          const isDisabled = booked || isTimeRestricted;
          return (
            <button key={slot} type="button" disabled={isDisabled} onClick={() => toggleSlot(slot)}
              style={{
                padding: '0.45rem 0.25rem', borderRadius: 10,
                border: selected ? '2px solid var(--primary)' : booked ? '1.5px solid #fca5a5' : isTimeRestricted ? '1.5px solid #cbd5e1' : '1.5px solid #bbf7d0',
                background: selected ? 'var(--primary)' : booked ? '#fef2f2' : isTimeRestricted ? '#f1f5f9' : '#f0fdf4',
                color: selected ? 'white' : booked ? '#dc2626' : isTimeRestricted ? '#64748b' : '#16a34a',
                fontWeight: selected ? 800 : 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer', textAlign: 'center',
                transition: 'all 0.15s ease',
                boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1px',
                minHeight: '44px',
                boxSizing: 'border-box',
              }}>
              <span style={{ fontSize: '0.72rem', display: 'block', lineHeight: 1.1 }}>{to12h(slot)}</span>
              {booked && (
                <span style={{
                  fontSize: '0.5rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1
                }}>taken</span>
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
            <label>Select Start Date</label>
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
            {!selectedDate ? (
              <div style={{
                padding: '1rem', borderRadius: 12, background: '#f8fafc',
                border: '1px dashed var(--surface-border)', textAlign: 'center',
                fontSize: '0.8rem', color: 'var(--text-muted)',
              }}>
                👆 Select a date above to view available time slots
              </div>
            ) : (
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: '0.75rem', border: '1px solid var(--surface-border)' }}>
                <SlotGroup label="Morning (6 AM – 12 PM)" slots={AM_SLOTS} />
                <SlotGroup label="Afternoon & Evening (12 PM – 9 PM)" slots={PM_SLOTS} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} /> Selected
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#fef2f2', border: '1.5px solid #fca5a5' }} /> Already Booked
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#f0fdf4', border: '1.5px solid #bbf7d0' }} /> Available
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



          {/* ── EXTERNAL MEETING TOGGLE ── */}
          <ToggleCard
            icon={<Globe size={17} />}
            title="External Meeting"
            subtitle=""
            value={isExternal}
            onChange={setIsExternal}
          />

          {/* ── RECURRING BOOKING TOGGLE ── */}
          <ToggleCard
            icon={<RefreshCw size={17} />}
            title="Recurring Booking"
            subtitle="Repeat this booking on selected days every week"
            value={isRecurring}
            onChange={setIsRecurring}
            color="#7c3aed"
          />

          {/* Recurring Options (shown only when toggled on) */}
          {isRecurring && (
            <div style={{
              background: '#faf5ff', borderRadius: 14, padding: '1rem',
              border: '1.5px solid #7c3aed30', display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
              {/* Day picker */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Repeat on days
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {WEEK_DAYS.map((day, idx) => {
                    const active = recurringDays.includes(idx);
                    return (
                      <button key={day} type="button" onClick={() => toggleRecurringDay(idx)}
                        style={{
                          width: 40, height: 40, borderRadius: '50%',
                          border: active ? '2px solid #7c3aed' : '1.5px solid var(--surface-border)',
                          background: active ? '#7c3aed' : 'white',
                          color: active ? 'white' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* End date */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Repeat until
                </div>
                <input
                  type="date"
                  value={recurringEndDate}
                  min={selectedDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setRecurringEndDate(e.target.value)}
                  style={{
                    padding: '0.55rem 0.9rem', borderRadius: 10,
                    border: '1.5px solid #7c3aed40', background: 'white',
                    fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
                    color: 'var(--text-main)', width: '100%', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = '#7c3aed40'}
                />
              </div>

              {recurringDays.length > 0 && recurringEndDate && (
                <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <RefreshCw size={11} />
                  Repeats every {recurringDays.map(d => WEEK_DAYS[d]).join(', ')} until {new Date(recurringEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-submit" disabled={submitting}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
            <span>{submitting ? 'Submitting…' : isRecurring ? 'Send Recurring Request' : 'Send for Approval'}</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
