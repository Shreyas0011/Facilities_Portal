import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, History, Bookmark, Settings, Search, X, Users, MapPin, ChevronRight, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/CalendarView';
import BookingModal from '../components/BookingModal';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const dateOnlyStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parsed = new Date(dateOnlyStr + 'T00:00:00');
  if (isNaN(parsed.getTime())) {
    const fallback = new Date(dateStr);
    if (isNaN(fallback.getTime())) return dateStr;
    return fallback.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) + ' at ' + date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

export function AmenitiesPage({ onChangePassword }) {
  const { user, token } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);

  const loadData = useCallback(() => {
    fetch(`${API_BASE_URL}/facilities`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setFacilities(d.facilities || []));
    fetch(`${API_BASE_URL}/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBookings(d.bookings || []));
    fetch(`${API_BASE_URL}/bookings/public`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setAllBookings(d.bookings || []));
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const isFacilityBookedOutToday = (facility) => {
    const facilityId = facility._id || facility.id;
    const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
    
    const todayBookings = allBookings.filter(b => {
      const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
      const bFacilityId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
      if (bFacilityId !== facilityId || b.status !== 'APPROVED') return false;

      if (b.isRecurring) {
        if (todayStr < bDate) return false;
        if (b.recurringEndDate) {
          const endYMD = b.recurringEndDate.includes('T') ? b.recurringEndDate.split('T')[0] : b.recurringEndDate;
          if (todayStr > endYMD) return false;
        }
        if (b.cancelledDates && b.cancelledDates.includes(todayStr)) return false;

        const [y, m, d] = todayStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.getDay();
        return Array.isArray(b.recurringDays) && b.recurringDays.includes(dayOfWeek);
      }

      return bDate === todayStr;
    });

    if (todayBookings.length === 0) return false;

    // Calculate total operating hours
    const startMins = timeToMinutes(facility.availabilityStart || '08:00');
    const endMins = timeToMinutes(facility.availabilityEnd || '17:00');
    const totalOperatingMins = endMins > startMins ? (endMins - startMins) : 540;

    // Calculate booked hours (merge overlapping bookings)
    const intervals = todayBookings.map(b => [
      timeToMinutes(b.startTime || '08:00'),
      timeToMinutes(b.endTime || '17:00')
    ]).sort((a, b) => a[0] - b[0]);

    let mergedIntervals = [];
    if (intervals.length > 0) {
      let current = intervals[0];
      for (let i = 1; i < intervals.length; i++) {
        const next = intervals[i];
        if (next[0] <= current[1]) {
          current[1] = Math.max(current[1], next[1]);
        } else {
          mergedIntervals.push(current);
          current = next;
        }
      }
      mergedIntervals.push(current);
    }

    const bookedMins = mergedIntervals.reduce((sum, interval) => sum + (interval[1] - interval[0]), 0);

    // Booked out if booked minutes cover at least 95% of operating hours
    return bookedMins >= (totalOperatingMins * 0.95);
  };

  const filtered = search
    ? facilities.filter(f => [f.label || f.name, f.desc || f.description, f.category, f.capacity]
        .some(v => v != null && String(v).toLowerCase().includes(search.toLowerCase())))
    : facilities;

  const recent = bookings.slice(-4).reverse();

  return (
    <>
      <div className="hero-split-wrapper">
        <div className="hero-img-panel" />
        <header className="hero hero-center">
          <div className="hero-badge animate-fade">
            <Sparkles size={16} /><span>Faculty Space Reservation Hub</span>
          </div>
          <h1 className="animate-slide-up">Reserve Academic Spaces</h1>
          <p className="animate-slide-up delay-1">Select a facility, pick a date and time slot, and send your booking for admin approval.</p>
        </header>
        <div className="hero-img-panel" />
      </div>

      <div className="content-container animate-fade delay-2">
        <div className="search-container animate-fade delay-1">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search by name, category, capacity..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="clear-search-btn" type="button" onClick={() => setSearch('')}><X size={16} /></button>}
          </div>
        </div>

        <div className="facilities-grid">
          {filtered.length === 0
            ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No facilities found{search ? ` matching "${search}"` : ''}.</div>
            : filtered.map((f, i) => {
              const isBookedOut = isFacilityBookedOutToday(f);
              return (
                <div key={f._id || f.id} className="card animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="card-image" style={f.image ? { backgroundImage: `url('${f.image}')`, backgroundSize: 'cover', backgroundPosition: 'center', height: 160 } : { height: 160 }}>
                    <div className={`status-badge ${!isBookedOut ? 'available' : 'reserved'}`}>
                      <div className={`status-dot ${!isBookedOut ? 'available' : 'reserved'}`} />
                      {!isBookedOut ? 'Available' : 'Reserved'}
                    </div>
                    {!f.image && <div className="card-icon"><ChevronRight size={32} /></div>}
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{f.label || f.name}</h3>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} style={{ color: 'var(--primary)' }} />{f.location || 'Main Campus'}
                    </div>
                    <p className="card-desc">{f.desc || f.description}</p>
                    <div className="card-footer">
                      <div className="capacity"><Users size={14} />{f.capacity === 'Open Space' ? f.capacity : `${f.capacity} Seats`}</div>
                      <button className="btn btn-primary btn-reserve" style={{ width: '100%' }}
                        onClick={() => setSelectedFacility(f)}>
                        Reserve Space <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        <div className="recent-section">
          <div className="section-header">
            <div className="feed-badge"><History size={16} /><span>Recent Activity</span></div>
            <h2>Recent Bookings</h2>
          </div>
          <div className="recent-list">
            {recent.length === 0
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent bookings yet.</p>
              : recent.map(b => (
                <div key={b._id || b.id} className="recent-card">
                  <div className="recent-info">
                    <div className="recent-facility">{b.facilityId?.name || b.facilityName || b.facility}</div>
                    <div className="recent-purpose">{b.purpose}</div>
                    <div className="recent-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        <span>{formatDate(b.date)}</span>
                        <span>{b.time || `${b.startTime} – ${b.endTime}`}</span>
                        <span>{b.attendeesCount || b.attendees} Ppl</span>
                      </div>
                      {b.approval && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>
                            {b.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {b.approval.approvedById?.name || 'Admin'}
                            {b.approval.timestamp ? ` on ${formatDateTime(b.approval.timestamp)}` : ''}
                          </span>
                          {b.approval.remarks && (
                            <span style={{ fontStyle: 'italic' }}>({b.approval.remarks})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`feed-status ${(b.status || '').toLowerCase()}`}>{b.status}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {selectedFacility && (
        <BookingModal
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          onBooked={() => {
            setSelectedFacility(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

function MyBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(`${API_BASE_URL}/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBookings(d.bookings || []));
  }, [token]);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <>
      <header className="hero">
        <div className="hero-badge animate-fade"><Bookmark size={16} /><span>My Reservations</span></div>
        <h1 className="animate-slide-up">My Bookings</h1>
        <p className="animate-slide-up delay-1">Track the status of all your facility reservation requests.</p>
      </header>
      <div className="content-container animate-fade delay-2">
        <div className="my-bookings-filters">
          {['all', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} className={`filter-btn${filter === s ? ' active' : ''}`}
              onClick={() => setFilter(s)}>{s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <div id="myBookingsList">
          {filtered.length === 0
            ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>No bookings found.</p>
            : filtered.map(b => (
              <div key={b._id || b.id} className="recent-card" style={{ marginBottom: '1rem' }}>
                <div className="recent-info">
                  <div className="recent-facility">{b.facilityId?.name || b.facilityName || b.facility}</div>
                  <div className="recent-purpose">{b.purpose}</div>
                  <div className="recent-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      <span>{formatDate(b.date)}</span>
                      <span>{b.time || `${b.startTime} – ${b.endTime}`}</span>
                      <span>{b.attendeesCount || b.attendees} Attendees</span>
                    </div>
                    {b.approval && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span>
                          {b.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {b.approval.approvedById?.name || 'Admin'}
                          {b.approval.timestamp ? ` on ${formatDateTime(b.approval.timestamp)}` : ''}
                        </span>
                        {b.approval.remarks && (
                          <span style={{ fontStyle: 'italic' }}>({b.approval.remarks})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`feed-status ${(b.status || '').toLowerCase()}`}>{b.status}</div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
}

function SettingsPage({ onChangePassword }) {
  return (
    <>
      <header className="hero">
        <div className="hero-badge animate-fade"><Settings size={16} /><span>Account Configurations</span></div>
        <h1 className="animate-slide-up">Settings</h1>
        <p className="animate-slide-up delay-1">Manage your account preferences and security settings.</p>
      </header>
      <div className="content-container animate-fade delay-2">
        <div className="settings-card card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="card-body">
            <h3 className="card-title">Security & Password</h3>
            <p className="card-desc">Keep your account secure by periodically updating your password.</p>
            <button className="btn btn-primary open-change-pwd-btn" type="button" onClick={onChangePassword}>
              <Lock size={16} /><span>Change Password</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function FacultyPortal({ activePage = 'amenities', onChangePassword }) {
  return (
    <div id="facultyPortal">
      {activePage === 'amenities' && <AmenitiesPage onChangePassword={onChangePassword} />}
      {activePage === 'calendar' && (
        <>
          <header className="hero">
            <div className="hero-badge animate-fade"><span>Booking Schedule</span></div>
            <h1 className="animate-slide-up">My Calendar</h1>
            <p className="animate-slide-up delay-1">All your approved and pending reservations at a glance.</p>
          </header>
          <div className="content-container animate-fade delay-2"><CalendarView /></div>
        </>
      )}
      {activePage === 'myBookings' && <MyBookingsPage />}
      {activePage === 'settings' && <SettingsPage onChangePassword={onChangePassword} />}
    </div>
  );
}

// Export the setPage so App can pass it through Navbar
export { FacultyPortal };
export function useFacultyPage() {
  const [page, setPage] = useState('amenities');
  return [page, setPage];
}
