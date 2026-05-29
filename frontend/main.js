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
  { id: 1, facility: "Main Auditorium", purpose: "TEDx Campus Presentation Preparation", status: "APPROVED", date: "Oct 24, 2026", time: "09:00 – 12:00", attendees: 150, requester: "Sarah Jenkins", requesterRole: "Student Lead" },
  { id: 2, facility: "Podcast Studio", purpose: "Tech Talks Podcast Episode 4", status: "PENDING", date: "Oct 25, 2026", time: "14:00 – 15:30", attendees: 4, requester: "Alex Mercer", requesterRole: "AV Coordinator" },
  { id: 3, facility: "Lecture Hall 101", purpose: "Robotics Club Weekly Meet", status: "APPROVED", date: "Oct 23, 2026", time: "11:00 – 13:00", attendees: 25, requester: "Dr. Aris", requesterRole: "Faculty Sponsor" },
];

let activeCategory = "all";
let selectedFacilityId = null;
let currentView = "student";

// Elements
const filtersContainer = document.getElementById("categoryFilters");
const gridContainer = document.getElementById("facilitiesGrid");
const feedContainer = document.getElementById("feedList");
const bookingModal = document.getElementById("bookingModal");
const closeModalBtn = document.getElementById("closeModal");
const bookingForm = document.getElementById("bookingForm");
const viewToggleBtn = document.getElementById("viewToggleBtn");
const studentView = document.getElementById("studentView");
const adminView = document.getElementById("adminView");
const adminPendingListEl = document.getElementById("adminPendingList");

// View Toggle Handler
viewToggleBtn.addEventListener("click", () => {
  if (currentView === "student") {
    currentView = "admin";
    studentView.classList.add("hidden");
    adminView.classList.remove("hidden");
    viewToggleBtn.innerHTML = `<i data-lucide="user"></i> <span>Student View</span>`;
    renderAdminDashboard();
  } else {
    currentView = "student";
    adminView.classList.add("hidden");
    studentView.classList.remove("hidden");
    viewToggleBtn.innerHTML = `<i data-lucide="shield-check"></i> <span>Admin View</span>`;
  }
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
    requester: "You (Student)",
    requesterRole: "Student"
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
  
  // Update control stats
  document.getElementById("statTotal").innerText = bookings.length;
  document.getElementById("statPending").innerText = pendingList.length;
  document.getElementById("statApproved").innerText = approvedList.length;

  if (pendingList.length === 0) {
    adminPendingListEl.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3.5rem; font-weight: 500;">
          <i data-lucide="inbox" style="width: 28px; height: 28px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <div>No pending reservation requests</div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  adminPendingListEl.innerHTML = pendingList.map(b => `
    <tr>
      <td>
        <div class="requester-name">${b.requester}</div>
        <div class="requester-role">${b.requesterRole}</div>
      </td>
      <td style="font-weight: 700; color: var(--text-main);">${b.facility}</td>
      <td>${b.purpose}</td>
      <td>
        <div style="font-weight: 600;">${b.date}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">${b.time}</div>
      </td>
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

  // Attach action button event listeners
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

