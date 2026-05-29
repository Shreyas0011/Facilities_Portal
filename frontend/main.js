/* =========================================
   DATA
   ========================================= */
const facilities = [
  { id: "classroom",           label: "Classrooms",           icon: "book-open",       capacity: "50",         available: true,  category: "academic", desc: "Standard classrooms with whiteboards, projectors, and audio assistance." },
  { id: "prof_classroom",      label: "Professional Classrooms", icon: "graduation-cap", capacity: "100",        available: true,  category: "academic", desc: "Smart lecture halls with tier seating, dual-screen projectors, and AV controls." },
  { id: "seminar_hall",        label: "Seminar Halls",         icon: "calendar-days",  capacity: "300",         available: false, category: "academic", desc: "Tiered halls with podium mic arrays, ideal for guest talks and workshops." },
  { id: "theatre",             label: "Theatre",               icon: "clapperboard",   capacity: "100",         available: true,  category: "media",    desc: "Black-box theatre with stage lighting, custom acoustics, and flexible seating." },
  { id: "auditorium",          label: "Auditorium",            icon: "mic-2",          capacity: "500",         available: false, category: "media",    desc: "Grand auditorium with 500-seat capacity, surround PA system, and backstage." },
  { id: "lab",                 label: "Labs",                  icon: "flask-conical",  capacity: "45",          available: true,  category: "academic", desc: "Fully equipped labs for science, computing, and engineering experimentation." },
  { id: "sports",              label: "Sports Facilities",     icon: "dumbbell",       capacity: "Open Space",  available: true,  category: "recreation", desc: "Indoor courts and outdoor turf for sports clubs and recreation sessions." },
  { id: "music_dance",         label: "Music / Dance Rooms",   icon: "music",          capacity: "30",          available: false, category: "media",    desc: "Soundproofed practice rooms with mirrors, flooring, and pre-installed instruments." },
  { id: "podcast_studio",      label: "Podcast Studio",        icon: "radio",          capacity: "8",           available: true,  category: "media",    desc: "Professional recording booth with acoustic foam, mixers, and multi-microphone setup." },
];

const categories = [
  { id: "all",        label: "All Amenities" },
  { id: "academic",   label: "Academic & Labs" },
  { id: "media",      label: "Performance & Media" },
  { id: "recreation", label: "Recreation" },
];

// Shared bookings store
const bookings = [
  { id: 1, facility: "Auditorium",     purpose: "Annual Research Colloquium Keynote",    status: "APPROVED", date: "2026-10-24", time: "09:00 – 12:00", attendees: 150, requirements: "Stage setup, wireless microphones, slide clicker", requester: "Dr. Sarah Jenkins", requesterRole: "Dept. Chair",      facilityId: "auditorium" },
  { id: 2, facility: "Podcast Studio", purpose: "Micro-Lecture Series Recording",        status: "PENDING",  date: "2026-10-25", time: "14:00 – 15:30", attendees: 4,   requirements: "High-quality audio interface, 2 condenser microphones", requester: "Prof. Alex Mercer",  requesterRole: "Media Studies",    facilityId: "podcast_studio" },
  { id: 3, facility: "Seminar Halls",  purpose: "Introduction to Quantum Physics Class", status: "APPROVED", date: "2026-10-26", time: "11:00 – 13:00", attendees: 25,  requirements: "Projector, whiteboard markers", requester: "Dr. Aris Thorne",   requesterRole: "Physics Professor", facilityId: "seminar_hall" },
  { id: 4, facility: "Classrooms",     purpose: "Makeup Class for Applied Machine Learning", status: "APPROVED", date: "2026-10-27", time: "10:00 – 12:00", attendees: 45,  requirements: "Projector, whiteboard, slide clicker", requester: "Prof. Alex Mercer",  requesterRole: "Computer Science", facilityId: "classroom" },
  { id: 5, facility: "Sports Facilities", purpose: "Inter-department Basketball Match",  status: "APPROVED", date: "2026-10-28", time: "17:00 – 19:30", attendees: 80,  requirements: "Scoreboard access, extra chairs", requester: "Dr. Sarah Jenkins", requesterRole: "Athletics Board", facilityId: "sports" },
  { id: 6, facility: "Classrooms",     purpose: "Student Club Brainstorming Session",     status: "CANCELLED", date: "2026-10-22", time: "15:00 – 17:00", attendees: 15,  requirements: "None", requester: "Prof. Alex Mercer",  requesterRole: "Club Advisor",    facilityId: "classroom" },
  { id: 7, facility: "Professional Classrooms", purpose: "Corporate Tech Seminar",       status: "REJECTED",  date: "2026-10-20", time: "09:00 – 13:00", attendees: 110, requirements: "Dual screen projector, premium audio", requester: "Dr. Aris Thorne",   requesterRole: "Physics Professor", facilityId: "prof_classroom" }
];

/* =========================================
   STATE
   ========================================= */
let activeCategory    = "all";
let selectedFacility  = null;
let currentRole       = null;         // "faculty" | "admin"
let facultyPage       = "amenities";  // "amenities" | "calendar" | "myBookings"
let myBookingsFilter  = "all";

/* =========================================
   DOM REFS
   ========================================= */
const mainNavbar       = document.getElementById("mainNavbar");
const navLinks         = document.getElementById("navLinks");
const navUserBadge     = document.getElementById("navUserBadge");
const logoutBtn        = document.getElementById("logoutBtn");

const loginView        = document.getElementById("loginView");
const facultyPortal    = document.getElementById("facultyPortal");
const adminPortal      = document.getElementById("adminPortal");

const btnFacultyLogin  = document.getElementById("btnFacultyLogin");
const btnAdminLogin    = document.getElementById("btnAdminLogin");

// Faculty pages
const pageFacultyAmenities  = document.getElementById("pageFacultyAmenities");
const pageFacultyCalendar   = document.getElementById("pageFacultyCalendar");
const pageFacultyMyBookings = document.getElementById("pageFacultyMyBookings");

// Faculty containers
const filtersContainer  = document.getElementById("categoryFilters");
const gridContainer     = document.getElementById("facilitiesGrid");
const recentList        = document.getElementById("recentBookingsList");

// Admin
const adminPendingList  = document.getElementById("adminPendingList");
const adminAllList      = document.getElementById("adminAllList");

// Modal
const bookingModal = document.getElementById("bookingModal");
const closeModalBtn = document.getElementById("closeModal");
const bookingForm   = document.getElementById("bookingForm");

/* =========================================
   LOGIN GATE
   ========================================= */
btnFacultyLogin.addEventListener("click", () => login("faculty"));
btnAdminLogin.addEventListener("click",   () => login("admin"));

function login(role) {
  currentRole = role;
  loginView.classList.add("hidden");
  mainNavbar.classList.remove("hidden");

  if (role === "faculty") {
    facultyPortal.classList.remove("hidden");
    adminPortal.classList.add("hidden");
    setFacultyNav();
    renderFilters();
    renderGrid();
    renderRecentBookings();
  } else {
    adminPortal.classList.remove("hidden");
    facultyPortal.classList.add("hidden");
    setAdminNav();
    renderAdminDashboard();
  }
  lucide.createIcons();
}

logoutBtn.addEventListener("click", () => {
  currentRole = null;
  mainNavbar.classList.add("hidden");
  facultyPortal.classList.add("hidden");
  adminPortal.classList.add("hidden");
  loginView.classList.remove("hidden");
  lucide.createIcons();
});

/* =========================================
   NAVBAR BUILDERS
   ========================================= */
function setFacultyNav() {
  navUserBadge.innerHTML = `<i data-lucide="user" style="width:14px;height:14px;"></i> <span>Faculty Portal</span>`;
  navLinks.innerHTML = `
    <a href="#" class="${facultyPage === 'amenities'   ? 'active' : ''}" data-page="amenities">Amenities</a>
    <a href="#" class="${facultyPage === 'calendar'    ? 'active' : ''}" data-page="calendar">Calendar</a>
    <a href="#" class="${facultyPage === 'myBookings'  ? 'active' : ''}" data-page="myBookings">My Bookings</a>
  `;
  navLinks.querySelectorAll("a[data-page]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      switchFacultyPage(a.dataset.page);
    });
  });
  lucide.createIcons();
}

function setAdminNav() {
  navUserBadge.innerHTML = `<i data-lucide="shield" style="width:14px;height:14px;"></i> <span>Admin Console</span>`;
  navLinks.innerHTML = `<a href="#" class="active">Approval Queue</a>`;
  lucide.createIcons();
}

/* =========================================
   FACULTY PAGE SWITCHER
   ========================================= */
function switchFacultyPage(page) {
  facultyPage = page;
  pageFacultyAmenities.classList.toggle("hidden",  page !== "amenities");
  pageFacultyCalendar.classList.toggle("hidden",   page !== "calendar");
  pageFacultyMyBookings.classList.toggle("hidden", page !== "myBookings");

  if (page === "calendar")   renderCalendar();
  if (page === "myBookings") renderMyBookings();

  // Update nav active state
  navLinks.querySelectorAll("a[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
  lucide.createIcons();
}

/* =========================================
   FACULTY: CATEGORY FILTERS
   ========================================= */
function renderFilters() {
  filtersContainer.innerHTML = categories.map(c => `
    <button class="filter-btn ${activeCategory === c.id ? 'active' : ''}" data-id="${c.id}">
      ${c.label}
    </button>
  `).join("");
  filtersContainer.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.id;
      renderFilters();
      renderGrid();
    });
  });
}

/* =========================================
   FACULTY: AMENITIES GRID
   ========================================= */
function renderGrid() {
  const list = activeCategory === "all"
    ? facilities
    : facilities.filter(f => f.category === activeCategory);

  if (!list.length) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--text-muted);">No facilities found.</div>`;
    return;
  }

  gridContainer.innerHTML = list.map((f, i) => `
    <div class="card animate-slide-up" style="animation-delay:${i * 0.05}s">
      <div class="card-image">
        <div class="status-badge ${f.available ? 'available' : 'reserved'}">
          <div class="status-dot ${f.available ? 'available' : 'reserved'}"></div>
          ${f.available ? 'Available' : 'Reserved'}
        </div>
        <div class="card-icon"><i data-lucide="${f.icon}"></i></div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${f.label}</h3>
        <p class="card-desc">${f.desc}</p>
        <div class="card-footer">
          <div class="capacity">
            <i data-lucide="users" style="width:14px;height:14px;"></i>
            ${f.capacity === "Open Space" ? f.capacity : f.capacity + " Seats"}
          </div>
          <button class="btn btn-primary btn-reserve" data-id="${f.id}" style="width:100%;">
            Reserve Space <i data-lucide="chevron-right" style="width:16px;"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  gridContainer.querySelectorAll(".btn-reserve").forEach(btn => {
    btn.addEventListener("click", () => openBookingModal(btn.dataset.id));
  });
  lucide.createIcons();
}

/* =========================================
   FACULTY: RECENT BOOKINGS (below grid)
   ========================================= */
function renderRecentBookings() {
  const recent = [...bookings].slice(0, 3);
  if (!recent.length) {
    recentList.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:2rem;">No recent bookings yet.</p>`;
    return;
  }
  recentList.innerHTML = recent.map(b => `
    <div class="recent-card">
      <div class="recent-left">
        <div class="recent-facility">${b.facility}</div>
        <div class="recent-purpose">${b.purpose}</div>
        <div class="recent-meta">
          <span><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${formatDate(b.date)}</span>
          <span><i data-lucide="clock" style="width:12px;height:12px;"></i> ${b.time}</span>
          <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${b.attendees} Ppl</span>
        </div>
      </div>
      <div class="feed-status ${b.status.toLowerCase()}">${b.status}</div>
    </div>
  `).join("");
  lucide.createIcons();
}

/* =========================================
   FACULTY: CALENDAR PAGE
   ========================================= */
function renderCalendar() {
  const calContainer = document.getElementById("calendarContainer");
  const approved = bookings.filter(b => b.status === "APPROVED" || b.status === "PENDING");

  if (!approved.length) {
    calContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:3rem;">No bookings on your calendar yet.</p>`;
    return;
  }

  // Group by date
  const grouped = {};
  approved.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = [];
    grouped[b.date].push(b);
  });

  const sortedDates = Object.keys(grouped).sort();

  calContainer.innerHTML = sortedDates.map(date => `
    <div class="cal-day-group">
      <div class="cal-day-label">${formatDateFull(date)}</div>
      <div class="cal-events">
        ${grouped[date].map(b => `
          <div class="cal-event ${b.status.toLowerCase()}">
            <div class="cal-event-time">${b.time}</div>
            <div class="cal-event-body">
              <div class="cal-event-title">${b.facility}</div>
              <div class="cal-event-purpose">${b.purpose}</div>
            </div>
            <div class="feed-status ${b.status.toLowerCase()}">${b.status}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
  lucide.createIcons();
}

/* =========================================
   FACULTY: MY BOOKINGS PAGE
   ========================================= */
function renderMyBookings() {
  const container = document.getElementById("myBookingsList");

  // Filter buttons
  document.querySelectorAll(".my-bookings-filters .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      myBookingsFilter = btn.dataset.status;
      document.querySelectorAll(".my-bookings-filters .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderMyBookings();
    });
  });

  const filtered = myBookingsFilter === "all"
    ? bookings
    : bookings.filter(b => b.status === myBookingsFilter);

  if (!filtered.length) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:3rem;">No bookings found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(b => `
    <div class="my-booking-card">
      <div class="my-booking-left">
        <div class="my-booking-facility">${b.facility}</div>
        <div class="my-booking-purpose">${b.purpose}</div>
        <div class="my-booking-meta">
          <span><i data-lucide="calendar" style="width:13px;height:13px;"></i> ${formatDate(b.date)}</span>
          <span><i data-lucide="clock" style="width:13px;height:13px;"></i> ${b.time}</span>
          <span><i data-lucide="users" style="width:13px;height:13px;"></i> ${b.attendees} Attendees</span>
        </div>
        ${b.requirements ? `
        <div class="my-booking-requirements" style="font-size:0.78rem;color:var(--text-muted);margin-top:0.6rem;display:flex;align-items:center;gap:0.35rem;">
          <i data-lucide="sliders" style="width:13px;height:13px;color:var(--primary);"></i>
          <span><strong>Requirements:</strong> ${b.requirements}</span>
        </div>` : ''}
      </div>
      <div class="my-booking-status-col">
        <div class="feed-status ${b.status.toLowerCase()}">${b.status}</div>
        ${b.status === "APPROVED" ? `<div class="my-booking-note"><i data-lucide="check-circle" style="width:12px;height:12px;color:var(--success);"></i> Confirmed by Admin</div>` : ""}
        ${b.status === "REJECTED" ? `<div class="my-booking-note" style="color:#ef4444;"><i data-lucide="x-circle" style="width:12px;height:12px;"></i> Request Declined</div>` : ""}
        ${b.status === "PENDING"  ? `<div class="my-booking-note"><i data-lucide="clock" style="width:12px;height:12px;color:var(--warning);"></i> Awaiting Review</div>` : ""}
      </div>
    </div>
  `).join("");
  lucide.createIcons();
}

/* =========================================
   BOOKING MODAL
   ========================================= */
function openBookingModal(facilityId) {
  selectedFacility = facilities.find(f => f.id === facilityId);
  if (!selectedFacility) return;

  document.getElementById("modalFacilityTitle").innerText = selectedFacility.label;
  document.getElementById("modalFacilityCapacity").innerHTML = `
    <i data-lucide="users" style="width:14px;height:14px;"></i>
    Capacity: ${selectedFacility.capacity === "Open Space" ? selectedFacility.capacity : selectedFacility.capacity + " Seats"}
  `;

  initDateSelector();
  bookingModal.classList.add("active");
  bookingForm.reset();
  lucide.createIcons();
}

function closeModal() {
  bookingModal.classList.remove("active");
  selectedFacility = null;
}

closeModalBtn.addEventListener("click", closeModal);
bookingModal.addEventListener("click", e => { if (e.target === bookingModal) closeModal(); });

function initDateSelector() {
  const selector = document.getElementById("dateSelector");
  const hidden   = document.getElementById("selectedDate");
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today  = new Date();
  let html = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    html += `
      <div class="date-card ${i === 0 ? 'active' : ''}" data-val="${iso}">
        <div class="date-card-day">${DAYS[d.getDay()]}</div>
        <div class="date-card-num">${d.getDate()}</div>
        <div class="date-card-month">${MONTHS[d.getMonth()]}</div>
      </div>`;
    if (i === 0) hidden.value = iso;
  }

  selector.innerHTML = html;
  selector.querySelectorAll(".date-card").forEach(card => {
    card.addEventListener("click", () => {
      selector.querySelectorAll(".date-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      hidden.value = card.dataset.val;
    });
  });
}

bookingForm.addEventListener("submit", e => {
  e.preventDefault();
  if (!selectedFacility) return;

  const date     = document.getElementById("selectedDate").value;
  const start    = document.getElementById("startTime").value;
  const end      = document.getElementById("endTime").value;
  const purpose  = document.getElementById("bookingPurpose").value;
  const count    = parseInt(document.getElementById("attendeeCount").value);
  const requirements = document.getElementById("bookingRequirements").value.trim();
  
  const newBooking = {
    id: bookings.length + 1,
    facility:      selectedFacility.label,
    facilityId:    selectedFacility.id,
    purpose,
    status:        "PENDING",
    date,
    time:          `${start} – ${end}`,
    attendees:     count,
    requirements:  requirements || null,
    requester:     "Faculty User",
    requesterRole: "Faculty",
  };

  bookings.unshift(newBooking);

  // Refresh visible panels
  renderRecentBookings();
  if (facultyPage === "calendar")   renderCalendar();
  if (facultyPage === "myBookings") renderMyBookings();

  closeModal();
  showToast(`Booking request sent for ${selectedFacility.label}!`);
});

/* =========================================
   ADMIN: APPROVAL DASHBOARD
   ========================================= */
function renderAdminDashboard() {
  const pending  = bookings.filter(b => b.status === "PENDING");
  const approved = bookings.filter(b => b.status === "APPROVED");
  const rejected = bookings.filter(b => b.status === "REJECTED");

  document.getElementById("adminStatPending").innerText  = pending.length;
  document.getElementById("adminStatApproved").innerText = approved.length;
  document.getElementById("adminStatRejected").innerText = rejected.length;

  // Pending Queue
  if (!pending.length) {
    adminPendingList.innerHTML = `
      <tr><td colspan="6" class="empty-row">
        <i data-lucide="inbox" style="width:24px;height:24px;opacity:0.4;"></i>
        <div>No pending requests — all clear!</div>
      </td></tr>`;
  } else {
    adminPendingList.innerHTML = pending.map(b => `
      <tr>
        <td>
          <div class="requester-name">${b.requester}</div>
          <div class="requester-role">${b.requesterRole}</div>
        </td>
        <td style="font-weight:700;">${b.facility}</td>
        <td>
          <div style="font-weight:600;">${b.purpose}</div>
          ${b.requirements ? `
          <div style="font-size:0.75rem;color:var(--primary);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
            <i data-lucide="sliders" style="width:11px;height:11px;"></i>
            <span><strong>Req:</strong> ${b.requirements}</span>
          </div>` : ""}
        </td>
        <td>
          <div style="font-weight:600;">${formatDate(b.date)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${b.time}</div>
        </td>
        <td style="font-weight:600;">${b.attendees}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-approve btn-action" data-id="${b.id}" title="Approve">
              <i data-lucide="check" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-reject btn-action" data-id="${b.id}" title="Reject">
              <i data-lucide="x" style="width:18px;height:18px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    adminPendingList.querySelectorAll(".btn-approve").forEach(btn => {
      btn.addEventListener("click", () => updateStatus(parseInt(btn.dataset.id), "APPROVED"));
    });
    adminPendingList.querySelectorAll(".btn-reject").forEach(btn => {
      btn.addEventListener("click", () => updateStatus(parseInt(btn.dataset.id), "REJECTED"));
    });
  }

  adminAllList.innerHTML = bookings.map(b => `
    <tr>
      <td>
        <div class="requester-name">${b.requester}</div>
        <div class="requester-role">${b.requesterRole}</div>
      </td>
      <td style="font-weight:700;">${b.facility}</td>
      <td>
        <div style="font-weight:600;">${b.purpose}</div>
        ${b.requirements ? `
        <div style="font-size:0.75rem;color:var(--primary);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
          <i data-lucide="sliders" style="width:11px;height:11px;"></i>
          <span><strong>Req:</strong> ${b.requirements}</span>
        </div>` : ""}
      </td>
      <td>
        <div style="font-weight:600;">${formatDate(b.date)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${b.time}</div>
      </td>
      <td><div class="feed-status ${b.status.toLowerCase()}">${b.status}</div></td>
    </tr>
  `).join("");

  renderUpcomingBookings();
  renderUtilizationReports();
  renderPeakUsageTimings();
  renderMostBookedFacilities();
  renderCancellationReports();

  lucide.createIcons();
}

function renderUpcomingBookings() {
  const upcomingList = document.getElementById("adminUpcomingList");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = bookings
    .filter(b => b.status === "APPROVED" && new Date(b.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!upcoming.length) {
    upcomingList.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.5rem;">No upcoming approved bookings.</p>`;
    return;
  }

  upcomingList.innerHTML = upcoming.map(b => `
    <div class="upcoming-card">
      <div class="upcoming-main-info">
        <div class="upcoming-facility">${b.facility}</div>
        <div class="upcoming-purpose">${b.purpose}</div>
      </div>
      <div class="upcoming-meta">
        <div class="upcoming-datetime">
          <div>${formatDate(b.date)}</div>
          <div class="upcoming-time">${b.time}</div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderUtilizationReports() {
  const utilizationList = document.getElementById("adminUtilizationList");
  const approvedBookings = bookings.filter(b => b.status === "APPROVED");
  
  const facilityCounts = {};
  facilities.forEach(f => {
    facilityCounts[f.label] = 0;
  });

  approvedBookings.forEach(b => {
    if (facilityCounts[b.facility] !== undefined) {
      facilityCounts[b.facility]++;
    }
  });

  const items = Object.entries(facilityCounts)
    .map(([name, count]) => {
      const rate = Math.min(Math.round((count / 4) * 100), 100) || 15;
      return { name, rate };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  utilizationList.innerHTML = items.map(item => `
    <div class="leaderboard-item">
      <div class="leaderboard-info">
        <span class="leaderboard-name">${item.name}</span>
        <span class="leaderboard-count">${item.rate}% Utilized</span>
      </div>
      <div class="leaderboard-bar-bg">
        <div class="leaderboard-bar-fill" style="width: ${item.rate}%; background: linear-gradient(90deg, var(--success) 0%, #10b981 100%);"></div>
      </div>
    </div>
  `).join("");
}

function renderPeakUsageTimings() {
  const peakContainer = document.getElementById("adminPeakTimings");
  const approved = bookings.filter(b => b.status === "APPROVED");

  let morning = 0;
  let afternoon = 0;
  let evening = 0;

  approved.forEach(b => {
    const startHour = parseInt(b.time.split(":")[0]);
    if (startHour < 12) {
      morning++;
    } else if (startHour < 16) {
      afternoon++;
    } else {
      evening++;
    }
  });

  const total = morning + afternoon + evening || 1;
  const morningPct = Math.round((morning / total) * 100) || 30;
  const afternoonPct = Math.round((afternoon / total) * 100) || 50;
  const eveningPct = Math.round((evening / total) * 100) || 20;

  const maxPct = Math.max(morningPct, afternoonPct, eveningPct);

  const data = [
    { label: "Morning (8AM-12PM)", pct: morningPct, isActive: morningPct === maxPct },
    { label: "Afternoon (12PM-4PM)", pct: afternoonPct, isActive: afternoonPct === maxPct },
    { label: "Evening (4PM-8PM)", pct: eveningPct, isActive: eveningPct === maxPct }
  ];

  peakContainer.innerHTML = data.map(d => `
    <div class="peak-time-row">
      <div class="peak-time-label" style="font-size:0.72rem;">${d.label}</div>
      <div class="peak-time-bar-container ${d.isActive ? 'active' : ''}">
        <div class="peak-time-bar-fill" style="width: ${d.pct}%;"></div>
        <span class="peak-time-percentage">${d.pct}%</span>
      </div>
    </div>
  `).join("");
}

function renderMostBookedFacilities() {
  const leaderboardList = document.getElementById("adminLeaderboard");

  const counts = {};
  bookings.filter(b => b.status === "APPROVED").forEach(b => {
    counts[b.facility] = (counts[b.facility] || 0) + 1;
  });

  facilities.forEach(f => {
    if (!counts[f.label]) {
      counts[f.label] = f.label === "Classrooms" ? 2 : f.label === "Seminar Halls" ? 1 : 0;
    }
  });

  const sorted = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const maxCount = sorted[0]?.count || 1;

  leaderboardList.innerHTML = sorted.map(item => {
    const width = Math.round((item.count / maxCount) * 100) || 10;
    return `
      <div class="leaderboard-item">
        <div class="leaderboard-info">
          <span class="leaderboard-name">${item.name}</span>
          <span class="leaderboard-count">${item.count} Bookings</span>
        </div>
        <div class="leaderboard-bar-bg">
          <div class="leaderboard-bar-fill" style="width: ${width}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCancellationReports() {
  const cancellationSummary = document.getElementById("adminCancellationSummary");
  const cancelled = bookings.filter(b => b.status === "CANCELLED" || b.status === "REJECTED");

  if (!cancelled.length) {
    cancellationSummary.innerHTML = `
      <div class="cancellation-log-card" style="border-color:var(--surface-border);background:transparent;padding:1.5rem;">
        <div class="cancellation-log-body" style="text-align:center;color:var(--text-muted);font-weight:500;">No cancellations recorded.</div>
      </div>`;
    return;
  }

  cancellationSummary.innerHTML = cancelled.slice(0, 3).map(b => `
    <div class="cancellation-log-card" style="margin-bottom:0.75rem;">
      <div class="cancellation-log-header">
        <span>${b.facility}</span>
        <span style="font-size:0.65rem;text-transform:uppercase;padding:0.15rem 0.4rem;border-radius:50px;font-weight:700;letter-spacing:0.5px;
          background:${b.status === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)'};
          color:${b.status === 'REJECTED' ? '#ef4444' : 'var(--text-muted)'};">${b.status}</span>
      </div>
      <div class="cancellation-log-body">
        Requested by <strong>${b.requester}</strong> for ${formatDate(b.date)} (${b.time}).
        <div style="color:var(--text-muted);font-style:italic;margin-top:0.25rem;">
          Reason: ${b.status === 'REJECTED' ? 'Declined by Admin' : 'Cancelled by Faculty'}
        </div>
      </div>
    </div>
  `).join("");
}

function updateStatus(id, status) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  b.status = status;
  renderAdminDashboard();
  showToast(`${b.facility} booking ${status.toLowerCase()}!`);
}

/* =========================================
   TOAST
   ========================================= */
function showToast(msg) {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.style.cssText = "position:fixed;bottom:2rem;right:2rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;";
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  t.style.cssText = `background:#0f172a;color:#fff;padding:.85rem 1.4rem;border-radius:14px;
    box-shadow:0 8px 24px rgba(0,0,0,.15);display:flex;align-items:center;gap:.6rem;
    font-size:.83rem;font-weight:600;border:1px solid rgba(255,255,255,.08);
    transform:translateY(16px);opacity:0;transition:all .3s ease;`;
  t.innerHTML = `<i data-lucide="check-circle" style="color:#10b981;width:15px;height:15px;"></i><span>${msg}</span>`;
  wrap.appendChild(t);
  lucide.createIcons();
  setTimeout(() => { t.style.transform = "translateY(0)"; t.style.opacity = "1"; }, 30);
  setTimeout(() => {
    t.style.transform = "translateY(16px)"; t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/* =========================================
   HELPERS
   ========================================= */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateFull(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/* =========================================
   INIT
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
});
