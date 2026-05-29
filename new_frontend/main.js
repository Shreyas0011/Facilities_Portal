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
  { id: 1, facility: "Main Auditorium", purpose: "TEDx Campus Presentation Preparation", status: "APPROVED", date: "Oct 24, 2026", time: "09:00 – 12:00", attendees: 150 },
  { id: 2, facility: "Podcast Studio", purpose: "Tech Talks Podcast Episode 4", status: "PENDING", date: "Oct 25, 2026", time: "14:00 – 15:30", attendees: 4 },
  { id: 3, facility: "Lecture Hall 101", purpose: "Robotics Club Weekly Meet", status: "APPROVED", date: "Oct 23, 2026", time: "11:00 – 13:00", attendees: 25 },
];

let activeCategory = "all";

// Elements
const filtersContainer = document.getElementById("categoryFilters");
const gridContainer = document.getElementById("facilitiesGrid");
const feedContainer = document.getElementById("feedList");

function renderFilters() {
  filtersContainer.innerHTML = categories.map(cat => `
    <button class="filter-btn ${activeCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">
      ${cat.label}
    </button>
  `).join("");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      activeCategory = e.target.dataset.id;
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
          <button class="btn btn-primary" style="width: 100%;">Reserve Space <i data-lucide="chevron-right" style="width: 16px;"></i></button>
        </div>
      </div>
    </div>
  `).join("");

  // Re-initialize lucide icons for newly injected HTML
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

// Init
document.addEventListener("DOMContentLoaded", () => {
  renderFilters();
  renderGrid();
  renderFeed();
  lucide.createIcons();
});
