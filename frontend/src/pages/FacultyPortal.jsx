import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, History, Bookmark, Settings, Search, X, Users, MapPin, ChevronRight, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/CalendarView';
import BookingModal from '../components/BookingModal';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function AmenitiesPage({ onChangePassword }) {
  const { user, token } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/facilities`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setFacilities(d.facilities || []));
    fetch(`${API_BASE_URL}/bookings/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBookings(d.bookings || []));
  }, [token]);

  const filtered = search
    ? facilities.filter(f => [f.label || f.name, f.desc || f.description, f.category, f.capacity]
        .some(v => v?.toLowerCase().includes(search.toLowerCase())))
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
            : filtered.map((f, i) => (
              <div key={f._id || f.id} className="card animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="card-image" style={f.image ? { backgroundImage: `url('${f.image}')`, backgroundSize: 'cover', backgroundPosition: 'center', height: 160 } : { height: 160 }}>
                  <div className={`status-badge ${f.available ? 'available' : 'reserved'}`}>
                    <div className={`status-dot ${f.available ? 'available' : 'reserved'}`} />
                    {f.available ? 'Available' : 'Reserved'}
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
            ))
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
                    <div className="recent-facility">{b.facilityName || b.facility}</div>
                    <div className="recent-purpose">{b.purpose}</div>
                    <div className="recent-meta">
                      <span>{formatDate(b.date)}</span>
                      <span>{b.time || `${b.startTime} – ${b.endTime}`}</span>
                      <span>{b.attendees} Ppl</span>
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
          onBooked={() => { setSelectedFacility(null); }}
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
    fetch(`${API_BASE_URL}/bookings/my`, { headers: { Authorization: `Bearer ${token}` } })
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
                  <div className="recent-facility">{b.facilityName || b.facility}</div>
                  <div className="recent-purpose">{b.purpose}</div>
                  <div className="recent-meta">
                    <span>{formatDate(b.date)}</span>
                    <span>{b.time || `${b.startTime} – ${b.endTime}`}</span>
                    <span>{b.attendees} Attendees</span>
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
