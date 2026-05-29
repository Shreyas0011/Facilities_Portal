// Data
const facilities = [
  { id: "classroom", label: "Classrooms", icon: "book-open", capacity: "50", available: true, category: "academic", desc: "Standard academic classrooms fully equipped with marker boards and audio assistance." },
  { id: "professional_classroom", label: "Professional Classrooms", icon: "graduation-cap", capacity: "100", available: true, category: "academic", desc: "Smart lecture halls with tier seating, dual screen projectors, and collaborative learning setups." },
  { id: "seminar_hall", label: "Seminar Halls", icon: "calendar-days", capacity: "300", available: false, category: "academic", desc: "Tiered seating halls with podium mic arrays and presentation screens, ideal for guest talks." },
  { id: "theatre", label: "Theatre", icon: "clapperboard", capacity: "100", available: true, category: "media", desc: "Sleek black-box theatre with custom acoustics, stage lighting systems, and dynamic seating." },
  { id: "auditorium", label: "Auditoriums", icon: "mic-2", capacity: "500", available: false, category: "media", desc: "Grand auditorium with 500-seat capacity, standard stage layout, and surround PA system." },
  { id: "lab", label: "Labs", icon: "flask-conical", capacity: "45", available: true, category: "academic", desc: "Fully operational laboratories for science, computer systems, and physics experimentation." },
  { id: "sports_facility", label: "Sports Facilities", icon: "dumbbell", capacity: "Open Space", available: true, category: "recreation", desc: "Indoor badminton/basketball courts and outdoor turf access for sports clubs and recreation." },
  { id: "music_dance_room", label: "Music / Dance Rooms", icon: "music", capacity: "30", available: false, category: "media", desc: "Soundproofed practice rooms with mirror panels and pre-installed instruments." },
  { id: "podcast_studio", label: "Podcast Studio", icon: "radio", capacity: "8", available: true, category: "media", desc: "Professional multi-microphone podcast booth with acoustic foam padding and sound mixers." },
];

const categories = [
  { id: "all", label: "All Amenities" },
  { id: "academic", label: "Academic & Labs" },
  { id: "media", label: "Performances & Media" },
  { id: "recreation", label: "Recreation & Support" },
];

const bookings = [
  { id: 1, facility: "Main Auditorium", purpose: "Annual Research Colloquium Keynote", status: "APPROVED", date: "Oct 24, 2026", time: "09:00 – 12:00", attendees: 150, requester: "Dr. Sarah Jenkins", requesterRole: "Dept. Chair" },
  { id: 2, facility: "Podcast Studio", purpose: "Micro-Lecture Series Recording", status: "PENDING", date: "Oct 25, 2026", time: "14:00 – 15:30", attendees: 4, requester: "Prof. Alex Mercer", requesterRole: "Media Studies" },
  { id: 3, facility: "Lecture Hall 101", purpose: "Introduction to Quantum Physics Class", status: "APPROVED", date: "Oct 23, 2026", time: "11:00 – 13:00", attendees: 25, requester: "Dr. Aris Thorne", requesterRole: "Physics Professor" },
];

let activeCategory = "all";
let selectedFacilityId = null;
let currentView = "login"; // "login", "faculty", or "admin"
let activeRole = "faculty"; // "faculty" or "admin" (tab switcher state)

// Elements
const filtersContainer = document.getElementById("categoryFilters");
const gridContainer = document.getElementById("facilitiesGrid");
const feedContainer = document.getElementById("feedList");
const bookingModal = document.getElementById("bookingModal");
const closeModalBtn = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");

// Adaptive Portal Elements
const mainNavbar = document.getElementById("mainNavbar");
const navLinks = document.getElementById("navLinks");
const navUserBadge = document.getElementById("navUserBadge");
const logoutBtn = document.getElementById("logoutBtn");

const loginView = document.getElementById("loginView");
const facultyView = document.getElementById("facultyView");
const adminView = document.getElementById("adminView");
const activityFeedSection = document.getElementById("activityFeedSection");

const tabFaculty = document.getElementById("tabFaculty");
const tabAdmin = document.getElementById("tabAdmin");
const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const adminPendingListEl = document.getElementById("adminPendingList");

/* =========================================
   AUTHENTICATION & PORTAL GATEWAY GATE
   ========================================= */
tabFaculty.addEventListener("click", () => {
  tabFaculty.classList.add("active");
  tabAdmin.classList.remove("active");
  loginEmailInput.value = "faculty@campus.edu";
  activeRole = "faculty";
});

tabAdmin.addEventListener("click", () => {
  tabAdmin.classList.add("active");
  tabFaculty.classList.remove("active");
  loginEmailInput.value = "admin@campus.edu";
  activeRole = "admin";
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  // Set current view
  currentView = activeRole;
  
  // Hide login gate
  loginView.classList.add("hidden");
  
  // Show Main Navigation Bar
  mainNavbar.classList.remove("hidden");
  
  // Show bottom activity feed
  activityFeedSection.classList.remove("hidden");

  // Render role layout
  if (currentView === "faculty") {
    facultyView.classList.remove("hidden");
    adminView.classList.add("hidden");
    
    // Set navbar profile
    navUserBadge.innerHTML = `
      <i data-lucide="user"></i>
      <span>Dr. Sarah Jenkins</span>
    `;
    
    // Set navbar tabs
    navLinks.innerHTML = `
      <a href="#" class="active"><i data-lucide="layout-grid" style="width:14px; margin-right:4px;"></i> Amenities</a>
      <a href="#"><i data-lucide="calendar" style="width:14px; margin-right:4px;"></i> Schedule</a>
    `;
    
    renderGrid();
  } else if (currentView === "admin") {
    adminView.classList.remove("hidden");
    facultyView.classList.add("hidden");
    
    // Set navbar profile
    navUserBadge.innerHTML = `
      <i data-lucide="shield"></i>
      <span>Admin Console</span>
    `;
    
    // Set navbar tabs
    navLinks.innerHTML = `
      <a href="#" class="active"><i data-lucide="bar-chart-3" style="width:14px; margin-right:4px;"></i> Dashboard</a>
      <a href="#"><i data-lucide="settings" style="width:14px; margin-right:4px;"></i> Settings</a>
    `;
    
    renderAdminDashboard();
  }
  
  renderFeed();
  showToast(`Successfully logged in as ${currentView.toUpperCase()}`);
  lucide.createIcons();
});

logoutBtn.addEventListener("click", () => {
  // Reset states
  currentView = "login";
  
  // Hide views
  mainNavbar.classList.add("hidden");
  facultyView.classList.add("hidden");
  adminView.classList.add("hidden");
  activityFeedSection.classList.add("hidden");
  
  // Show login gate
  loginView.classList.remove("hidden");
  
  showToast("Logged out successfully");
  lucide.createIcons();
});

function renderFilters() {
  filtersContainer.innerHTML = categories.map(cat => `
    <button class="filter-btn ${activeCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">
      ${cat.label}
    </button>
  `).join("");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      activeCategory = e.currentTarget.dataset.id;
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const filtered = activeCategory === "all" ? facilities : facilities.filter(f => f.category === activeCategory);
  
  if (filtered.length === 0) {
    gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">No facilities found.</div>`;
    return;
  }

  gridContainer.innerHTML = filtered.map((fac, idx) => `
    <div class="card animate-slide-up" style="animation-delay: ${idx * 0.05}s">
      <div class="card-image">
        <div class="status-badge ${fac.available ? 'available' : 'reserved'}">
          <div class="status-dot ${fac.available ? 'available' : 'reserved'}"></div>
          ${fac.available ? 'Available' : 'Reserved'}
        </div>
        <div class="card-icon">
          <i data-lucide="${fac.icon}"></i>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${fac.label}</h3>
        <p class="card-desc">${fac.desc}</p>
        <div class="card-footer">
          <div class="capacity">
            <i data-lucide="users" style="width: 14px; height: 14px;"></i>
            ${fac.capacity === "Open Space" ? fac.capacity : fac.capacity + " Seats"}
          </div>
          <button class="btn btn-primary btn-reserve" data-id="${fac.id}" style="width: 100%;">
            Reserve Space <i data-lucide="chevron-right" style="width: 16px;"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  // Attach event listeners to Reserve buttons
  document.querySelectorAll(".btn-reserve").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const facilityId = e.currentTarget.dataset.id;
      openBookingModal(facilityId);
    });
  });

  lucide.createIcons();
}

function renderFeed() {
  feedContainer.innerHTML = bookings.map((b, idx) => `
    <div class="feed-item animate-slide-up" style="animation-delay: ${idx * 0.1}s">
      <div class="feed-icon">
        <i data-lucide="calendar"></i>
      </div>
      <div class="feed-content">
        <div class="feed-top">
          <div class="feed-title">${b.facility}</div>
          <div class="feed-status ${b.status.toLowerCase()}">${b.status}</div>
        </div>
        <div class="feed-desc">${b.purpose}</div>
        <div class="feed-meta">
          <span><i data-lucide="calendar" style="width:14px; height:14px;"></i> ${b.date}</span>
          <span><i data-lucide="clock" style="width:14px; height:14px;"></i> ${b.time}</span>
          <span><i data-lucide="users" style="width:14px; height:14px;"></i> ${b.attendees} Ppl</span>
        </div>
      </div>
    </div>
  `).join("");
  
  lucide.createIcons();
}

// District App Style Date Generator (Upcoming 7 days)
function initDateSelector() {
  const selector = document.getElementById("dateSelector");
  const dateInput = document.getElementById("selectedDate");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  let html = "";
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + i);
    
    const dayName = days[futureDate.getDay()];
    const dateNum = futureDate.getDate();
    const monthName = months[futureDate.getMonth()];
    const ISOString = futureDate.toISOString().split("T")[0];
    
    html += `
      <div class="date-card ${i === 0 ? 'active' : ''}" data-val="${ISOString}">
        <div class="date-card-day">${dayName}</div>
        <div class="date-card-num">${dateNum}</div>
        <div class="date-card-month">${monthName}</div>
      </div>
    `;
    
    if (i === 0) {
      dateInput.value = ISOString;
    }
  }
  
  selector.innerHTML = html;
  
  // Date selection cards interaction
  document.querySelectorAll(".date-card").forEach(card => {
    card.addEventListener("click", (e) => {
      document.querySelectorAll(".date-card").forEach(c => c.classList.remove("active"));
      const clickedCard = e.currentTarget;
      clickedCard.classList.add("active");
      dateInput.value = clickedCard.dataset.val;
    });
  });
}

function openBookingModal(facilityId) {
  selectedFacilityId = facilityId;
  const fac = facilities.find(f => f.id === facilityId);
  if (!fac) return;

  document.getElementById("modalFacilityTitle").innerText = fac.label;
  document.getElementById("modalFacilityCapacity").innerHTML = `
    <i data-lucide="users" style="width: 14px; height: 14px;"></i> Capacity: ${fac.capacity === "Open Space" ? fac.capacity : fac.capacity + " Seats"}
  `;
  
  // Initialize dynamic components
  initDateSelector();
  
  // Open dialog with smooth fade in
  bookingModal.classList.add("active");
  lucide.createIcons();
}

function closeBookingModal() {
  bookingModal.classList.remove("active");
  selectedFacilityId = null;
}

// Form Submission & simulated approval dispatch
bookingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const fac = facilities.find(f => f.id === selectedFacilityId);
  if (!fac) return;

  const rawDate = document.getElementById("selectedDate").value;
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const purpose = document.getElementById("bookingPurpose").value;
  const attendees = document.getElementById("attendeeCount").value;

  // Append new simulated booking as PENDING approval
  const newBooking = {
    id: bookings.length + 1,
    facility: fac.label,
    purpose: purpose,
    status: "PENDING",
    date: formattedDate,
    time: `${startTime} – ${endTime}`,
    attendees: parseInt(attendees),
    requester: "Dr. Sarah Jenkins",
    requesterRole: "Dept. Chair"
  };

  bookings.unshift(newBooking); // Add to the top of feed
  
  // Rerender layout
  renderFeed();
  closeBookingModal();
  
  // Premium toast notification simulation
  showToast(`Approval sent for ${fac.label}!`);
});

// Admin Dashboard Renderer
function renderAdminDashboard() {
  const pendingList = bookings.filter(b => b.status === "PENDING");
  const approvedList = bookings.filter(b => b.status === "APPROVED");
  const rejectedList = bookings.filter(b => b.status === "REJECTED");
  
  // Calculate dynamic stats
  const totalRequests = bookings.length;
  
  // Utilization rate: simulated occupancy based on approved bookings capacity
  const utilizationPercentage = totalRequests > 0 
    ? Math.min(95, Math.round((approvedList.length / (approvedList.length + pendingList.length + 1)) * 30 + 55))
    : 0;
  
  // Cancellation rate
  const cancellationPercentage = totalRequests > 0
    ? Math.round((rejectedList.length / totalRequests) * 100)
    : 0;

  // Update statistic cards
  document.getElementById("utilizationRate").innerText = `${utilizationPercentage}%`;
  document.getElementById("cancellationRate").innerText = `${cancellationPercentage}%`;
  
  // 1. Render Pending Approvals Queue
  if (pendingList.length === 0) {
    adminPendingListEl.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem; font-weight: 500;">
          <i data-lucide="inbox" style="width: 28px; height: 28px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>No pending reservation requests</div>
        </td>
      </tr>
    `;
  } else {
    adminPendingListEl.innerHTML = pendingList.map(b => `
      <tr>
        <td>
          <div class="requester-name">${b.requester}</div>
          <div class="requester-role">${b.requesterRole}</div>
        </td>
        <td style="font-weight: 700; color: var(--text-main);">${b.facility}</td>
        <td>${b.purpose}</td>
        <td style="font-weight: 600;">${b.attendees} Ppl</td>
        <td>
          <div class="actions-cell">
            <button class="btn-approve btn-action" data-id="${b.id}" title="Approve Request">
              <i data-lucide="check" style="width: 18px; height: 18px;"></i>
            </button>
            <button class="btn-reject btn-action" data-id="${b.id}" title="Reject Request">
              <i data-lucide="x" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    // Attach queue action listeners
    document.querySelectorAll(".btn-approve").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        updateBookingStatus(id, "APPROVED");
      });
    });

    document.querySelectorAll(".btn-reject").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        updateBookingStatus(id, "REJECTED");
      });
    });
  }

  // 2. Render Upcoming Bookings Operations Timeline
  const adminUpcomingList = document.getElementById("adminUpcomingList");
  if (approvedList.length === 0) {
    adminUpcomingList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-weight: 500;">
        <i data-lucide="calendar" style="width: 24px; height: 24px; margin-bottom: 0.5rem; opacity: 0.4;"></i>
        <div>No upcoming bookings scheduled</div>
      </div>
    `;
  } else {
    adminUpcomingList.innerHTML = approvedList.map(b => `
      <div class="upcoming-card">
        <div class="upcoming-main-info">
          <div class="upcoming-facility">${b.facility}</div>
          <div class="upcoming-purpose">${b.purpose}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 0.15rem;">
            Reserved by: ${b.requester} (${b.requesterRole})
          </div>
        </div>
        <div class="upcoming-meta">
          <div class="upcoming-datetime">
            <span>${b.date}</span>
            <span class="upcoming-time">${b.time}</span>
          </div>
          <i data-lucide="chevron-right" style="width: 16px; color: var(--text-muted);"></i>
        </div>
      </div>
    `).join("");
  }

  // 3. Render Most Booked Facilities (Leaderboard Index)
  // Calculate bookings per facility dynamically
  const facilityCounts = {};
  facilities.forEach(f => { facilityCounts[f.label] = 0; });
  
  // Seed with mock historical booking data + active bookings
  facilityCounts["Main Auditorium"] = 24;
  facilityCounts["Podcast Studio"] = 18;
  facilityCounts["Classrooms"] = 15;
  facilityCounts["Sports Facilities"] = 12;
  facilityCounts["Labs"] = 9;

  bookings.forEach(b => {
    if (facilityCounts[b.facility] !== undefined) {
      facilityCounts[b.facility]++;
    } else {
      // Map fuzzy labels to correct names if needed
      if (b.facility.includes("Auditorium")) facilityCounts["Main Auditorium"]++;
      else if (b.facility.includes("Studio")) facilityCounts["Podcast Studio"]++;
      else if (b.facility.includes("Classroom")) facilityCounts["Classrooms"]++;
      else if (b.facility.includes("Lab")) facilityCounts["Labs"]++;
    }
  });

  const sortedFacilities = Object.entries(facilityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5
  
  const maxBookings = sortedFacilities[0][1] || 1;
  const mostBookedList = document.getElementById("mostBookedList");
  
  mostBookedList.innerHTML = sortedFacilities.map(([name, count]) => {
    const percentage = Math.round((count / maxBookings) * 100);
    return `
      <div class="leaderboard-item">
        <div class="leaderboard-info">
          <span class="leaderboard-name">${name}</span>
          <span class="leaderboard-count">${count} bookings</span>
        </div>
        <div class="leaderboard-bar-bg">
          <div class="leaderboard-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join("");

  // 4. Render Peak Usage Timings Distribution
  // Timing slot distribution percentages (seeded + current)
  const timeSlots = [
    { slot: "08:00 – 10:00", weight: 35 },
    { slot: "10:00 – 13:00", weight: 85, active: true }, // Peak
    { slot: "13:00 – 15:00", weight: 50 },
    { slot: "15:00 – 18:00", weight: 65 }
  ];

  // Adjust peak timings indicator dynamically if bookings fall in peak slots
  const peakTimingsDistribution = document.getElementById("peakTimingsDistribution");
  peakTimingsDistribution.innerHTML = timeSlots.map(t => `
    <div class="peak-time-row">
      <span class="peak-time-label">${t.slot}</span>
      <div class="peak-time-bar-container ${t.active ? 'active' : ''}">
        <div class="peak-time-bar-fill" style="width: ${t.weight}%"></div>
        <span class="peak-time-percentage">${t.weight}% Load</span>
      </div>
    </div>
  `).join("");

  // Update dynamic Peak Timing text display in stat card
  const activeSlot = timeSlots.find(t => t.active);
  document.getElementById("peakTimingVal").innerText = activeSlot ? activeSlot.slot.replace("08:00", "8 AM").replace("10:00", "10 AM").replace("13:00", "1 PM").replace("15:00", "3 PM").replace("18:00", "6 PM") : "10 AM – 1 PM";

  // 5. Render Cancellation / Rejection Reports
  const cancellationLogs = document.getElementById("cancellationLogs");
  if (rejectedList.length === 0) {
    cancellationLogs.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-size: 0.85rem;">
        No booking rejections logged this cycle.
      </div>
    `;
  } else {
    cancellationLogs.innerHTML = rejectedList.map(b => `
      <div class="cancellation-log-card">
        <div class="cancellation-log-header">
          <span>${b.facility}</span>
          <span style="font-size:0.75rem; text-transform:uppercase;">Rejected</span>
        </div>
        <div class="cancellation-log-body">
          <strong>Requestor:</strong> ${b.requester} (${b.requesterRole})<br>
          <strong>Reason/Purpose:</strong> ${b.purpose}<br>
          <strong>Schedule:</strong> ${b.date} (${b.time})
        </div>
      </div>
    `).join("");
  }

  lucide.createIcons();
}

function updateBookingStatus(id, status) {
  const booking = bookings.find(b => b.id === id);
  if (booking) {
    booking.status = status;
    showToast(`Booking for ${booking.facility} has been ${status.toLowerCase()}!`);
    renderAdminDashboard();
    renderFeed(); // Rerender campus activity feed to sync
  }
}

// Toast system
function showToast(message) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: #0f172a;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,0.1);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s ease;
  `;
  toast.innerHTML = `<i data-lucide="check-circle" style="color:#10b981; width:16px;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  // trigger animation
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 50);

  // remove toast after 3 seconds
  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close events
closeModalBtn.addEventListener("click", closeBookingModal);
bookingModal.addEventListener("click", (e) => {
  if (e.target === bookingModal) {
    closeBookingModal();
  }
});

// Init
document.addEventListener("DOMContentLoaded", () => {
  renderFilters();
  renderGrid();
  renderFeed();
  lucide.createIcons();
});

