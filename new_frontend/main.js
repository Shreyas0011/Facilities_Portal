// =========================================
// DATABASES & CONFIG
// =========================================
const facilities = [
  { id: "classroom_101", label: "Lecture Hall 101", icon: "book-open", capacity: "60", category: "academic", desc: "Standard classroom with whiteboard and visual assist projectors.", autoApprove: true, rules: ["Submit bookings 1 hour in advance", "Clean boards after session", "No food allowed"] },
  { id: "seminar_hall", label: "Main Seminar Hall", icon: "calendar-days", capacity: "250", category: "academic", desc: "Tiered seating auditorium setup for department events.", autoApprove: false, rules: ["Department faculty coordinator approval required", "Sound technicians must be requested separately"] },
  { id: "computer_lab_3", label: "Advanced computing Lab", icon: "flask-conical", capacity: "40", category: "academic", desc: "Equipped with AI development workstations and server linkups.", autoApprove: true, rules: ["Only authorized CS/IT students", "Do not modify terminal wiring"] },
  { id: "auditorium_grand", label: "Grand Auditorium", icon: "mic-2", capacity: "500", category: "media", desc: "Premium main stage auditorium with complete acoustics control.", autoApprove: false, rules: ["Administrative clearance required", "Strictly no rehearsals during lectures", "Max booking duration: 4 hours"] },
  { id: "sports_turf", label: "Campus Athletics Turf", icon: "dumbbell", capacity: "Open Space", category: "recreation", desc: "Outdoor artificial turf for football, running tracks, and athletics.", autoApprove: false, rules: ["Sports coordinator clearance required", "Only flat-soled sports shoes allowed"] },
  { id: "podcast_studio", label: "Media Podcast Studio", icon: "radio", capacity: "8", category: "media", desc: "Acoustic booth with multi-mic arrays and podcast mixers.", autoApprove: true, rules: ["Limit 8 people inside", "Ensure mixers are shut down after use"] },
  { id: "camera_kit_a", label: "Sony FX3 Camera Kit A", icon: "camera", capacity: "1 Kit", category: "equipment", desc: "Professional cinema camera body with 24-70mm lens, tripod, and audio system.", autoApprove: false, rules: ["Return within 24 hours", "Equipments checked for damage upon return"] },
  { id: "conf_room_admin", label: "Board Conference Room", icon: "users", capacity: "20", category: "academic", desc: "Executive meeting room with video conferencing hub.", autoApprove: false, rules: ["Priority for faculty/board meetings", "Bookings max 2 hours"] }
];

const categories = [
  { id: "all", label: "All Spaces" },
  { id: "academic", label: "Academics & Labs" },
  { id: "media", label: "Media & Arts" },
  { id: "recreation", label: "Recreation" },
  { id: "equipment", label: "Equipment Kits" }
];

// Seed Bookings
let bookings = [
  {
    id: "RSV-1002",
    facilityId: "auditorium_grand",
    facilityName: "Grand Auditorium",
    purpose: "ACM-W Annual Women in Tech Keynote",
    status: "APPROVED",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "12:00",
    attendees: 300,
    requestedBy: "Dr. Ananya Sharma",
    role: "faculty",
    workflow: ["Initiated", "HOD Endorsed", "Admin Approved"]
  },
  {
    id: "RSV-1003",
    facilityId: "classroom_101",
    facilityName: "Lecture Hall 101",
    purpose: "Data Science Club Study Session",
    status: "APPROVED",
    date: new Date().toISOString().split("T")[0],
    startTime: "14:00",
    endTime: "16:00",
    attendees: 45,
    requestedBy: "Siddharth Verma",
    role: "student",
    workflow: ["Initiated", "Auto Approved"]
  },
  {
    id: "RSV-1004",
    facilityId: "podcast_studio",
    facilityName: "Media Podcast Studio",
    purpose: "Ep 5: Campus Tech Weekly",
    status: "PENDING",
    date: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    endTime: "13:00",
    attendees: 4,
    requestedBy: "Nikhil Gupta",
    role: "student",
    workflow: ["Initiated", "Awaiting Admin Review"]
  }
];

let maintenanceBlocks = [
  { id: "MNT-201", facilityId: "computer_lab_3", facilityName: "Advanced computing Lab", date: new Date().toISOString().split("T")[0], reason: "Server Rack Maintenance" }
];

// Current State
let currentRole = "student"; 
let activeTab = "facilities";
let activeCategory = "all";
let selectedFacilityId = null;
let activeSelectedBooking = null;

// =========================================
// STATE MANAGEMENT & TABS
// =========================================
function init() {
  setupEventListeners();
  switchRole("student");
  renderCategories();
  renderFacilitiesGrid();
  updateStatCounters();
}

function setupEventListeners() {
  // Navigation Tabs switching
  document.querySelectorAll(".tab-link").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Role select drop handler
  document.getElementById("roleSelect").addEventListener("change", (e) => {
    switchRole(e.target.value);
  });

  // Modal close trigger
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("bookingModal").classList.remove("active");
  });

  document.getElementById("closeInfoModal").addEventListener("click", () => {
    document.getElementById("infoModal").classList.remove("active");
  });

  // Booking Form Submission
  document.getElementById("bookingForm").addEventListener("submit", handleBookingSubmit);

  // Time slots input changed (to dynamic warning checks)
  document.getElementById("startTime").addEventListener("change", performLiveConflictCheck);
  document.getElementById("endTime").addEventListener("change", performLiveConflictCheck);
  
  // Maintenance blocker submission
  document.getElementById("maintenanceForm").addEventListener("submit", handleMaintenanceSubmit);
}

function switchTab(tabId) {
  activeTab = tabId;
  
  // Toggle Active Classes
  document.querySelectorAll(".tab-link").forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  document.querySelectorAll(".tab-content").forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  // Show/Hide hero block depending on tab to clean screen space
  const hero = document.getElementById("appHero");
  if (tabId === "facilities") {
    hero.style.display = "block";
  } else {
    hero.style.display = "none";
  }

  // Reload specific views on tab enter
  if (tabId === "calendar") {
    renderCalendar();
  } else if (tabId === "my-bookings") {
    renderMyBookings();
  } else if (tabId === "admin-dashboard") {
    renderAdminConsole();
  }
}

function switchRole(role) {
  currentRole = role;
  
  // Toggle Admin consoles
  const adminTab = document.querySelector('.admin-only');
  if (role === "admin" || role === "super_admin") {
    adminTab.style.display = "inline-flex";
  } else {
    adminTab.style.display = "none";
    if (activeTab === "admin-dashboard") {
      switchTab("facilities");
    }
  }

  // Show customized greetings/modes in terminal
  showToast(`Switched workspace view to: ${role.toUpperCase()}`);
  
  // Refresh tabs that rely on permissions
  renderFacilitiesGrid();
  if (activeTab === "my-bookings") {
    renderMyBookings();
  } else if (activeTab === "admin-dashboard") {
    renderAdminConsole();
  }
}

// =========================================
// VIEW: FACILITIES
// =========================================
function renderCategories() {
  const container = document.getElementById("categoryFilters");
  container.innerHTML = categories.map(cat => `
    <button class="filter-btn ${activeCategory === cat.id ? 'active' : ''}" data-id="${cat.id}">
      ${cat.label}
    </button>
  `).join("");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      activeCategory = e.currentTarget.dataset.id;
      renderCategories();
      renderFacilitiesGrid();
    });
  });
}

function renderFacilitiesGrid() {
  const grid = document.getElementById("facilitiesGrid");
  const filtered = activeCategory === "all" ? facilities : facilities.filter(f => f.category === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">No campus facilities found in this category.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((fac, idx) => {
    // Check if facility is currently blocked by maintenance today
    const todayStr = new Date().toISOString().split("T")[0];
    const isMaintenance = maintenanceBlocks.some(b => b.facilityId === fac.id && b.date === todayStr);
    
    // Check active approved bookings at this exact hour (rough simulation)
    const isReserved = bookings.some(b => b.facilityId === fac.id && b.date === todayStr && b.status === "APPROVED");
    
    let statusText = "Available";
    let statusClass = "available";
    if (isMaintenance) {
      statusText = "Maintenance";
      statusClass = "reserved"; // shows orange/warning badge
    } else if (isReserved) {
      statusText = "Reserved";
      statusClass = "reserved";
    }

    const workflowLabel = fac.autoApprove ? "Auto-Approved" : "Requires Review";

    return `
      <div class="card animate-slide-up" style="animation-delay: ${idx * 0.05}s">
        <div class="card-image">
          <div class="status-badge ${statusClass}">
            <div class="status-dot ${statusClass}"></div>
            ${statusText}
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
              ${fac.capacity.includes("Kit") || fac.capacity.includes("Space") ? fac.capacity : fac.capacity + " Max Seats"}
            </div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); display:flex; align-items:center; gap:0.25rem;">
              <i data-lucide="shield-check" style="width: 14px;"></i> ${workflowLabel}
            </div>
            
            <div style="display: flex; gap: 0.5rem; width: 100%; margin-top: 0.5rem;">
              <button class="btn btn-ghost btn-info-details btn-sm" data-id="${fac.id}" style="flex:1;">Info</button>
              <button class="btn btn-primary btn-reserve btn-sm" data-id="${fac.id}" style="flex:2;">Reserve Space</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Attach button triggers
  document.querySelectorAll(".btn-reserve").forEach(btn => {
    btn.addEventListener("click", (e) => {
      openBookingModal(e.currentTarget.dataset.id);
    });
  });

  document.querySelectorAll(".btn-info-details").forEach(btn => {
    btn.addEventListener("click", (e) => {
      openInfoModal(e.currentTarget.dataset.id);
    });
  });

  lucide.createIcons();
}

// =========================================
// VIEW: INFO MODAL (GUIDELINES & PHOTOS)
// =========================================
function openInfoModal(facilityId) {
  const fac = facilities.find(f => f.id === facilityId);
  if (!fac) return;

  const content = document.getElementById("infoModalContent");
  content.innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
      <div style="flex: 1 1 200px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 20px; border: 1px solid var(--surface-border); min-height: 180px;">
        <i data-lucide="${fac.icon}" style="width: 80px; height: 80px; color: var(--primary);"></i>
      </div>
      <div style="flex: 2 1 300px;">
        <div class="modal-badge" style="margin-bottom: 0.5rem;">
          <i data-lucide="info"></i> <span>Facility Details</span>
        </div>
        <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);">${fac.label}</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0.5rem 0 1.5rem;">${fac.desc}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: #f8fafc; padding: 0.75rem; border-radius: 12px; border: 1px solid var(--surface-border);">
            <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Capacity Limit</span>
            <p style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">${fac.capacity}</p>
          </div>
          <div style="background: #f8fafc; padding: 0.75rem; border-radius: 12px; border: 1px solid var(--surface-border);">
            <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Approval Route</span>
            <p style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">${fac.autoApprove ? 'Instant Approval' : 'Manual Review'}</p>
          </div>
        </div>

        <h4 style="font-weight: 800; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem;">Rules & Usage Guidelines</h4>
        <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.4rem;">
          ${fac.rules.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  document.getElementById("infoModal").classList.add("active");
  lucide.createIcons();
}

// =========================================
// BOOKING ACTION & CONFLICT DETECTOR
// =========================================
function openBookingModal(facilityId) {
  selectedFacilityId = facilityId;
  const fac = facilities.find(f => f.id === facilityId);
  if (!fac) return;

  document.getElementById("modalFacilityTitle").innerText = fac.label;
  document.getElementById("modalFacilityCapacity").innerHTML = `
    <i data-lucide="users" style="width: 14px; height: 14px;"></i> Capacity: ${fac.capacity}
  `;

  // Dynamic workflow badge label
  document.getElementById("workflowBadge").innerText = fac.autoApprove ? "Auto-Approved space" : "Requires Faculty/Admin approval";

  // Render Guidelines dynamically
  const rulesContainer = document.getElementById("modalGuidelines");
  rulesContainer.innerHTML = fac.rules.map(r => `<li>${r}</li>`).join("");

  // Initialize scrolling date selector cards
  initDateSelector();
  
  // Clear any warnings and reset form inputs
  document.getElementById("conflictAlert").style.display = "none";
  document.getElementById("bookingPurpose").value = "";
  document.getElementById("attendeeCount").value = "";
  document.getElementById("startTime").value = "10:00";
  document.getElementById("endTime").value = "12:00";

  document.getElementById("bookingModal").classList.add("active");
  lucide.createIcons();
}

// District App scrolling cards generator
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
  
  // Click handler
  document.querySelectorAll(".date-card").forEach(card => {
    card.addEventListener("click", (e) => {
      document.querySelectorAll(".date-card").forEach(c => c.classList.remove("active"));
      const clicked = e.currentTarget;
      clicked.classList.add("active");
      dateInput.value = clicked.dataset.val;
      performLiveConflictCheck();
    });
  });
}

// Real-time slot conflict checker
function checkConflict(facilityId, dateStr, startT, endT) {
  // Convert times to comparable numbers (e.g. 10:30 -> 10.5)
  const timeToNum = (t) => {
    const parts = t.split(":");
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
  };
  
  const startNum = timeToNum(startT);
  const endNum = timeToNum(endT);

  if (startNum >= endNum) {
    return { type: "validation", message: "Start time must be before End time" };
  }

  // 1. Check Maintenance Blocks
  const blocked = maintenanceBlocks.find(b => b.facilityId === facilityId && b.date === dateStr);
  if (blocked) {
    return { type: "maintenance", message: `Blocked for maintenance: ${blocked.reason}` };
  }

  // 2. Check Approved Bookings Overlaps
  const overlapping = bookings.find(b => {
    if (b.facilityId !== facilityId || b.date !== dateStr || b.status === "REJECTED") return false;
    
    const bStart = timeToNum(b.startTime);
    const bEnd = timeToNum(b.endTime);

    // Overlap math: (StartA < EndB) && (EndA > StartB)
    return (startNum < bEnd) && (endNum > bStart);
  });

  if (overlapping) {
    return { type: "double-booking", message: `Overlap with existing booking: "${overlapping.purpose}" (${overlapping.startTime} - ${overlapping.endTime})` };
  }

  return null;
}

function performLiveConflictCheck() {
  const dateStr = document.getElementById("selectedDate").value;
  const startT = document.getElementById("startTime").value;
  const endT = document.getElementById("endTime").value;
  const alertContainer = document.getElementById("conflictAlert");
  const submitBtn = document.getElementById("submitBookingBtn");

  if (!selectedFacilityId || !startT || !endT) return;

  const conflict = checkConflict(selectedFacilityId, dateStr, startT, endT);
  if (conflict) {
    alertContainer.querySelector("p").innerText = conflict.message;
    alertContainer.style.display = "flex";
    submitBtn.disabled = true;
    submitBtn.style.opacity = 0.5;
  } else {
    alertContainer.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.style.opacity = 1;
  }
}

function handleBookingSubmit(e) {
  e.preventDefault();

  const fac = facilities.find(f => f.id === selectedFacilityId);
  if (!fac) return;

  const dateStr = document.getElementById("selectedDate").value;
  const startT = document.getElementById("startTime").value;
  const endT = document.getElementById("endTime").value;
  const purpose = document.getElementById("bookingPurpose").value;
  const attendees = document.getElementById("attendeeCount").value;

  // Final check
  const conflict = checkConflict(selectedFacilityId, dateStr, startT, endT);
  if (conflict) {
    showToast(`Error: ${conflict.message}`);
    return;
  }

  // Automatic decision algorithm based on User Role & Facility Type
  let status = "PENDING";
  let workflow = ["Initiated"];
  
  if (fac.autoApprove) {
    status = "APPROVED";
    workflow.push("Auto Approved");
  } else {
    // If Faculty reserves a Faculty-priority space, pre-approve or elevate status
    if (currentRole === "faculty" || currentRole === "admin" || currentRole === "super_admin") {
      status = "APPROVED";
      workflow.push("Priority Faculty Clearance", "Approved");
    } else {
      status = "PENDING";
      workflow.push("Awaiting Department Faculty Review", "Pending Final Approval");
    }
  }

  const reservationId = "RSV-" + (1000 + bookings.length + 1);
  const newBooking = {
    id: reservationId,
    facilityId: selectedFacilityId,
    facilityName: fac.label,
    purpose: purpose,
    status: status,
    date: dateStr,
    startTime: startT,
    endTime: endT,
    attendees: parseInt(attendees),
    requestedBy: currentRole === "student" ? "Siddharth Verma" : "Dr. Sharma",
    role: currentRole,
    workflow: workflow
  };

  bookings.unshift(newBooking);
  updateStatCounters();
  
  // Visual indicators
  document.getElementById("bookingModal").classList.remove("active");
  showToast(`Booking Successful! ID: ${reservationId}. Status: ${status}`);
  
  // Reload
  renderFacilitiesGrid();
}

// =========================================
// VIEW: MASTER HOURLY SCHEDULE CALENDAR
// =========================================
function renderCalendar() {
  const daysHeader = document.getElementById("calendarDaysHeader");
  const gridTimeline = document.getElementById("calendarGridTimeline");
  const filtersContainer = document.getElementById("calendarFacilityFilters");

  // Populate Facility sidebar filter checkboxes once
  const filterHtml = facilities.map(f => `
    <label class="calendar-filter-item">
      <input type="checkbox" checked value="${f.id}" class="cal-fac-checkbox" />
      <span>${f.label}</span>
    </label>
  `).join("");
  filtersContainer.innerHTML = filterHtml;

  // Setup change event for dynamic checks
  document.querySelectorAll(".cal-fac-checkbox").forEach(box => {
    box.addEventListener("change", renderCalendarEvents);
  });

  // Render headers for current + next 6 days
  const today = new Date();
  let headerHtml = `<div class="calendar-time-col-header">Hour</div>`;
  const daysMap = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateNum = d.getDate();
    const iso = d.toISOString().split("T")[0];

    daysMap.push(iso);
    headerHtml += `
      <div class="calendar-day-header-cell">
        <div class="day-name">${dayStr}</div>
        <div class="day-date">${dateNum}</div>
      </div>
    `;
  }
  daysHeader.innerHTML = headerHtml;

  // Generate hourly blocks from 08:00 to 18:00
  let rowsHtml = "";
  for (let hour = 8; hour <= 18; hour++) {
    const padHour = hour.toString().padStart(2, "0") + ":00";
    rowsHtml += `
      <div class="calendar-hour-row" data-hour="${hour}">
        <div class="calendar-time-cell">${padHour}</div>
        ${daysMap.map(dayIso => `
          <div class="calendar-grid-cell" data-day="${dayIso}" data-hour="${hour}"></div>
        `).join("")}
      </div>
    `;
  }
  gridTimeline.innerHTML = rowsHtml;

  // Populate events
  renderCalendarEvents();
}

function renderCalendarEvents() {
  // Clear old events from hourly cells
  document.querySelectorAll(".calendar-grid-cell").forEach(cell => cell.innerHTML = "");

  // Read which facilities are checked in sidebar
  const selectedFacilityIds = Array.from(document.querySelectorAll(".cal-fac-checkbox"))
    .filter(box => box.checked)
    .map(box => box.value);

  // Time conversion helper
  const hourToPx = (t) => {
    const parts = t.split(":");
    return parseFloat(parts[0]) + (parseFloat(parts[1]) / 60);
  };

  // 1. Render Bookings
  bookings.forEach(b => {
    if (!selectedFacilityIds.includes(b.facilityId) || b.status === "REJECTED") return;

    const startH = hourToPx(b.startTime);
    const endH = hourToPx(b.endTime);

    // Map to day cell. Render only if day exists in timeline
    const dateStr = b.date;
    
    // Find the cell for the start hour
    const startHourInt = Math.floor(startH);
    const cell = document.querySelector(`.calendar-grid-cell[data-day="${dateStr}"][data-hour="${startHourInt}"]`);
    
    if (cell) {
      const durationHours = endH - startH;
      const heightVal = durationHours * 58; // 60px height minus borders
      
      const eventEl = document.createElement("div");
      eventEl.className = `calendar-event status-${b.status.toLowerCase()}`;
      eventEl.style.height = `${heightVal}px`;
      eventEl.style.top = `${(startH - startHourInt) * 60}px`;
      eventEl.innerHTML = `
        <div style="font-weight: 800; font-size: 0.65rem;">${b.facilityName}</div>
        <div>${b.purpose}</div>
      `;
      
      eventEl.addEventListener("click", () => {
        showToast(`Booking: ${b.purpose} (${b.startTime} - ${b.endTime}) requested by ${b.requestedBy}`);
      });
      
      cell.appendChild(eventEl);
    }
  });

  // 2. Render Maintenance Blocks
  maintenanceBlocks.forEach(m => {
    if (!selectedFacilityIds.includes(m.facilityId)) return;

    // Block entire working hours from 08:00 to 18:00
    const cell = document.querySelector(`.calendar-grid-cell[data-day="${m.date}"][data-hour="8"]`);
    if (cell) {
      const eventEl = document.createElement("div");
      eventEl.className = "calendar-event status-maintenance";
      eventEl.style.height = `${10 * 60}px`;
      eventEl.style.top = "0px";
      eventEl.innerHTML = `
        <div style="font-weight: 800;">MAINTENANCE</div>
        <div>${m.reason}</div>
      `;
      cell.appendChild(eventEl);
    }
  });
}

// =========================================
// VIEW: USER RESERVATIONS DASHBOARD
// =========================================
function renderMyBookings() {
  const listContainer = document.getElementById("myBookingsList");
  const userBookings = bookings; // In real app, filter by currentUser

  if (userBookings.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted);">You have no reservations.</div>`;
    return;
  }

  // Update navbar booking count badge
  document.getElementById("userBookingCount").innerText = userBookings.length;

  listContainer.innerHTML = userBookings.map(b => {
    const fac = facilities.find(f => f.id === b.facilityId);
    const icon = fac ? fac.icon : "calendar";
    
    let statusBadgeColor = "pending";
    if (b.status === "APPROVED") statusBadgeColor = "approved";
    if (b.status === "REJECTED") statusBadgeColor = "rejected";

    return `
      <div class="booking-item-card ${activeSelectedBooking?.id === b.id ? 'active' : ''}" data-id="${b.id}">
        <div class="booking-item-left">
          <div class="booking-item-icon">
            <i data-lucide="${icon}"></i>
          </div>
          <div>
            <div class="booking-item-title">${b.facilityName}</div>
            <div class="booking-item-desc">${b.purpose}</div>
          </div>
        </div>
        <div class="booking-item-right">
          <span class="feed-status ${statusBadgeColor}">${b.status}</span>
          <div class="booking-item-desc">${b.date}</div>
        </div>
      </div>
    `;
  }).join("");

  // Attach select handlers
  document.querySelectorAll(".booking-item-card").forEach(card => {
    card.addEventListener("click", (e) => {
      const bId = e.currentTarget.dataset.id;
      activeSelectedBooking = bookings.find(b => b.id === bId);
      renderMyBookings();
      renderBookingDetailsPanel();
    });
  });

  lucide.createIcons();
}

function renderBookingDetailsPanel() {
  const panel = document.getElementById("bookingDetailPanel");
  if (!activeSelectedBooking) {
    panel.innerHTML = `
      <div class="empty-detail-state">
        <i data-lucide="info" style="width: 48px; height: 48px; color: var(--text-muted);"></i>
        <p>Select a booking to view approval path details and QR ticket</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const b = activeSelectedBooking;
  
  // Format workflow items
  const workflowStepsHtml = b.workflow.map((w, idx) => `
    <div class="workflow-step completed">
      <div class="workflow-dot">${idx + 1}</div>
      <div class="workflow-label">${w}</div>
    </div>
  `).join("");

  let cancelBtnHtml = "";
  if (b.status === "PENDING" || b.status === "APPROVED") {
    cancelBtnHtml = `
      <button class="btn btn-danger btn-sm" id="btnCancelBooking" style="margin-top: 1rem; width:100%;">
        Cancel Reservation <i data-lucide="trash-2"></i>
      </button>
    `;
  }

  panel.innerHTML = `
    <div class="detail-main-header">
      <div>
        <h4 class="detail-title">${b.facilityName}</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">ID: ${b.id}</p>
      </div>
      <span class="feed-status ${b.status.toLowerCase() === 'approved' ? 'approved' : 'pending'}">${b.status}</span>
    </div>

    <div class="detail-meta-grid">
      <div class="detail-meta-item">
        <i data-lucide="calendar"></i>
        <div>
          <span>Scheduled Date</span>
          <p>${b.date}</p>
        </div>
      </div>
      <div class="detail-meta-item">
        <i data-lucide="clock"></i>
        <div>
          <span>Time Slot</span>
          <p>${b.startTime} - ${b.endTime}</p>
        </div>
      </div>
      <div class="detail-meta-item">
        <i data-lucide="users"></i>
        <div>
          <span>Attendees</span>
          <p>${b.attendees} Seats</p>
        </div>
      </div>
      <div class="detail-meta-item">
        <i data-lucide="user"></i>
        <div>
          <span>Requested By</span>
          <p>${b.requestedBy}</p>
        </div>
      </div>
    </div>

    <!-- Workflow Progress -->
    <div class="workflow-box">
      <h4><i data-lucide="git-branch" style="width:14px;"></i> Approval Workflow Path</h4>
      <div class="workflow-steps">
        ${workflowStepsHtml}
        ${b.status === "PENDING" ? `
          <div class="workflow-step active">
            <div class="workflow-dot">•</div>
            <div class="workflow-label">Awaiting Facility Manager confirmation</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- QR Entry Ticket -->
    <div class="qr-ticket-container">
      <div class="qr-box">
        <!-- Render a simulated QR code icon -->
        <i data-lucide="qr-code" style="width: 100%; height: 100%; color: var(--text-main);"></i>
      </div>
      <div class="qr-text">
        <h5>Quick Access QR Ticket</h5>
        <p>Scan barcode reader at facility entrance for automatic check-in. Valid for date and slot specified.</p>
      </div>
    </div>

    ${cancelBtnHtml}
  `;

  // Attach cancel trigger
  const cancelBtn = document.getElementById("btnCancelBooking");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      // Remove or mark as rejected
      b.status = "REJECTED";
      b.workflow.push("Cancelled by User");
      showToast(`Cancelled reservation: ${b.id}`);
      updateStatCounters();
      renderMyBookings();
      renderBookingDetailsPanel();
    });
  }

  lucide.createIcons();
}

// =========================================
// VIEW: ADMIN COMMAND CENTER
// =========================================
function renderAdminConsole() {
  const queueContainer = document.getElementById("approvalsQueue");
  const facilityBlockSelect = document.getElementById("blockFacility");

  // Populate facility select in maintenance blocker dropdown
  facilityBlockSelect.innerHTML = facilities.map(f => `
    <option value="${f.id}">${f.label}</option>
  `).join("");

  const pendingRequests = bookings.filter(b => b.status === "PENDING");
  document.getElementById("queueCount").innerText = `${pendingRequests.length} Requests`;

  if (pendingRequests.length === 0) {
    queueContainer.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted); font-size:0.9rem;">No pending approvals in queue.</div>`;
    return;
  }

  queueContainer.innerHTML = pendingRequests.map(b => {
    return `
      <div class="queue-item">
        <div class="queue-top">
          <div>
            <h4 class="queue-title">${b.facilityName}</h4>
            <div class="queue-desc"><strong>Purpose:</strong> ${b.purpose}</div>
          </div>
          <span class="queue-role">${b.role}</span>
        </div>
        <div class="queue-meta">
          <span><i data-lucide="user" style="width:12px;"></i> ${b.requestedBy}</span>
          <span><i data-lucide="calendar" style="width:12px;"></i> ${b.date}</span>
          <span><i data-lucide="clock" style="width:12px;"></i> ${b.startTime} - ${b.endTime}</span>
          <span><i data-lucide="users" style="width:12px;"></i> ${b.attendees} Ppl</span>
        </div>
        <div class="queue-actions">
          <button class="btn btn-primary btn-sm btn-sm-approve" data-id="${b.id}"><i data-lucide="check"></i> Approve Booking</button>
          <button class="btn btn-ghost btn-sm btn-sm-reject" data-id="${b.id}" style="color:red;"><i data-lucide="x"></i> Reject</button>
        </div>
      </div>
    `;
  }).join("");

  // Attach action triggers
  document.querySelectorAll(".btn-sm-approve").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const bId = e.currentTarget.dataset.id;
      const b = bookings.find(x => x.id === bId);
      if (b) {
        b.status = "APPROVED";
        b.workflow.push("Approved by Facility Manager");
        showToast(`Approved booking request: ${bId}`);
        updateStatCounters();
        renderAdminConsole();
      }
    });
  });

  document.querySelectorAll(".btn-sm-reject").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const bId = e.currentTarget.dataset.id;
      const b = bookings.find(x => x.id === bId);
      if (b) {
        b.status = "REJECTED";
        b.workflow.push("Rejected by Facility Manager");
        showToast(`Rejected booking request: ${bId}`);
        updateStatCounters();
        renderAdminConsole();
      }
    });
  });

  lucide.createIcons();
}

function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const facId = document.getElementById("blockFacility").value;
  const blockD = document.getElementById("blockDate").value;
  const blockR = document.getElementById("blockReason").value;

  const fac = facilities.find(f => f.id === facId);
  if (!fac) return;

  const newBlock = {
    id: "MNT-" + (200 + maintenanceBlocks.length + 1),
    facilityId: facId,
    facilityName: fac.label,
    date: blockD,
    reason: blockR
  };

  maintenanceBlocks.push(newBlock);
  updateStatCounters();
  renderAdminConsole();
  showToast(`Maintenance lock created for ${fac.label} on ${blockD}`);
  
  // Reset form inputs
  document.getElementById("blockReason").value = "";
}

// Stats & Badges updater
function updateStatCounters() {
  const pendingCount = bookings.filter(b => b.status === "PENDING").length;
  const userCount = bookings.length;

  document.getElementById("userBookingCount").innerText = userCount;
  
  // Admin only elements
  const queueBadge = document.getElementById("statPendingCount");
  const blockedBadge = document.getElementById("statBlocked");
  
  if (queueBadge) queueBadge.innerText = pendingCount;
  if (blockedBadge) blockedBadge.innerText = maintenanceBlocks.length;
}

// Utility Toast system
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

  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =========================================
// INITIALIZE APPLICATION
// =========================================
document.addEventListener("DOMContentLoaded", init);


