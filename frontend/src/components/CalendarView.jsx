import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';
import { Clock } from 'lucide-react';

const FILTER_TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export default function CalendarView() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters State
  const [selectedVenues, setSelectedVenues] = useState(['all']);
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [filterStartTime, setFilterStartTime] = useState('06:00');
  const [filterEndTime, setFilterEndTime] = useState('22:00');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [layoutMode, setLayoutMode] = useState('calendar'); // 'calendar' | 'excel'
  const [selectedExcelCell, setSelectedExcelCell] = useState(null); // { rowIndex, colIndex }
  const [displayType, setDisplayType] = useState('bookings'); // 'bookings' | 'available' | 'both'

  const handleVenueToggle = (venueId) => {
    if (venueId === 'all') {
      setSelectedVenues(['all']);
    } else {
      setSelectedVenues(prev => {
        let next = prev.filter(v => v !== 'all');
        const venueIdStr = venueId.toString();
        const prevStr = prev.map(id => id.toString());
        if (prevStr.includes(venueIdStr)) {
          next = next.filter(v => v.toString() !== venueIdStr);
        } else {
          next.push(venueId);
        }
        if (next.length === 0) return ['all'];
        return next;
      });
    }
  };

  const getVenueFilterLabel = () => {
    if (selectedVenues.includes('all')) return 'All Venues';
    if (selectedVenues.length === 1) {
      const found = facilities.find(f => (f._id || f.id) === selectedVenues[0]);
      return found ? (found.label || found.name) : '1 Venue Selected';
    }
    return `${selectedVenues.length} Venues Selected`;
  };

  const formatModalDate = (dateStr) => {
    if (!dateStr) return '';
    const dateOnlyStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dateOnlyStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      if (!isNaN(localDate.getTime())) {
        return localDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  };

  const formatModalEndDate = (dateStr) => {
    if (!dateStr) return '';
    const dateOnlyStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dateOnlyStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      if (!isNaN(localDate.getTime())) {
        return localDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  };

  const loadCalendarData = useCallback(() => {
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

  const handleCancelBooking = async (entireSeries = false) => {
    if (!selectedBookingDetails) return;
    const bId = selectedBookingDetails._id || selectedBookingDetails.id;
    const isRecurring = selectedBookingDetails.isRecurring;
    
    let confirmMsg = "Are you sure you want to cancel this booking?";
    if (isRecurring) {
      confirmMsg = entireSeries 
        ? "Are you sure you want to cancel the entire recurring series of bookings?" 
        : `Are you sure you want to cancel this booking for ${formatModalDate(selectedBookingDetails.occurrenceDate)} only?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let response;
      if (isRecurring && !entireSeries) {
        response = await fetch(`${API_BASE_URL}/bookings/${bId}/cancel-occurrence`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date: selectedBookingDetails.occurrenceDate })
        });
      } else {
        response = await fetch(`${API_BASE_URL}/bookings/${bId}`, {
          method: 'DELETE',
          headers
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || 'Failed to cancel booking');
      }

      setSelectedBookingDetails(null);
      loadCalendarData();
      window.dispatchEvent(new Event('reloadBookings'));
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

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
    if (!selectedVenues.includes('all')) {
      const bVenueId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
      const bVenueIdStr = bVenueId?.toString();
      if (!selectedVenues.some(id => id.toString() === bVenueIdStr)) return false;
    }

    // 2. Time Filter
    const bStartMins = timeToMinutes(b.startTime || b.time?.split(' – ')[0]);
    const bEndMins = timeToMinutes(b.endTime || b.time?.split(' – ')[1] || b.startTime || b.time?.split(' – ')[0]);
    const fStartMins = timeToMinutes(filterStartTime);
    const fEndMins = timeToMinutes(filterEndTime);

    if (bStartMins >= fEndMins || bEndMins <= fStartMins) return false;

    return true;
  };

  const isBookingActiveOnDate = (b, dateObj) => {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    if (b.cancelledDates && b.cancelledDates.includes(dateStr)) {
      return false;
    }
    
    const bDate = b.date ? (b.date.includes('T') ? b.date.split('T')[0] : b.date) : '';
    if (!bDate) return false;

    if (b.isRecurring) {
      if (dateStr < bDate) return false;
      if (b.recurringEndDate) {
        const endYMD = b.recurringEndDate.includes('T') ? b.recurringEndDate.split('T')[0] : b.recurringEndDate;
        if (dateStr > endYMD) return false;
      }
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, etc.
      return Array.isArray(b.recurringDays) && b.recurringDays.includes(dayOfWeek);
    }

    return bDate === dateStr;
  };

  const getBookingsForDay = (day) => {
    const dateObj = new Date(year, month, day);
    return bookings
      .filter(b => {
        return isBookingActiveOnDate(b, dateObj) && (b.status === 'APPROVED' || b.status === 'PENDING') && filterBooking(b);
      })
      .sort((a, b) => {
        const aStart = a.startTime || a.time?.split(' – ')[0] || '';
        const bStart = b.startTime || b.time?.split(' – ')[0] || '';
        return timeToMinutes(aStart) - timeToMinutes(bStart);
      });
  };

  const getBookingsForDateObj = (dateObj) => {
    return bookings
      .filter(b => {
        return isBookingActiveOnDate(b, dateObj) && (b.status === 'APPROVED' || b.status === 'PENDING') && filterBooking(b);
      })
      .sort((a, b) => {
        const aStart = a.startTime || a.time?.split(' – ')[0] || '';
        const bStart = b.startTime || b.time?.split(' – ')[0] || '';
        return timeToMinutes(aStart) - timeToMinutes(bStart);
      });
  };

  const getUnbookedVenuesForDateObj = (dateObj) => {
    const candidateFacilities = selectedVenues.includes('all')
      ? facilities
      : facilities.filter(f => selectedVenues.includes(f._id || f.id));

    const dayBookings = bookings.filter(b => {
      return isBookingActiveOnDate(b, dateObj) &&
             (b.status === 'APPROVED' || b.status === 'PENDING') &&
             filterBooking(b);
    });

    const bookedFacilityIds = new Set(
      dayBookings.map(b => {
        const id = b.facilityId?._id || b.facilityId?.id || b.facilityId;
        return typeof id === 'object' && id !== null ? (id._id || id.id || id).toString() : id?.toString();
      })
    );

    return candidateFacilities.filter(f => {
      const fId = f._id || f.id;
      const fIdStr = typeof fId === 'object' && fId !== null ? (fId._id || fId.id || fId).toString() : fId?.toString();
      return !bookedFacilityIds.has(fIdStr);
    });
  };

  const statusColor = { APPROVED: '#10b981', PENDING: '#f59e0b' };
  const recurringColor = '#7c3aed'; // Purple for approved recurring bookings
  // Pending bookings are always yellow; approved recurring are purple; approved non-recurring are green
  const getEventColor = (b) => {
    if (b.status === 'PENDING') return statusColor.PENDING; // always yellow
    if (b.isRecurring) return recurringColor;               // approved recurring → purple
    return statusColor[b.status] || '#64748b';              // approved → green
  };

  // 12-hour formatting helper for Excel View
  const formatTime12 = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    const minutesStr = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
    return `${hours12}${minutesStr} ${ampm}`;
  };

  // Excel column letter generator (A, B, C... AA, AB...)
  const getExcelColLetter = (index) => {
    let temp = index;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Get bookings filtered for a specific day and facility
  const getBookingsForDayAndFacility = (day, facilityId) => {
    const dateObj = new Date(year, month, day);
    const targetFIdStr = facilityId?.toString();
    return bookings
      .filter(b => {
        const bVenueId = b.facilityId?._id || b.facilityId?.id || b.facilityId;
        const bVenueIdStr = bVenueId?.toString();
        return bVenueIdStr === targetFIdStr && isBookingActiveOnDate(b, dateObj) && (b.status === 'APPROVED' || b.status === 'PENDING') && filterBooking(b);
      })
      .sort((a, b) => {
        const aStart = a.startTime || a.time?.split(' – ')[0] || '';
        const bStart = b.startTime || b.time?.split(' – ')[0] || '';
        return timeToMinutes(aStart) - timeToMinutes(bStart);
      });
  };

  const isCellSelected = (rIdx, cIdx) => {
    return selectedExcelCell && selectedExcelCell.rowIndex === rIdx && selectedExcelCell.colIndex === cIdx;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();

  return (
    <div className="custom-calendar">
      {/* Filters Control Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: 16, border: '1px solid var(--surface-border)', backdropFilter: 'blur(10px)' }}>
        {/* Layout Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layout</label>
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, padding: 2 }}>
            <button className={`btn ${layoutMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setLayoutMode('calendar')}>Calendar View</button>
            <button className={`btn ${layoutMode === 'excel' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setLayoutMode('excel')}>Excel View</button>
          </div>
        </div>

        {/* View Mode Filter */}
        {layoutMode === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>View</label>
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, padding: 2 }}>
              <button className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('month')}>Month</button>
              <button className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('week')}>Week</button>
              <button className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setViewMode('day')}>Day</button>
            </div>
          </div>
        )}

        {/* Display Mode Filter */}
        {layoutMode === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Show</label>
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, padding: 2 }}>
              <button className={`btn ${displayType === 'bookings' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setDisplayType('bookings')}>Bookings</button>
              <button className={`btn ${displayType === 'available' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setDisplayType('available')}>Available Venues</button>
              <button className={`btn ${displayType === 'both' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 6 }} onClick={() => setDisplayType('both')}>Both</button>
            </div>
          </div>
        )}

        {/* Venue Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 150, position: 'relative' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Venue / Facility</label>
          <div 
            onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
            style={{ 
              padding: '0.4rem 0.6rem', 
              border: '1px solid var(--surface-border)', 
              borderRadius: 8, 
              fontSize: '0.85rem', 
              height: 34, 
              width: '100%', 
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              userSelect: 'none'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getVenueFilterLabel()}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>▼</span>
          </div>
          
          {venueDropdownOpen && (
            <>
              {/* Invisible backdrop to close the dropdown when clicking outside */}
              <div 
                onClick={() => setVenueDropdownOpen(false)}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
              />
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                marginTop: '4px', 
                background: 'white', 
                border: '1px solid var(--surface-border)', 
                borderRadius: 8, 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 1000,
                maxHeight: '250px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                <div 
                  onClick={() => handleVenueToggle('all')}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 8px', 
                    borderRadius: 4, 
                    cursor: 'pointer',
                    background: selectedVenues.includes('all') ? '#f1f5f9' : 'transparent',
                    fontSize: '0.85rem'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedVenues.includes('all')}
                    onChange={() => {}}
                    style={{ pointerEvents: 'none' }}
                  />
                  <span style={{ fontWeight: selectedVenues.includes('all') ? 700 : 500 }}>All Venues</span>
                </div>
                
                {facilities.map(f => {
                  const fId = f._id || f.id;
                  const isChecked = selectedVenues.includes(fId);
                  return (
                    <div 
                      key={fId}
                      onClick={() => handleVenueToggle(fId)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '6px 8px', 
                        borderRadius: 4, 
                        cursor: 'pointer',
                        background: isChecked ? '#f1f5f9' : 'transparent',
                        fontSize: '0.85rem'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ pointerEvents: 'none' }}
                      />
                      <span style={{ fontWeight: isChecked ? 700 : 500 }}>{f.label || f.name}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Unified Time Filter Card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: 290,
          background: '#ffffff',
          border: '1.5px solid var(--surface-border)',
          borderRadius: 14,
          padding: '0.65rem 0.85rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          flex: '1 1 auto',
          transition: 'all 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <Clock size={14} style={{ color: 'var(--primary, #2563eb)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Time Range Filter
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="time"
                value={filterStartTime} 
                onChange={e => setFilterStartTime(e.target.value)} 
                style={{ 
                  padding: '0.45rem 0.65rem', 
                  border: '1.5px solid var(--surface-border)', 
                  borderRadius: 10, 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  height: 38, 
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  color: 'var(--text-main, #1e293b)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--primary, #2563eb)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--surface-border)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f8fafc';
                }}
              />
            </div>
            
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>to</span>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="time"
                value={filterEndTime} 
                onChange={e => setFilterEndTime(e.target.value)} 
                style={{ 
                  padding: '0.45rem 0.65rem', 
                  border: '1.5px solid var(--surface-border)', 
                  borderRadius: 10, 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  height: 38, 
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  color: 'var(--text-main, #1e293b)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--primary, #2563eb)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--surface-border)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f8fafc';
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
          onClick={() => {
            if (layoutMode === 'excel' || viewMode === 'month') {
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
          {(layoutMode === 'excel' || viewMode === 'month') && monthName}
          {layoutMode === 'calendar' && viewMode === 'week' && getWeekRangeString()}
          {layoutMode === 'calendar' && viewMode === 'day' && new Date(year, month, selectedDay).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}
          onClick={() => {
            if (layoutMode === 'excel' || viewMode === 'month') {
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

      {/* Calendar Layout */}
      {layoutMode === 'calendar' && (
        <>
          {/* Day View */}
          {viewMode === 'day' && (() => {
        const dayBookings = getBookingsForDay(selectedDay);
        const unbooked = getUnbookedVenuesForDateObj(new Date(year, month, selectedDay));
        return (
          <div className="day-view-container" style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '1.5rem', border: '1px solid var(--surface-border)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Bookings Section */}
              {displayType !== 'available' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Bookings / Reservations ({dayBookings.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dayBookings.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.3)', borderRadius: 12, border: '1px dashed var(--surface-border)' }}>
                        No reservations scheduled for this day matching filters.
                      </div>
                    ) : (
                      dayBookings.map((b, i) => (
                        <div key={b._id || b.id || i} 
                          onClick={() => {
                            const y = year;
                            const m = String(month + 1).padStart(2, '0');
                            const d = String(selectedDay).padStart(2, '0');
                            setSelectedBookingDetails({ ...b, occurrenceDate: `${y}-${m}-${d}` });
                          }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            padding: '1rem 1.25rem', background: b.isRecurring ? '#faf5ff' : 'white',
                            border: `1px solid ${b.isRecurring ? '#7c3aed30' : 'var(--surface-border)'}`,
                            borderRadius: 14, boxShadow: 'var(--surface-shadow)',
                            borderLeft: `4px solid ${getEventColor(b)}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'var(--surface-shadow)';
                          }}
                        >
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
                            {b.requirements && b.requirements.trim() && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem', marginTop: '6px',
                                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: 8, padding: '0.35rem 0.6rem' }}>
                                <span style={{ fontSize: '0.72rem', flexShrink: 0 }}>📦</span>
                                <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
                                  <span style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', display: 'block', marginBottom: 1 }}>Supplies Required</span>
                                  {b.requirements.trim()}
                                </div>
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

              {/* Available Venues Section */}
              {displayType !== 'bookings' && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Available / Unbooked Venues ({unbooked.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {unbooked.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.3)', borderRadius: 12, border: '1px dashed var(--surface-border)' }}>
                        All venues are fully booked matching current filters.
                      </div>
                    ) : (
                      unbooked.map((f, i) => (
                        <div key={f._id || f.id || i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '1rem 1.25rem', background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: 14, boxShadow: 'var(--surface-shadow)',
                          borderLeft: '4px solid #3b82f6'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.85rem' }}>🟢</span>
                              {f.label || f.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#60a5fa', marginTop: '2px', fontWeight: 500 }}>
                              {f.location || 'No location set'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 50, display: 'inline-block' }}>
                              AVAILABLE
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Week View */}
      {viewMode === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {weekDays.map((dateObj, idx) => {
            const isToday = today.getDate() === dateObj.getDate() && today.getMonth() === dateObj.getMonth() && today.getFullYear() === dateObj.getFullYear();
            const dayBookings = displayType !== 'available' ? getBookingsForDateObj(dateObj) : [];
            const unbooked = displayType !== 'bookings' ? getUnbookedVenuesForDateObj(dateObj) : [];
            
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
                  {dayBookings.length === 0 && unbooked.length === 0 ? (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No events</div>
                  ) : (
                    <>
                      {dayBookings.map((b, i) => (
                        <div key={`b-${i}`} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const y = dateObj.getFullYear();
                            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const d = String(dateObj.getDate()).padStart(2, '0');
                            setSelectedBookingDetails({ ...b, occurrenceDate: `${y}-${m}-${d}` });
                          }}
                          style={{ 
                            fontSize: '0.65rem', padding: '4px 6px', borderRadius: 6, color: 'white', 
                            background: getEventColor(b), fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            borderLeft: b.isRecurring ? '3px solid rgba(255,255,255,0.5)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 2 }}>
                            {b.isRecurring && <span style={{ fontSize: '0.6rem' }}>🔁</span>}
                            {b.startTime || b.time?.split(' – ')[0]}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.facilityId?.name || b.facilityName || b.facility}
                          </div>
                          {b.requirements && b.requirements.trim() && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: '0.55rem' }}>📦</span>
                              <span style={{ fontSize: '0.6rem', fontStyle: 'italic' }}>{b.requirements.trim()}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {unbooked.map((f, i) => (
                        <div key={`u-${i}`} style={{ 
                          fontSize: '0.65rem', padding: '4px 6px', borderRadius: 6, 
                          color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe',
                          fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span>🟢 Available</span>
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.label || f.name}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Color Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>Legend:</span>
        {[
          { color: '#10b981', label: 'Approved' },
          { color: '#f59e0b', label: 'Pending' },
          { color: '#7c3aed', label: 'Recurring (Approved)' },
          { color: '#3b82f6', label: 'Not Booked (Available)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

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
              const dateObj = new Date(year, month, day);
              const dayBookings = displayType !== 'available' ? getBookingsForDay(day) : [];
              const unbooked = displayType !== 'bookings' ? getUnbookedVenuesForDateObj(dateObj) : [];

              const totalItems = [
                ...dayBookings.map(b => ({ type: 'booking', data: b })),
                ...unbooked.map(f => ({ type: 'unbooked', data: f }))
              ];

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
                  {totalItems.slice(0, 3).map((item, i) => {
                    if (item.type === 'booking') {
                      const b = item.data;
                      return (
                        <div key={`b-${i}`} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const y = year;
                            const m = String(month + 1).padStart(2, '0');
                            const d = String(day).padStart(2, '0');
                            setSelectedBookingDetails({ ...b, occurrenceDate: `${y}-${m}-${d}` });
                          }}
                          style={{
                            fontSize: '0.6rem', fontWeight: 600, color: 'white',
                            background: getEventColor(b),
                            borderRadius: 4, padding: '1px 4px', marginBottom: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: 2,
                            borderLeft: b.isRecurring ? '3px solid rgba(255,255,255,0.4)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {b.isRecurring && <span style={{ fontSize: '0.55rem', flexShrink: 0 }}>🔁</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.facilityId?.name || b.facilityName || b.facility}</span>
                          {b.requirements && b.requirements.trim() && (
                            <span style={{ flexShrink: 0, fontSize: '0.55rem' }} title={b.requirements.trim()}>📦</span>
                          )}
                        </div>
                      );
                    } else {
                      const f = item.data;
                      return (
                        <div key={`u-${i}`} style={{
                          fontSize: '0.6rem', fontWeight: 600, color: '#1e40af',
                          background: '#eff6ff', border: '1px solid #bfdbfe',
                          borderRadius: 4, padding: '1px 4px', marginBottom: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 2,
                        }}>
                          <span style={{ fontSize: '0.55rem', flexShrink: 0 }}>🟢</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.label || f.name}</span>
                        </div>
                      );
                    }
                  })}
                  {totalItems.length > 3 && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>+{totalItems.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
        </>
      )}

      {/* Excel Layout */}
      {layoutMode === 'excel' && (() => {
        const displayedFacilities = selectedVenues.includes('all')
          ? facilities
          : facilities.filter(f => selectedVenues.includes(f._id || f.id));
        return (
          <div className="excel-container" style={{ marginBottom: '1.5rem' }}>
            <table className="excel-table">
              <thead>
                {/* Column Letter Row (A, B, C...) */}
                <tr className="excel-col-letter-row">
                  <th className="excel-corner" />
                  <th className="excel-header-cell excel-header-letter-date">A</th>
                  <th className="excel-header-cell excel-header-letter-day">B</th>
                  {displayedFacilities.map((_, fIdx) => (
                    <th key={`letter-${fIdx}`} className="excel-header-cell">
                      {getExcelColLetter(fIdx + 2)}
                    </th>
                  ))}
                </tr>
                {/* Table Column Name Row (Date, Day, Facility Names) */}
                <tr className="excel-header-row">
                  <th className="excel-row-num-header">1</th>
                  <th className="excel-header-cell excel-header-date">Date</th>
                  <th className="excel-header-cell excel-header-day">Day</th>
                  {displayedFacilities.map((f, fIdx) => (
                    <th key={`name-${fIdx}`} className="excel-header-cell" style={{ background: '#f8fafc', fontWeight: 700, minWidth: 200 }}>
                      {f.label || f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                  const dayVal = dIdx + 1;
                  const dateObj = new Date(year, month, dayVal);
                  const dateStr = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  const rowNum = dayVal + 1;

                  return (
                    <tr key={`row-${dayVal}`}>
                      <td className="excel-row-num">{rowNum}</td>
                      
                      {/* Date Cell */}
                      <td 
                        className={`excel-col-date ${isCellSelected(dayVal, 0) ? 'excel-selected-cell' : ''}`}
                        onClick={() => setSelectedExcelCell({ rowIndex: dayVal, colIndex: 0 })}
                        style={{ textAlign: 'center' }}
                      >
                        {dateStr}
                        {isCellSelected(dayVal, 0) && <div className="excel-fill-handle" />}
                      </td>

                      {/* Day Cell */}
                      <td 
                        className={`excel-col-day ${isCellSelected(dayVal, 1) ? 'excel-selected-cell' : ''}`}
                        onClick={() => setSelectedExcelCell({ rowIndex: dayVal, colIndex: 1 })}
                        style={{ textAlign: 'center' }}
                      >
                        {dayName}
                        {isCellSelected(dayVal, 1) && <div className="excel-fill-handle" />}
                      </td>

                      {/* Facility Cells */}
                      {displayedFacilities.map((f, fIdx) => {
                        const facilityId = f._id || f.id;
                        const cellBookings = getBookingsForDayAndFacility(dayVal, facilityId);
                        const colIndex = fIdx + 2;

                        return (
                          <td 
                            key={`cell-${dayVal}-${fIdx}`}
                            className={`excel-cell ${isCellSelected(dayVal, colIndex) ? 'excel-selected-cell' : ''}`}
                            onClick={() => setSelectedExcelCell({ rowIndex: dayVal, colIndex })}
                            style={{ minWidth: 220 }}
                          >
                            {cellBookings.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {cellBookings.map((b, bIdx) => (
                                  <span 
                                    key={b._id || b.id || bIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const y = year;
                                      const m = String(month + 1).padStart(2, '0');
                                      const d = String(dayVal).padStart(2, '0');
                                      setSelectedBookingDetails({ ...b, occurrenceDate: `${y}-${m}-${d}` });
                                    }}
                                    className="excel-booking-badge"
                                    style={{
                                      cursor: 'pointer',
                                      color: getEventColor(b),
                                      background: `${getEventColor(b)}15`,
                                      border: `1px solid ${getEventColor(b)}30`,
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease-in-out',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Click to view details"
                                  >
                                    {b.isRecurring && <span style={{ marginRight: '4px', fontSize: '0.7rem' }}>🔁</span>}
                                    {formatTime12(b.startTime)} to {formatTime12(b.endTime)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {isCellSelected(dayVal, colIndex) && <div className="excel-fill-handle" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* CSS Animations & Excel Styles */}
      <style>{`
        .excel-booking-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          filter: brightness(0.95);
        }
        .excel-booking-badge:active {
          transform: translateY(0);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .excel-container {
          width: 100%;
          max-height: 600px;
          overflow: auto;
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .excel-table {
          border-collapse: separate;
          border-spacing: 0;
          font-family: Arial, sans-serif;
          font-size: 0.8rem;
          color: #1e293b;
          min-width: 100%;
        }
        .excel-cell {
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 8px;
          white-space: nowrap;
          min-width: 120px;
          position: relative;
          background: white;
        }
        .excel-col-date {
          position: sticky;
          left: 40px;
          z-index: 2;
          background: white;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 8px;
          white-space: nowrap;
          min-width: 100px;
          width: 100px;
        }
        .excel-col-day {
          position: sticky;
          left: 140px;
          z-index: 2;
          background: white;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 8px;
          white-space: nowrap;
          min-width: 100px;
          width: 100px;
        }
        .excel-header-cell {
          background: #f1f5f9;
          color: #475569;
          font-weight: 600;
          text-align: center;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          user-select: none;
          font-size: 0.75rem;
          padding: 2px 6px;
        }
        .excel-header-letter-date {
          position: sticky;
          left: 40px;
          top: 0;
          z-index: 4;
          background: #f1f5f9;
        }
        .excel-header-letter-day {
          position: sticky;
          left: 140px;
          top: 0;
          z-index: 4;
          background: #f1f5f9;
        }
        .excel-header-date {
          position: sticky;
          left: 40px;
          top: 25px;
          z-index: 4;
          background: #f8fafc;
        }
        .excel-header-day {
          position: sticky;
          left: 140px;
          top: 25px;
          z-index: 4;
          background: #f8fafc;
        }
        .excel-row-num-header {
          position: sticky;
          left: 0;
          top: 25px;
          z-index: 4;
          background: #f1f5f9;
          width: 40px;
          min-width: 40px;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          text-align: center;
          font-weight: 600;
          color: #64748b;
          font-size: 0.75rem;
          padding: 2px 6px;
        }
        .excel-row-num {
          width: 40px;
          min-width: 40px;
          background: #f1f5f9;
          color: #64748b;
          text-align: center;
          font-weight: 600;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          user-select: none;
          position: sticky;
          left: 0;
          z-index: 2;
        }
        .excel-corner {
          position: sticky;
          left: 0;
          top: 0;
          z-index: 5;
          background: #f1f5f9;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          height: 25px;
          width: 40px;
          min-width: 40px;
        }
        .excel-col-letter-row th {
          position: sticky;
          top: 0;
          z-index: 3;
        }
        .excel-header-row th {
          position: sticky;
          top: 25px;
          z-index: 3;
        }
        .excel-selected-cell {
          outline: 2px solid #2563eb !important;
          outline-offset: -2px;
          z-index: 10;
        }
        .excel-fill-handle {
          width: 6px;
          height: 6px;
          background: #2563eb;
          position: absolute;
          right: -3px;
          bottom: -3px;
          cursor: crosshair;
          z-index: 11;
          border: 1px solid white;
        }
      `}</style>

      {/* Booking Details Modal */}
      {selectedBookingDetails && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={() => setSelectedBookingDetails(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: 24,
            width: '100%',
            maxWidth: 550,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--surface-border)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(to right, #f8fafc, #f1f5f9)'
            }}>
              <div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: getEventColor(selectedBookingDetails),
                  background: `${getEventColor(selectedBookingDetails)}12`,
                  padding: '2px 8px',
                  borderRadius: 50,
                  display: 'inline-block',
                  marginBottom: '4px'
                }}>
                  {selectedBookingDetails.isRecurring ? 'Recurring Booking' : `Booking ${selectedBookingDetails.status}`}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedBookingDetails.facilityId?.name || selectedBookingDetails.facilityName || selectedBookingDetails.facility}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBookingDetails(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Event & Purpose */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Event / Purpose</label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedBookingDetails.purpose}
                </div>
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {formatModalDate(selectedBookingDetails.occurrenceDate || selectedBookingDetails.date)}
                    {selectedBookingDetails.isRecurring && (
                      <span style={{ fontSize: '0.72rem', color: '#7c3aed', marginLeft: '0.5rem', fontWeight: 700 }}>
                        (Occurrence)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {selectedBookingDetails.startTime || selectedBookingDetails.time?.split(' – ')[0]} – {selectedBookingDetails.endTime || selectedBookingDetails.time?.split(' – ')[1]}
                  </div>
                </div>
              </div>

              {/* Recurring details */}
              {selectedBookingDetails.isRecurring && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '0.75rem 1rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Recurrence Schedule</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5b21b6' }}>
                    Repeats every: {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].filter((_, i) => selectedBookingDetails.recurringDays?.includes(i)).join(', ')}
                  </div>
                  {selectedBookingDetails.recurringEndDate && (
                    <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px' }}>
                      Until: {formatModalEndDate(selectedBookingDetails.recurringEndDate)}
                    </div>
                  )}
                </div>
              )}

              {/* Location & Capacity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Location</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedBookingDetails.facilityId?.location || selectedBookingDetails.location || 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Estimated Attendees</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedBookingDetails.attendeesCount || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Requester Info */}
              {selectedBookingDetails.userId && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--surface-border)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Requester</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedBookingDetails.userId.name || 'Unknown User'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Email: {selectedBookingDetails.userId.email || 'N/A'}
                  </div>
                  {selectedBookingDetails.userId.department && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Department: {selectedBookingDetails.userId.department}
                    </div>
                  )}
                  {selectedBookingDetails.userId.role && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '6px', textTransform: 'uppercase' }}>
                      {selectedBookingDetails.userId.role}
                    </div>
                  )}
                </div>
              )}

              {/* Supplies & Requirements */}
              {selectedBookingDetails.requirements && selectedBookingDetails.requirements.trim() && (
                <div style={{
                  background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 12, padding: '0.75rem 1rem'
                }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    📦 Required Supplies / Setup
                  </label>
                  <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                    {selectedBookingDetails.requirements.trim()}
                  </div>
                </div>
              )}

              {/* POC Contact Info (Point of Contact) */}
              {(selectedBookingDetails.pocName || selectedBookingDetails.pocContact) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {selectedBookingDetails.pocName && (
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>POC Name</label>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {selectedBookingDetails.pocName}
                      </div>
                    </div>
                  )}
                  {selectedBookingDetails.pocContact && (
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>POC Contact</label>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {selectedBookingDetails.pocContact}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Notes */}
              {selectedBookingDetails.notes && selectedBookingDetails.notes.trim() && (
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Additional Notes</label>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 8, borderLeft: '3px solid #cbd5e1' }}>
                    "{selectedBookingDetails.notes.trim()}"
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                {(() => {
                  const requesterId = selectedBookingDetails.userId?._id || selectedBookingDetails.userId?.id || selectedBookingDetails.userId;
                  const currentUserId = user?._id || user?.id;
                  const isOwner = requesterId && currentUserId && (requesterId.toString() === currentUserId.toString());
                  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
                  const canCancel = isOwner || isAdmin;
                  
                  if (!canCancel) return null;
                  
                  if (selectedBookingDetails.isRecurring) {
                    return (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          className="btn"
                          onClick={() => handleCancelBooking(false)}
                          style={{ 
                            padding: '0.45rem 1rem', 
                            borderRadius: 10, 
                            fontSize: '0.8rem',
                            border: '1px solid #f59e0b',
                            color: '#d97706',
                            background: '#fffbeb',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel This Day Only
                        </button>
                        <button 
                          className="btn"
                          onClick={() => handleCancelBooking(true)}
                          style={{ 
                            padding: '0.45rem 1rem', 
                            borderRadius: 10, 
                            fontSize: '0.8rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel Entire Series
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <button 
                        className="btn"
                        onClick={() => handleCancelBooking(false)}
                        style={{ 
                          padding: '0.45rem 1rem', 
                          borderRadius: 10, 
                          fontSize: '0.8rem',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel Booking
                      </button>
                    );
                  }
                })()}
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedBookingDetails(null)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: 10, fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
