/* =========================================
   REDUX IMPORT
   ========================================= */
import { store } from './src/store/index.js';
import { loginUser, fetchMe, logout as logoutAction, changePassword } from './src/store/authSlice.js';
import { fetchFacilities, fetchBookings, fetchMyBookings, createBooking, updateBookingStatus } from './src/store/dataSlice.js';
import { API_BASE_URL } from './src/config.js';

console.log("MAIN LOADED");
console.log("REDUX STORE INITIALIZED", store.getState());

/* =========================================
   DATA
   ========================================= */
let facilities = [];
let bookings = [];
let users = [];

const categories = [
  { id: "all",        label: "All Amenities" },
  { id: "academic",   label: "Academic & Labs" },
  { id: "media",      label: "Performance & Media" },
  { id: "recreation", label: "Recreation" },
];

// Subscribe to store updates
store.subscribe(() => {
  const state = store.getState();
  facilities = state.data.facilities || [];
  bookings = state.data.bookings || [];
  if (state.auth.user) {
    currentUserProfile = state.auth.user;
    currentRole = currentUserProfile.role;
  }
});


/* =========================================
   STATE
   ========================================= */
let searchQuery       = "";
let selectedFacility  = null;
let currentRole       = null;         // "superadmin" | "admin" | "faculty" | "viewer"
let currentUserProfile = null;        // { id, name, email, role, first_login }
let facultyPage       = "amenities";  // "amenities" | "calendar" | "myBookings"
let adminPage         = "queue";      // "queue" | "calendar"
let myBookingsFilter  = "all";
let pendingCancellationBookingId = null;
let pendingCancellationStatus = "REJECTED";
let uploadedVenueImageBase64 = null;
let supabaseUsers     = [];           // profiles fetched from Supabase for Manage page

/* =========================================
   DOM REFS
   ========================================= */
const mainNavbar       = document.getElementById("mainNavbar");
const navLinks         = document.getElementById("navLinks");
const navUserBadge     = document.getElementById("navUserBadge");
const logoutBtn        = document.getElementById("logoutBtn");

const loginView          = document.getElementById("loginView");
const changePasswordView = document.getElementById("changePasswordView");
const facultyPortal      = document.getElementById("facultyPortal");
const adminPortal        = document.getElementById("adminPortal");
const calendarViewPortal = document.getElementById("calendarViewPortal");

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
   HELPERS: hide / show all view panels
   ========================================= */
function hideAllViews() {
  loginView.classList.add("hidden");
  if (changePasswordView) changePasswordView.classList.add("hidden");
  facultyPortal.classList.add("hidden");
  adminPortal.classList.add("hidden");
  calendarViewPortal.style.display = "none";
  mainNavbar.classList.add("hidden");
  const tempPasswordBanner = document.getElementById("tempPasswordBanner");
  if (tempPasswordBanner) tempPasswordBanner.classList.add("hidden");
}

/* =========================================
   AUTH FLOW — Supabase
   ========================================= */

// ── Login form submit ──────────────────────────────────────────────────
const loginForm       = document.getElementById("loginForm");
const loginErrorEl    = document.getElementById("loginError");
const loginSubmitBtn  = document.getElementById("loginSubmitBtn");
const loginBtnText    = document.getElementById("loginBtnText");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showAuthError(loginErrorEl, "Please enter your email and password.");
      return;
    }

    setLoginLoading(true);
    loginErrorEl.classList.add("hidden");

    try {
      console.log("STEP 1 - Login button clicked", { email });
      
      console.log("BEFORE AUTH");
      const resultAction = await store.dispatch(loginUser({ email, password }));
      
      if (loginUser.rejected.match(resultAction)) {
        showAuthError(loginErrorEl, resultAction.payload || "Invalid username or password");
        return;
      }

      console.log("AFTER AUTH");
      const user = resultAction.payload.user;
      
      currentUserProfile = user;
      currentRole = user.role;

      // Check first_login property if it exists, otherwise false
      const isFirstLogin = user.first_login;

      console.log("STEP 5 - About to route user", {
        role: user.role,
        first_login: isFirstLogin
      });

      enterDashboard(user.role);
      console.log("STEP 6 - Route complete");
    } catch (err) {
      console.error("LOGIN EXCEPTION", err);
      showAuthError(loginErrorEl, "Invalid username or password");
    } finally {
      setLoginLoading(false);
    }
  });
}

function setLoginLoading(loading) {
  if (!loginSubmitBtn) return;
  loginSubmitBtn.disabled = loading;
  if (loginBtnText) loginBtnText.textContent = loading ? "Signing in…" : "Sign In";
}

// ── Public Calendar Button (no login required) ─────────────────────────
const publicCalendarBtn = document.getElementById("publicCalendarBtn");
if (publicCalendarBtn) {
  publicCalendarBtn.addEventListener("click", showPublicCalendar);
}

async function showPublicCalendar() {
  const btn = document.getElementById("publicCalendarBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }

  try {
    const [facRes, bookRes] = await Promise.all([
      fetch(`${API_BASE_URL}/facilities`),
      fetch(`${API_BASE_URL}/bookings/public`),
    ]);
    if (!facRes.ok) throw new Error(`Facilities fetch failed (${facRes.status})`);
    if (!bookRes.ok) throw new Error(`Bookings fetch failed (${bookRes.status})`);

    const facData  = await facRes.json();
    const bookData = await bookRes.json();

    facilities = (facData.facilities || []).map(f => ({
      id: f.id || f._id, label: f.name, icon: f.icon || 'building',
      capacity: String(f.capacity), available: f.isActive,
      category: f.category || 'academic', location: f.location,
      desc: f.description, image: f.images?.[0] || null,
    }));

    bookings = (bookData.bookings || []).map(b => ({
      id: b.id || b._id,
      facility:      b.facilityId?.name || 'Unknown Facility',
      facilityId:    b.facilityId?.id   || b.facilityId?._id || b.facilityId,
      purpose:       b.purpose,   status: b.status,
      date:          b.date ? b.date.split('T')[0] : '',
      time:          `${b.startTime} - ${b.endTime}`,
      attendees:     b.attendeesCount, requirements: b.requirements,
      requester:     b.userId?.name || 'Unknown',
      requesterId:   b.userId?._id  || b.userId?.id || null,
      requesterRole: b.userId?.role || '', cancelReason: b.notes,
    }));

    currentRole = 'viewer';
    currentUserProfile = null;

    // Show portal, hide login
    loginView.style.display = 'none';
    calendarViewPortal.style.display = 'block';
    window.scrollTo(0, 0);

    // Wire exit button
    const exitBtn = document.getElementById('calViewLogoutBtn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        currentRole = null; currentUserProfile = null;
        calendarViewPortal.style.display = 'none';
        loginView.style.display = '';
        lucide.createIcons();
      };
    }

    // Render calendar
    renderUnifiedCalendar('calendarViewWrapper', false, true);
    lucide.createIcons();

  } catch (err) {
    console.error('[PublicCal] Error:', err);
    calendarViewPortal.style.display = 'none';
    loginView.style.display = '';
    lucide.createIcons();
    const errEl = document.getElementById('loginError');
    if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="calendar-days" style="width:16px;height:16px;"></i><span>View Campus Calendar</span><i data-lucide="arrow-right" style="width:14px;height:14px;margin-left:auto;"></i>`;
      lucide.createIcons();
    }
  }
}




// ── Password-visibility toggle ─────────────────────────────────────────
function setupPasswordToggle(toggleBtnId, iconId, inputId) {
  const btn = document.getElementById(toggleBtnId);
  if (!btn) return;
  btn.addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    if (icon) {
      icon.setAttribute("data-lucide", isHidden ? "eye-off" : "eye");
      lucide.createIcons();
    }
  });
}

// ── Change Password form ───────────────────────────────────────────────
const changePasswordForm = document.getElementById("changePasswordForm");
const changePwdError     = document.getElementById("changePwdError");
const changePwdBtn       = document.getElementById("changePwdBtn");
const changePwdBtnText   = document.getElementById("changePwdBtnText");

if (changePasswordForm) {
  // Live password strength meter
  const newPwdInput = document.getElementById("newPassword");
  if (newPwdInput) {
    newPwdInput.addEventListener("input", () => {
      updatePasswordStrength(newPwdInput.value);
    });
  }

  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPwd = document.getElementById("currentPassword").value;
    const newPwd     = document.getElementById("newPassword").value;
    const confirmPwd = document.getElementById("confirmPassword").value;

    changePwdError.classList.add("hidden");

    if (!currentPwd) {
      showAuthError(changePwdError, "Please enter your current password.");
      return;
    }
    if (newPwd.length < 8) {
      showAuthError(changePwdError, "Password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      showAuthError(changePwdError, "Passwords do not match.");
      return;
    }

    if (changePwdBtn) changePwdBtn.disabled = true;
    if (changePwdBtnText) changePwdBtnText.textContent = "Updating…";

    try {
      const resultAction = await store.dispatch(changePassword({ currentPassword: currentPwd, newPassword: newPwd }));
      
      if (changePassword.rejected.match(resultAction)) {
        throw new Error(resultAction.payload || "Incorrect current password or update failed.");
      }

      // Update local profile state (clone to avoid mutating frozen Redux object)
      currentUserProfile = { ...currentUserProfile, first_login: false, firstLogin: false };

      // Remove the warning banner if it is visible
      const tempPasswordBanner = document.getElementById("tempPasswordBanner");
      if (tempPasswordBanner) {
        tempPasswordBanner.classList.add("hidden");
      }

      showToast("Password updated successfully!");

      setTimeout(() => {
        enterDashboard(currentUserProfile.role);
      }, 900);
    } catch (err) {
      showAuthError(changePwdError, err.message || "Failed to update password.");
      if (changePwdBtn) changePwdBtn.disabled = false;
      if (changePwdBtnText) changePwdBtnText.textContent = "Set Password & Continue";
    }
  });
}

function updatePasswordStrength(pwd) {
  const bar   = document.getElementById("pwdStrengthBar");
  const label = document.getElementById("pwdStrengthLabel");
  if (!bar || !label) return;

  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const levels = [
    { pct: "0%",   color: "transparent", text: "" },
    { pct: "25%",  color: "#ef4444",     text: "Weak" },
    { pct: "50%",  color: "#f59e0b",     text: "Fair" },
    { pct: "75%",  color: "#3b82f6",     text: "Good" },
    { pct: "90%",  color: "#10b981",     text: "Strong" },
    { pct: "100%", color: "#059669",     text: "Very Strong" },
  ];
  const lvl = levels[Math.min(score, 5)];
  bar.style.width  = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

// ── Enter the appropriate dashboard ────────────────────────────────────
async function enterDashboard(role) {
  // Try to load user from store, if not available, try to fetch
  let state = store.getState();
  if (!state.auth.token) {
    showLoginPage();
    return;
  }

  if (!state.auth.user) {
    const fetchResult = await store.dispatch(fetchMe());
    if (fetchMe.rejected.match(fetchResult)) {
      showLoginPage();
      return;
    }
  }

  // Reload state
  state = store.getState();
  currentUserProfile = state.auth.user;
  currentRole = currentUserProfile?.role;
  
  // Also fetch data when entering dashboard concurrently
  await Promise.all([
    store.dispatch(fetchFacilities()),
    store.dispatch(fetchBookings())
  ]);

  currentRole = currentUserProfile.role;
  hideAllViews();

  const tempPasswordBanner = document.getElementById("tempPasswordBanner");
  // Viewers never see the temp-password banner (they cannot change password in viewer portal)
  if (currentUserProfile && currentUserProfile.first_login && currentRole !== 'viewer') {
    if (tempPasswordBanner) {
      tempPasswordBanner.classList.remove("hidden");
    }
  } else {
    if (tempPasswordBanner) {
      tempPasswordBanner.classList.add("hidden");
    }
  }

  const dismissWarningBannerBtn = document.getElementById("dismissWarningBannerBtn");
  if (dismissWarningBannerBtn) {
    dismissWarningBannerBtn.onclick = () => {
      const banner = document.getElementById("tempPasswordBanner");
      if (banner) banner.classList.add("hidden");
    };
  }

  const bannerChangePasswordBtn = document.getElementById("bannerChangePasswordBtn");
  if (bannerChangePasswordBtn) {
    bannerChangePasswordBtn.onclick = () => {
      openChangePasswordScreen();
    };
  }

  if (currentRole === "viewer") {
    // Show viewer name in topbar user chip
    const calViewUserName = document.getElementById("calViewUserName");
    if (calViewUserName && currentUserProfile) {
      calViewUserName.textContent = currentUserProfile.name || currentUserProfile.email || "";
    }
    calendarViewPortal.classList.remove("hidden");
    console.log("[Viewer] Portal shown. Facilities:", facilities.length, "Bookings:", bookings.length);
    // Start live clock and populate stats
    startCalViewClock();
    renderCalViewStats();
    renderCalendarViewPortal();
    console.log("[Viewer] Calendar rendered.");
    lucide.createIcons();
    return;
  }

  mainNavbar.classList.remove("hidden");

  if (currentRole === "faculty") {
    facultyPortal.classList.remove("hidden");
    setFacultyNav();
    renderGrid();
    renderRecentBookings();
    initHeroGallery();
  } else if (currentRole === "superadmin") {
    // superadmin also gets the faculty portal view for hero gallery
    // init gallery whenever they visit the amenities page
    initHeroGallery();
    adminPortal.classList.remove("hidden");
    setAdminNav();
    switchAdminPage(adminPage);
  } else {
    // admin
    adminPortal.classList.remove("hidden");
    if (currentRole === "admin" && adminPage === "manage") {
      adminPage = "dashboard";
    }
    setAdminNav();
    switchAdminPage(adminPage);
  }
  lucide.createIcons();
}

function openChangePasswordScreen() {
  hideAllViews();
  const changePwdError = document.getElementById("changePwdError");
  if (changePwdError) changePwdError.classList.add("hidden");
  
  changePasswordView.classList.remove("hidden");
  
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  if (currentPasswordInput) currentPasswordInput.value = "";
  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
  
  const cancelBtn = document.getElementById("cancelChangePwdBtn");
  if (cancelBtn) {
    if (currentUserProfile && !currentUserProfile.first_login) {
      cancelBtn.style.display = "block";
      cancelBtn.onclick = () => {
        enterDashboard(currentUserProfile.role);
      };
    } else {
      cancelBtn.style.display = "none";
    }
  }
  lucide.createIcons();
}

// ── Auth error helper ──────────────────────────────────────────────────
function showAuthError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Logout ─────────────────────────────────────────────────────────────
logoutBtn.addEventListener("click", () => {
  store.dispatch(logoutAction());
  currentRole        = null;
  currentUserProfile = null;
  supabaseUsers      = [];
  hideAllViews();
  loginView.classList.remove("hidden");
  lucide.createIcons();
});

// Calendar-View-only exit button
const calViewLogoutBtn = document.getElementById("calViewLogoutBtn");
if (calViewLogoutBtn) {
  calViewLogoutBtn.addEventListener("click", () => {
    store.dispatch(logoutAction());
    currentRole        = null;
    currentUserProfile = null;
    hideAllViews();
    loginView.classList.remove("hidden");
    lucide.createIcons();
  });
}

function showLoginPage() {
  currentRole        = null;
  currentUserProfile = null;
  supabaseUsers      = [];
  hideAllViews();
  loginView.classList.remove("hidden");
  lucide.createIcons();
}

// ── Restore session on page reload ────────────────────────────────────
// Initial check if we have a token
if (localStorage.getItem('token')) {
  enterDashboard();
} else {
  showLoginPage();
}

/* =========================================
   NAVBAR BUILDERS
   ========================================= */
function setFacultyNav() {
  const displayName = currentUserProfile ? currentUserProfile.name : "Faculty";
  navUserBadge.innerHTML = `<i data-lucide="user" style="width:14px;height:14px;"></i> <span>${escapeHtml(displayName)}</span>`;
  navLinks.innerHTML = `
    <a href="#" class="${facultyPage === 'amenities'   ? 'active' : ''}" data-page="amenities">Amenities</a>
    <a href="#" class="${facultyPage === 'calendar'    ? 'active' : ''}" data-page="calendar">Calendar</a>
    <a href="#" class="${facultyPage === 'myBookings'  ? 'active' : ''}" data-page="myBookings">My Bookings</a>
    <a href="#" class="${facultyPage === 'settings'    ? 'active' : ''}" data-page="settings">Settings</a>
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
  const displayName = currentUserProfile ? currentUserProfile.name : (currentRole === "superadmin" ? "Super Admin" : "Admin");
  if (currentRole === "superadmin") {
    navUserBadge.innerHTML = `<i data-lucide="shield-alert" style="width:14px;height:14px;color:#8b5cf6;"></i> <span style="color:#8b5cf6;font-weight:700;">${escapeHtml(displayName)}</span>`;
  } else {
    navUserBadge.innerHTML = `<i data-lucide="shield" style="width:14px;height:14px;"></i> <span>${escapeHtml(displayName)}</span>`;
  }
  navLinks.innerHTML = `
    <a href="#" class="${adminPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">Dashboard</a>
    <a href="#" class="${adminPage === 'queue' ? 'active' : ''}" data-page="queue">Approval Queue</a>
    <a href="#" class="${adminPage === 'calendar' ? 'active' : ''}" data-page="calendar">Calendar</a>
    ${currentRole === "superadmin" ? `<a href="#" class="${adminPage === 'manage' ? 'active' : ''}" data-page="manage">Manage</a>` : ""}
    <a href="#" class="${adminPage === 'settings' ? 'active' : ''}" data-page="settings">Settings</a>
  `;
  navLinks.querySelectorAll("a[data-page]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      switchAdminPage(a.dataset.page);
    });
  });
  lucide.createIcons();
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* =========================================
   ADMIN PAGE SWITCHER
   ========================================= */
function switchAdminPage(page) {
  if (page === "manage" && currentRole !== "superadmin") {
    page = "dashboard";
  }
  adminPage = page;
  document.getElementById("pageAdminDashboard").classList.toggle("hidden", page !== "dashboard");
  document.getElementById("pageAdminQueue").classList.toggle("hidden", page !== "queue");
  document.getElementById("pageAdminCalendar").classList.toggle("hidden", page !== "calendar");
  document.getElementById("pageAdminManage").classList.toggle("hidden", page !== "manage");
  
  const pageAdminSettings = document.getElementById("pageAdminSettings");
  if (pageAdminSettings) {
    pageAdminSettings.classList.toggle("hidden", page !== "settings");
  }

  renderAdminDashboard();

  if (page === "calendar") renderAdminCalendar();
  if (page === "manage") renderAdminManage();

  // Update nav active state
  navLinks.querySelectorAll("a[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
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
  
  const pageFacultySettings = document.getElementById("pageFacultySettings");
  if (pageFacultySettings) {
    pageFacultySettings.classList.toggle("hidden", page !== "settings");
  }

  if (page === "calendar")   renderCalendar();
  if (page === "myBookings") renderMyBookings();

  // Update nav active state
  navLinks.querySelectorAll("a[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });
  lucide.createIcons();
}

/* =========================================
   FACULTY: SEARCH BAR
   ========================================= */
function initSearch() {
  const searchInput = document.getElementById("facilitySearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");

  if (!searchInput) return;

  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value;
    clearBtn.style.display = searchQuery ? "flex" : "none";
    renderGrid();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearBtn.style.display = "none";
    renderGrid();
  });
}

/* =========================================
   FACULTY: AMENITIES GRID
   ========================================= */
function renderGrid() {
  let list = facilities;

  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    list = facilities.filter(f => 
      f.label.toLowerCase().includes(query) ||
      f.desc.toLowerCase().includes(query) ||
      f.category.toLowerCase().includes(query) ||
      f.capacity.toLowerCase().includes(query)
    );
  }

  if (!list.length) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--text-muted);">No facilities found matching "${searchQuery}".</div>`;
    return;
  }

  gridContainer.innerHTML = list.map((f, i) => {
    return `
      <div class="card animate-slide-up" style="animation-delay:${i * 0.05}s">
        <div class="card-image" style="${f.image ? `background-image: url('${f.image}'); background-size: cover; background-position: center; height: 160px;` : 'height: 160px;'}">
          <div class="status-badge ${f.available ? 'available' : 'reserved'}">
            <div class="status-dot ${f.available ? 'available' : 'reserved'}"></div>
            ${f.available ? 'Available' : 'Reserved'}
          </div>
          ${f.image ? '' : `<div class="card-icon"><i data-lucide="${f.icon}"></i></div>`}
        </div>
        <div class="card-body">
          <h3 class="card-title">
            ${f.label}
          </h3>
          <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
            <i data-lucide="map-pin" style="width: 12px; height: 12px; color: var(--primary);"></i>
            ${f.location || 'Main Campus'}
          </div>
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
    `;
  }).join("");

  gridContainer.querySelectorAll(".btn-reserve").forEach(btn => {
    btn.addEventListener("click", () => openBookingModal(btn.dataset.id));
  });
  lucide.createIcons();
}

/* =========================================
   HERO GALLERY (Superadmin image management)
   ========================================= */
const HERO_IMAGES_KEY = 'heroGalleryImages';

function getHeroImages() {
  try { return JSON.parse(localStorage.getItem(HERO_IMAGES_KEY) || '[]'); }
  catch { return []; }
}

function saveHeroImages(imgs) {
  localStorage.setItem(HERO_IMAGES_KEY, JSON.stringify(imgs));
}

function renderHeroGallery() {
  const leftPanel  = document.getElementById('heroImgLeft');
  const rightPanel = document.getElementById('heroImgRight');
  if (!leftPanel || !rightPanel) return;

  const imgs = getHeroImages();
  const isAdmin = currentRole === 'superadmin';

  const makeItem = (img, idx) => {
    const div = document.createElement('div');
    div.className = 'hero-gallery-item';
    div.innerHTML = `
      <img src="${img}" alt="Gallery image ${idx + 1}" loading="lazy" />
      ${isAdmin ? `<button class="hero-gallery-delete" data-idx="${idx}" title="Remove image">✕</button>` : ''}
    `;
    return div;
  };

  leftPanel.innerHTML  = '';
  rightPanel.innerHTML = '';

  imgs.forEach((img, idx) => {
    const item = makeItem(img, idx);
    if (idx % 2 === 0) leftPanel.appendChild(item);
    else               rightPanel.appendChild(item);
  });

  // Wire delete buttons
  [leftPanel, rightPanel].forEach(panel => {
    panel.querySelectorAll('.hero-gallery-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteHeroImage(parseInt(btn.dataset.idx)));
    });
  });
}

function deleteHeroImage(idx) {
  const imgs = getHeroImages();
  imgs.splice(idx, 1);
  saveHeroImages(imgs);
  renderHeroGallery();
  showToast('Image removed.');
}

function initHeroGallery() {
  // Show upload panel for superadmin
  const panel = document.getElementById('heroImageAdminPanel');
  if (panel) panel.style.display = currentRole === 'superadmin' ? 'block' : 'none';

  renderHeroGallery();
  lucide.createIcons();

  const input = document.getElementById('heroImageUploadInput');
  if (!input) return;

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;

    let processed = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgs = getHeroImages();
        imgs.push(e.target.result);
        saveHeroImages(imgs);
        processed++;
        if (processed === files.length) {
          renderHeroGallery();
          showToast(`${files.length} image${files.length > 1 ? 's' : ''} added!`);
        }
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });
}

/* =========================================
   FACULTY: RECENT BOOKINGS (below grid)
   ========================================= */
function renderRecentBookings() {
  if (!recentList) return;
  const recent = bookings
    .filter(b => b.requesterId === currentUserProfile.id)
    .slice(-4)
    .reverse();
  if (!recent.length) {
    recentList.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:2rem;">No recent bookings yet.</p>`;
    return;
  }
  recentList.innerHTML = recent.map(b => `
    <div class="recent-card">
      <div class="recent-info">
        <div class="recent-facility">
          ${b.facility}
          ${b.isExternal ? `<span style="font-size:0.6rem; background:#ef4444; color:white; padding:1px 4px; border-radius:4px; margin-left:0.4rem; vertical-align:middle; font-weight:800;">EXT</span>` : ''}
        </div>
        <div class="recent-purpose">${b.purpose}</div>
        <div class="recent-meta">
          <span><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${formatDate(b.date)}</span>
          <span><i data-lucide="clock" style="width:12px;height:12px;"></i> ${b.time}</span>
          <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${b.attendees} Ppl</span>
        </div>
        ${(b.status === "APPROVED" || b.status === "REJECTED") && b.approvedByName ? `
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.4rem;display:flex;align-items:center;gap:0.25rem;">
          <i data-lucide="shield" style="width:11px;height:11px;color:var(--primary);"></i>
          <span>${b.status === 'APPROVED' ? 'Approved' : 'Declined'} by <strong>${b.approvedByName}</strong></span>
        </div>` : ""}
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
  renderUnifiedCalendar("facultyCalendarWrapper", false);
}

/* =========================================
   ADMIN: CALENDAR PAGE
   ========================================= */
function renderAdminCalendar() {
  renderUnifiedCalendar("adminCalendarWrapper", true);
}

/* =========================================
   CALENDAR VIEW PORTAL (Read-Only)
   ========================================= */
function renderCalendarViewPortal() {
  renderUnifiedCalendar("calendarViewWrapper", false, true);
}

// Live clock for viewer topbar
let _calViewClockInterval = null;
function startCalViewClock() {
  const el = document.getElementById('calViewLiveDate');
  if (!el) return;
  if (_calViewClockInterval) clearInterval(_calViewClockInterval);
  const tick = () => {
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    el.innerHTML = `<i data-lucide="clock" style="width:12px;height:12px;"></i> ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} &nbsp;&middot;&nbsp; ${hh}:${mm}`;
    lucide.createIcons();
  };
  tick();
  _calViewClockInterval = setInterval(tick, 30000);
}

// Stats strip for viewer portal
function renderCalViewStats() {
  const el = document.getElementById('calViewStats');
  if (!el) return;
  const approved = bookings.filter(b => b.status === 'APPROVED').length;
  const pending  = bookings.filter(b => b.status === 'PENDING').length;
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayCount = bookings.filter(b => b.date === todayKey && (b.status === 'APPROVED' || b.status === 'PENDING')).length;
  el.innerHTML = `
    <div class="cal-view-stat-card">
      <span class="cal-view-stat-value" style="color:#34d399;">${approved}</span>
      <span class="cal-view-stat-label"><span class="cal-view-stat-dot" style="background:#34d399;"></span>Approved</span>
    </div>
    <div class="cal-view-stat-card">
      <span class="cal-view-stat-value" style="color:#fbbf24;">${pending}</span>
      <span class="cal-view-stat-label"><span class="cal-view-stat-dot" style="background:#fbbf24;"></span>Pending</span>
    </div>
    <div class="cal-view-stat-card">
      <span class="cal-view-stat-value" style="color:#60a5fa;">${todayCount}</span>
      <span class="cal-view-stat-label"><span class="cal-view-stat-dot" style="background:#60a5fa;"></span>Today</span>
    </div>
    <div class="cal-view-stat-card">
      <span class="cal-view-stat-value">${facilities.length}</span>
      <span class="cal-view-stat-label">Venues</span>
    </div>
  `;
}

/* =========================================
   UNIFIED INTERACTIVE CALENDAR ENGINE
   ========================================= */
let calendarDate = new Date(); // Start on today's date
let calendarViewMode = "month"; // "month" | "week" | "day"
let calendarFilterSerial = "all"; // "all" | "01" ... "09"

function renderUnifiedCalendar(containerId, isForAdmin = false, isReadOnly = false) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("[Calendar] Container not found:", containerId);
    return;
  }
  console.log("[Calendar] Rendering", containerId, "| bookings:", bookings.length, "| facilities:", facilities.length);

  let titleText = "";
  if (calendarViewMode === "month") {
    titleText = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (calendarViewMode === "week") {
    const sunday = new Date(calendarDate);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    
    const startStr = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = saturday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    titleText = `${startStr} – ${endStr}`;
  } else {
    titleText = calendarDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  container.innerHTML = `
    <div class="calendar-header-bar">
      <div class="calendar-nav-group">
        <button class="btn btn-secondary btn-cal-prev" style="padding:0.4rem 0.8rem;"><i data-lucide="chevron-left" style="width:16px;"></i></button>
        <button class="btn btn-secondary btn-cal-today" style="padding:0.4rem 0.8rem; font-size:0.8rem; font-weight:700;">Today</button>
        <button class="btn btn-secondary btn-cal-next" style="padding:0.4rem 0.8rem;"><i data-lucide="chevron-right" style="width:16px;"></i></button>
        <span class="calendar-title-display">${titleText}</span>
      </div>
      
      <div class="calendar-controls-right">
        <select class="calendar-filter-select filter-serial-dropdown">
          <option value="all">All Amenities</option>
          ${facilities.map(f => {
            return `<option value="${f.id}" ${calendarFilterSerial === f.id ? "selected" : ""}>${f.label}</option>`;
          }).join("")}
        </select>

        <div class="calendar-view-btn-group">
          <button class="calendar-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" data-view="day">Day</button>
          <button class="calendar-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" data-view="week">Week</button>
          <button class="calendar-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" data-view="month">Month</button>
        </div>
      </div>
    </div>
    
    <div class="calendar-body-content"></div>
  `;

  container.querySelector(".btn-cal-prev").addEventListener("click", () => {
    adjustCalendarDate(-1);
    if (currentRole === "viewer") { renderCalendarViewPortal(); return; }
    renderCalendar();
    renderAdminCalendar();
  });
  container.querySelector(".btn-cal-today").addEventListener("click", () => {
    calendarDate = new Date();
    if (currentRole === "viewer") { renderCalendarViewPortal(); return; }
    renderCalendar();
    renderAdminCalendar();
  });
  container.querySelector(".btn-cal-next").addEventListener("click", () => {
    adjustCalendarDate(1);
    if (currentRole === "viewer") { renderCalendarViewPortal(); return; }
    renderCalendar();
    renderAdminCalendar();
  });

  const filterDropdown = container.querySelector(".filter-serial-dropdown");
  filterDropdown.value = calendarFilterSerial;
  filterDropdown.addEventListener("change", e => {
    calendarFilterSerial = e.target.value;
    if (currentRole === "viewer") { renderCalendarViewPortal(); return; }
    renderCalendar();
    renderAdminCalendar();
  });

  container.querySelectorAll(".calendar-view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      calendarViewMode = btn.dataset.view;
      if (currentRole === "viewer") { renderCalendarViewPortal(); return; }
      renderCalendar();
      renderAdminCalendar();
    });
  });

  const bodyContent = container.querySelector(".calendar-body-content");
  
  const activeBookings = bookings.filter(b => b.status === "APPROVED" || b.status === "PENDING");
  const filteredEvents = activeBookings.filter(b => {
    if (calendarFilterSerial === "all") return true;
    return b.facilityId === calendarFilterSerial;
  });

  if (calendarViewMode === "month") {
    renderMonthView(bodyContent, filteredEvents, isForAdmin);
  } else if (calendarViewMode === "week") {
    renderWeekView(bodyContent, filteredEvents, isForAdmin);
  } else {
    renderDayView(bodyContent, filteredEvents, isForAdmin);
  }

  lucide.createIcons();
}

function adjustCalendarDate(direction) {
  if (calendarViewMode === "month") {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
  } else if (calendarViewMode === "week") {
    calendarDate.setDate(calendarDate.getDate() + direction * 7);
  } else {
    calendarDate.setDate(calendarDate.getDate() + direction);
  }
}

function renderMonthView(container, events, isForAdmin) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const startGrid = new Date(startOfMonth);
  startGrid.setDate(startGrid.getDate() - startGrid.getDay());

  let html = `
    <div class="calendar-month-grid">
      <div class="calendar-weekday-header">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>
  `;

  const tempDate = new Date(startGrid);
  const today = new Date();
  
  for (let i = 0; i < 42; i++) {
    const isToday = tempDate.getDate() === today.getDate() && 
                    tempDate.getMonth() === today.getMonth() && 
                    tempDate.getFullYear() === today.getFullYear();
    const isOtherMonth = tempDate.getMonth() !== month;
    
    const yearStr = tempDate.getFullYear();
    const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dateStr = String(tempDate.getDate()).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dateStr}`;

    const dayEvents = events.filter(e => e.date === dateKey);

    let cellClass = "calendar-day-cell";
    if (isToday) cellClass += " today";
    if (isOtherMonth) cellClass += " other-month";

    html += `
      <div class="${cellClass}">
        <div class="calendar-day-number">${tempDate.getDate()}</div>
        <div class="calendar-day-events">
          ${dayEvents.map(e => `
            <div class="calendar-event-chip ${e.status.toLowerCase()}" 
                 title="${e.time} - ${e.facility} (${e.purpose})"
                 onclick="window.showCalendarEventDetail('${e.id}')">
              ${e.time.split(" – ")[0]} ${e.isExternal ? 'EXT' : e.facility}
            </div>
          `).join("")}
        </div>
      </div>
    `;
    
    tempDate.setDate(tempDate.getDate() + 1);
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderWeekView(container, events, isForAdmin) {
  const sunday = new Date(calendarDate);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  
  let html = `<div class="calendar-week-grid">`;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const tempDate = new Date(sunday);
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const isToday = tempDate.getDate() === today.getDate() && 
                    tempDate.getMonth() === today.getMonth() && 
                    tempDate.getFullYear() === today.getFullYear();

    const yearStr = tempDate.getFullYear();
    const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dateStr = String(tempDate.getDate()).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dateStr}`;

    const dayEvents = events.filter(e => e.date === dateKey);

    html += `
      <div class="calendar-week-day-card ${isToday ? 'today' : ''}" style="${isToday ? 'border-color:var(--primary); background:rgba(37,99,235,0.02);' : ''}">
        <div class="calendar-week-day-header">
          <div class="calendar-week-day-title">${weekdays[i]}</div>
          <div class="calendar-week-day-subtitle">${tempDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        </div>
        <div class="calendar-week-day-events">
          ${dayEvents.length ? dayEvents.map(e => `
            <div class="calendar-event-chip ${e.status.toLowerCase()}" 
                 style="white-space:normal; font-size:0.75rem; padding:0.4rem;"
                 title="${e.time} - ${e.facility} (${e.purpose})"
                 onclick="window.showCalendarEventDetail('${e.id}')">
              <strong style="display:block; font-size:0.65rem; color:var(--text-muted);">${e.time}</strong>
              ${e.isExternal ? 'EXT' : e.facility}
              <div style="font-size:0.65rem; font-weight:normal; opacity:0.8; margin-top:0.1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.purpose}</div>
            </div>
          `).join("") : `<div style="text-align:center; color:var(--text-muted); font-size:0.7rem; padding:2rem 0;">No bookings</div>`}
        </div>
      </div>
    `;

    tempDate.setDate(tempDate.getDate() + 1);
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderDayView(container, events, isForAdmin) {
  const yearStr = calendarDate.getFullYear();
  const monthStr = String(calendarDate.getMonth() + 1).padStart(2, '0');
  const dateStr = String(calendarDate.getDate()).padStart(2, '0');
  const dateKey = `${yearStr}-${monthStr}-${dateStr}`;

  const dayEvents = events.filter(e => e.date === dateKey);

  let html = `
    <div class="calendar-day-view-container">
      <div class="calendar-day-view-header">
        <i data-lucide="calendar-days" style="display:inline-block; vertical-align:middle; margin-right:0.5rem; width:18px;"></i>
        <span style="vertical-align:middle;">Schedule for ${calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
      </div>
      <div class="calendar-day-view-slots">
  `;

  TIME_SLOTS.forEach(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    
    const slotEvents = dayEvents.filter(e => {
      const parts = e.time.split(" – ");
      if (parts.length < 2) return false;
      const bStart = timeToMinutes(parts[0].trim());
      const bEnd = timeToMinutes(parts[1].trim());
      return slotStart < bEnd && bStart < slotEnd;
    });

    html += `
      <div class="calendar-day-view-slot">
        <div class="calendar-day-view-time-col">${slot.start} – ${slot.end}</div>
        <div class="calendar-day-view-events-col">
          ${slotEvents.length ? slotEvents.map(e => `
            <div class="cal-event ${e.status.toLowerCase()}" 
                 style="margin:0; padding:0.6rem 1rem; cursor:pointer;" 
                 onclick="window.showCalendarEventDetail('${e.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                  <strong style="color:var(--text-main); font-size:0.85rem;">${e.isExternal ? 'EXT' : e.facility}</strong>
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">(${e.time})</span>
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.1rem;">
                    Purpose: ${e.purpose} | Requester: ${e.requester} (${e.requesterRole})
                    ${e.pocName ? ` | POC: ${e.pocName} (${e.pocContact})` : ""}
                  </div>
                </div>
                <div class="feed-status ${e.status.toLowerCase()}" style="font-size:0.65rem;">${e.status}</div>
              </div>
            </div>
          `).join("") : `<span style="color:var(--text-muted); font-size:0.78rem; font-style:italic; padding-left:0.5rem;">Available</span>`}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function showCalendarEventDetail(bookingId) {
  const b = bookings.find(x => String(x.id) === String(bookingId));
  if (!b) return;

  let overlay = document.getElementById("calDetailOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "calDetailOverlay";
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="modal active" style="max-width: 480px; display:block;">
      <button class="modal-close" onclick="window.closeCalDetail()">
        <i data-lucide="x"></i>
      </button>
      <div class="modal-header">
        <div class="modal-badge">
          <i data-lucide="info"></i>
          <span>Reservation Details</span>
        </div>
        <h2 style="margin-top:0.5rem;">${b.facility}</h2>
      </div>
      <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem;">
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Time & Date</div>
          <div style="font-size:0.95rem; font-weight:600; color:var(--text-main); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
            <i data-lucide="calendar" style="width:16px; color:var(--primary);"></i>
            ${formatDateFull(b.date)} | ${b.time}
          </div>
        </div>

        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Purpose & Attendees</div>
          <div style="font-size:0.95rem; font-weight:600; color:var(--text-main); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
            ${b.purpose}
            ${b.isExternal ? `<span style="font-size:0.65rem; background:#ef4444; color:white; padding:1px 5px; border-radius:4px; font-weight:800;">EXT</span>` : ''}
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
            <i data-lucide="users" style="width:14px;"></i>
            Attendees: ${b.attendees}
          </div>
        </div>

        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Requester</div>
          <div style="font-size:0.9rem; font-weight:600; color:var(--text-main); margin-top:0.15rem;">
            ${b.requester} (${b.requesterRole})
          </div>
        </div>

        ${b.pocName ? `
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Point of Contact</div>
          <div style="font-size:0.9rem; font-weight:600; color:var(--text-main); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
            <i data-lucide="user" style="width:15px; color:var(--accent);"></i>
            ${b.pocName} (${b.pocContact})
          </div>
        </div>` : ""}

        ${b.requirements ? `
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Requirements</div>
          <div style="font-size:0.85rem; color:var(--primary); font-weight:600; background:rgba(37,99,235,0.05); padding:0.5rem 0.75rem; border-radius:8px; margin-top:0.25rem;">
            ${b.requirements}
          </div>
        </div>` : ""}

        ${(b.status === "APPROVED" || b.status === "REJECTED") && b.approvedByName ? `
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Approval Details</div>
          <div style="font-size:0.9rem; font-weight:600; color:var(--text-main); margin-top:0.15rem; display:flex; align-items:center; gap:0.4rem;">
            <i data-lucide="${b.status === 'APPROVED' ? 'check-circle' : 'x-circle'}" style="width:15px; color:${b.status === 'APPROVED' ? 'var(--success)' : '#ef4444'};"></i>
            <span>${b.status === 'APPROVED' ? 'Approved' : 'Declined'} by <strong>${b.approvedByName}</strong></span>
          </div>
          ${b.cancelReason ? `
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem; font-style:italic;">
            Remarks: ${b.cancelReason}
          </div>` : ""}
        </div>
        ` : ""}

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--surface-border); padding-top:1rem; margin-top:0.5rem;">
          <div style="font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
            Status: 
            <span class="feed-status ${b.status.toLowerCase()}">${b.status}</span>
          </div>
          <button class="btn btn-secondary" onclick="window.closeCalDetail()" style="padding:0.5rem 1.2rem;">Close</button>
        </div>
      </div>
    </div>
  `;
  
  lucide.createIcons();
  overlay.classList.add("active");
}

window.showCalendarEventDetail = showCalendarEventDetail;
window.closeCalDetail = () => {
  const overlay = document.getElementById("calDetailOverlay");
  if (overlay) overlay.classList.remove("active");
};



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

  let list = bookings.filter(b => b.requesterId === currentUserProfile.id);
  if (myBookingsFilter !== "all") {
    list = list.filter(b => b.status === myBookingsFilter);
  }

  if (!list.length) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:3rem;">No bookings found.</p>`;
    return;
  }

  container.innerHTML = list.map(b => `
    <div class="my-booking-card">
      <div class="my-booking-left">
        <div class="my-booking-facility">
          ${b.facility}
          ${b.isExternal ? `<span style="font-size:0.65rem; background:#ef4444; color:white; padding:1px 5px; border-radius:4px; margin-left:0.5rem; vertical-align:middle; font-weight:800;">EXT</span>` : ''}
        </div>
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
        ${b.pocName ? `
        <div class="my-booking-poc" style="font-size:0.78rem;color:var(--text-muted);margin-top:0.4rem;display:flex;align-items:center;gap:0.35rem;">
          <i data-lucide="user" style="width:13px;height:13px;color:var(--accent);"></i>
          <span><strong>POC:</strong> ${b.pocName} (${b.pocContact})</span>
        </div>` : ''}
      </div>
      <div class="my-booking-status-col">
        <div class="feed-status ${b.status.toLowerCase()}">${b.status}</div>
        ${b.status === "APPROVED" ? `
          <div class="my-booking-note" style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; text-align:right;">
            <span style="display:inline-flex; align-items:center; gap:4px; color:var(--success); font-weight:600;"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> Confirmed</span>
            ${b.approvedByName ? `<span style="font-size:0.7rem; color:var(--text-muted);">By: <strong>${b.approvedByName}</strong></span>` : ""}
          </div>` : ""}
        ${b.status === "REJECTED" ? `
          <div class="my-booking-note" style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; color:#ef4444; text-align:right;">
            <span style="display:inline-flex; align-items:center; gap:4px; font-weight:600;"><i data-lucide="x-circle" style="width:12px;height:12px;"></i> Declined</span>
            ${b.approvedByName ? `<span style="font-size:0.7rem; color:var(--text-muted);">By: <strong>${b.approvedByName}</strong></span>` : ""}
          </div>` : ""}
        ${b.status === "PENDING"  ? `<div class="my-booking-note"><i data-lucide="clock" style="width:12px;height:12px;color:var(--warning);"></i> Awaiting Review</div>` : ""}
      </div>
    </div>
  `).join("");
  lucide.createIcons();
}

/* ── RECURRING BOOKING HELPERS ── */
function syncRecurringWeekdayFromDate() {
  const dateStr = document.getElementById("selectedDate").value;
  if (!dateStr) return;
  
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  
  document.querySelectorAll(".recurring-day-btn").forEach(btn => {
    btn.classList.remove("active");
    if (parseInt(btn.dataset.day) === dayOfWeek) {
      btn.classList.add("active");
    }
  });
}

function formatRecurringDate(dateObj) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days[dateObj.getDay()];
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  const y = dateObj.getFullYear();
  return `${day} ${m}/${d}/${y}`;
}

function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return "";
  let [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  const mStr = String(m).padStart(2, '0');
  return `${h}:${mStr} ${ampm}`;
}

function updateRecurringSummary() {
  const recurringCheckbox = document.getElementById("bookingRecurring");
  if (!recurringCheckbox) return;
  
  const recurringPanel = document.getElementById("recurringOptionsPanel");
  const summarySpan = document.getElementById("recurringSummarySpan");
  if (!summarySpan) return;
  
  if (!recurringCheckbox.checked) {
    if (recurringPanel) recurringPanel.classList.add("hidden");
    return;
  }
  
  if (recurringPanel) recurringPanel.classList.remove("hidden");
  
  const dateStr = document.getElementById("selectedDate").value;
  let startDateObj = new Date();
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    startDateObj = new Date(y, m - 1, d);
  }
  
  const startTimeVal = document.getElementById("startTime").value;
  const endTimeVal = document.getElementById("endTime").value;
  const start12 = formatTimeTo12Hour(startTimeVal) || "3:00 PM";
  const end12 = formatTimeTo12Hour(endTimeVal) || "3:30 PM";
  
  const interval = parseInt(document.getElementById("recurringInterval").value) || 1;
  const unit = document.getElementById("recurringUnit").value || "week";
  
  let freqText = "";
  if (unit === "day") {
    freqText = `Occurs every ${interval > 1 ? `${interval} days` : "day"}`;
  } else if (unit === "week") {
    const activeButtons = Array.from(document.querySelectorAll(".recurring-day-btn.active"));
    const daysShort = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayNames = activeButtons.map(btn => {
      const d = parseInt(btn.dataset.day);
      return daysShort[d];
    });
    
    let daysStr = "";
    if (dayNames.length === 0) {
      daysStr = "week";
    } else if (dayNames.length === 1) {
      daysStr = dayNames[0];
    } else if (dayNames.length === 2) {
      daysStr = dayNames.join(" and ");
    } else {
      daysStr = dayNames.slice(0, -1).join(", ") + ", and " + dayNames[dayNames.length - 1];
    }
    
    if (interval === 1) {
      freqText = `Occurs every ${daysStr}`;
    } else {
      freqText = `Occurs every ${interval} weeks on ${daysStr}`;
    }
  } else if (unit === "month") {
    freqText = `Occurs every ${interval > 1 ? `${interval} months` : "month"}`;
  }
  
  const startFormatted = formatRecurringDate(startDateObj);
  const untilDateVal = document.getElementById("recurringUntilDate").value;
  let untilFormatted = "";
  if (untilDateVal) {
    const [uy, um, ud] = untilDateVal.split("-").map(Number);
    untilFormatted = formatRecurringDate(new Date(uy, um - 1, ud));
  } else {
    untilFormatted = "forever";
  }
  
  const summary = `${freqText} from ${start12} to ${end12} effective ${startFormatted} until ${untilFormatted}`;
  summarySpan.innerText = summary;
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
    <span style="margin-left: 0.75rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;">
      <i data-lucide="map-pin" style="width: 13px; height: 13px; color: var(--primary);"></i>
      ${selectedFacility.location || 'Main Campus'}
    </span>
  `;

  bookingForm.reset();

  selectedStartSlotIdx = null;
  selectedEndSlotIdx = null;
  dateSelectorOffset = 0;
  document.getElementById("selectedDate").value = "";
  
  const recurringCheckbox = document.getElementById("bookingRecurring");
  if (recurringCheckbox) recurringCheckbox.checked = false;
  const recurringPanel = document.getElementById("recurringOptionsPanel");
  if (recurringPanel) recurringPanel.classList.add("hidden");
  
  const externalCheckbox = document.getElementById("bookingExternal");
  if (externalCheckbox) externalCheckbox.checked = false;
  
  initDateSelector();
  renderTimeSlots();
  
  syncRecurringWeekdayFromDate();
  updateRecurringSummary();
  
  bookingModal.classList.add("active");
  lucide.createIcons();
}

function closeModal() {
  bookingModal.classList.remove("active");
  selectedFacility = null;
}

closeModalBtn.addEventListener("click", closeModal);
bookingModal.addEventListener("click", e => { if (e.target === bookingModal) closeModal(); });

let selectedStartSlotIdx = null;
let selectedEndSlotIdx = null;

const TIME_SLOTS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" }
];

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function isSlotBooked(facilityId, date, slotStart, slotEnd) {
  const sStart = timeToMinutes(slotStart);
  const sEnd = timeToMinutes(slotEnd);

  return bookings.some(b => {
    if (b.facilityId !== facilityId || b.date !== date) return false;
    if (b.status === "CANCELLED" || b.status === "REJECTED") return false;

    const parts = b.time.split(" – ");
    if (parts.length < 2) return false;
    const bStart = timeToMinutes(parts[0].trim());
    const bEnd = timeToMinutes(parts[1].trim());

    return sStart < bEnd && bStart < sEnd;
  });
}

function renderTimeSlots() {
  const grid = document.getElementById("timeSlotsGrid");
  const date = document.getElementById("selectedDate").value;

  if (!selectedFacility || !date) return;

  let html = "";
  TIME_SLOTS.forEach((slot, idx) => {
    const booked = isSlotBooked(selectedFacility.id, date, slot.start, slot.end);
    let classes = "time-slot-chip";
    if (booked) {
      classes += " booked";
    } else {
      const inRange = isSlotInRange(idx);
      if (inRange) {
        classes += " active";
      }
    }

    html += `
      <button type="button" class="${classes}" data-idx="${idx}" ${booked ? "disabled" : ""}>
        <span style="font-weight:700;">${slot.start} – ${slot.end}</span>
        ${booked ? '<span class="status-lbl">Booked</span>' : '<span class="status-lbl">Available</span>'}
      </button>
    `;
  });

  grid.innerHTML = html;

  grid.querySelectorAll(".time-slot-chip:not(.booked)").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      handleSlotClick(idx);
    });
  });

  updateSelectedTimeInputs();
}

function isSlotInRange(idx) {
  if (selectedStartSlotIdx === null) return false;
  if (selectedEndSlotIdx === null) {
    return idx === selectedStartSlotIdx;
  }
  return idx >= selectedStartSlotIdx && idx <= selectedEndSlotIdx;
}

function handleSlotClick(idx) {
  if (selectedStartSlotIdx === null) {
    selectedStartSlotIdx = idx;
    selectedEndSlotIdx = null;
  } else if (selectedEndSlotIdx === null) {
    if (idx === selectedStartSlotIdx) {
      selectedStartSlotIdx = null;
    } else if (idx > selectedStartSlotIdx) {
      // Check if intermediate slots are booked
      let hasBookedSlot = false;
      const date = document.getElementById("selectedDate").value;
      for (let i = selectedStartSlotIdx; i <= idx; i++) {
        if (isSlotBooked(selectedFacility.id, date, TIME_SLOTS[i].start, TIME_SLOTS[i].end)) {
          hasBookedSlot = true;
          break;
        }
      }
      if (hasBookedSlot) {
        showToast("Cannot select range containing booked slot(s)!");
        selectedStartSlotIdx = idx;
        selectedEndSlotIdx = null;
      } else {
        selectedEndSlotIdx = idx;
      }
    } else {
      selectedStartSlotIdx = idx;
      selectedEndSlotIdx = null;
    }
  } else {
    selectedStartSlotIdx = idx;
    selectedEndSlotIdx = null;
  }

  renderTimeSlots();
}

function updateSelectedTimeInputs() {
  const startInput = document.getElementById("startTime");
  const endInput = document.getElementById("endTime");
  const summary = document.getElementById("timeRangeSummary");

  if (selectedStartSlotIdx === null) {
    startInput.value = "";
    endInput.value = "";
    summary.innerHTML = `<i data-lucide="info" style="width:14px;height:14px;"></i> <span>Select a start and optional end slot</span>`;
  } else {
    const startSlot = TIME_SLOTS[selectedStartSlotIdx];
    const endSlot = selectedEndSlotIdx !== null ? TIME_SLOTS[selectedEndSlotIdx] : startSlot;

    startInput.value = startSlot.start;
    endInput.value = endSlot.end;

    const duration = (selectedEndSlotIdx !== null ? (selectedEndSlotIdx - selectedStartSlotIdx + 1) : 1);
    summary.innerHTML = `<i data-lucide="check-circle" style="width:14px;height:14px;color:var(--success);"></i> <span>Selected: ${startSlot.start} – ${endSlot.end} (${duration} Hr${duration > 1 ? 's' : ''})</span>`;
  }
  if (typeof updateRecurringSummary === "function") {
    updateRecurringSummary();
  }
  lucide.createIcons();
}

let dateSelectorOffset = 0;

function initDateSelector() {
  const selector = document.getElementById("dateSelector");
  const hidden   = document.getElementById("selectedDate");
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today  = new Date();
  let html = "";

  // Render a 5-day window starting from today + dateSelectorOffset
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(today.getDate() + dateSelectorOffset + i);
    const iso = d.toISOString().split("T")[0];
    const isSunday = d.getDay() === 0;

    let classes = "date-card";
    if (isSunday) {
      classes += " disabled";
    } else if (hidden.value === iso) {
      classes += " active";
    }

    html += `
      <div class="${classes}" ${isSunday ? '' : `data-val="${iso}"`}>
        <div class="date-card-day">${DAYS[d.getDay()]}</div>
        <div class="date-card-num">${d.getDate()}</div>
        <div class="date-card-month">${MONTHS[d.getMonth()]}</div>
        ${isSunday ? '<div style="font-size: 0.52rem; font-weight: 700; color: var(--text-muted); margin-top: 0.2rem; letter-spacing: 0.5px;">CLOSED</div>' : ''}
      </div>`;
  }

  selector.innerHTML = html;

  // Auto-select the first non-Sunday date if none is selected
  if (!hidden.value) {
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() + dateSelectorOffset + i);
      if (d.getDay() !== 0) {
        hidden.value = d.toISOString().split("T")[0];
        break;
      }
    }
    // Re-render to show active class
    initDateSelector();
    return;
  }

  selector.querySelectorAll(".date-card:not(.disabled)").forEach(card => {
    card.addEventListener("click", () => {
      selector.querySelectorAll(".date-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      hidden.value = card.dataset.val;
      selectedStartSlotIdx = null;
      selectedEndSlotIdx = null;
      renderTimeSlots();
      syncRecurringWeekdayFromDate();
      updateRecurringSummary();
    });
  });

  // Enable/disable prev/next buttons
  const prevBtn = document.getElementById("datePrevBtn");
  if (prevBtn) {
    prevBtn.disabled = (dateSelectorOffset <= 0);
    prevBtn.style.opacity = (dateSelectorOffset <= 0) ? "0.4" : "1";
    prevBtn.style.cursor = (dateSelectorOffset <= 0) ? "not-allowed" : "pointer";
  }
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
  const pocName  = document.getElementById("pocName").value.trim();
  const pocContact = document.getElementById("pocContact").value.trim();
  const isRecurring = document.getElementById("bookingRecurring").checked;
  const isExternal = document.getElementById("bookingExternal") ? document.getElementById("bookingExternal").checked : false;
  
  if (!start || !end) {
    showToast("Error: Please select at least one time slot!");
    return;
  }
  
  // Frontend Sunday Check
  const selectedDateObj = new Date(date);
  if (selectedDateObj.getDay() === 0) {
    showToast("Error: Bookings are not allowed on Sundays!");
    return;
  }

  // Frontend Time Range Check (08:00 to 16:00)
  if (start < "08:00" || start > "16:00" || end < "08:00" || end > "16:00") {
    showToast("Error: Bookings must be between 8:00 AM and 4:00 PM!");
    return;
  }

  let datesToBook = [];
  if (isRecurring) {
    const interval = parseInt(document.getElementById("recurringInterval").value) || 1;
    const unit = document.getElementById("recurringUnit").value;
    const activeDays = Array.from(document.querySelectorAll(".recurring-day-btn.active")).map(btn => parseInt(btn.dataset.day));
    
    const untilVal = document.getElementById("recurringUntilDate").value;
    let untilDate = new Date(selectedDateObj);
    if (untilVal) {
      const [uy, um, ud] = untilVal.split("-").map(Number);
      untilDate = new Date(uy, um - 1, ud);
    } else {
      untilDate.setDate(untilDate.getDate() + 28);
    }
    
    // Safety check: cap at 1 year or 100 occurrences
    const maxDate = new Date(selectedDateObj);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (untilDate > maxDate) untilDate = maxDate;
    
    let occurrencesCount = 0;
    const maxOccurrences = 100;
    
    if (unit === "day") {
      let currentDate = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 12, 0, 0);
      const targetUntil = new Date(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate(), 12, 0, 0);
      
      while (currentDate <= targetUntil && occurrencesCount < maxOccurrences) {
        if (currentDate.getDay() !== 0) {
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(currentDate.getDate()).padStart(2, '0');
          datesToBook.push(`${y}-${m}-${d}`);
          occurrencesCount++;
        }
        currentDate.setDate(currentDate.getDate() + interval);
      }
    } else if (unit === "week") {
      let tempDate = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 12, 0, 0);
      const targetUntil = new Date(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate(), 12, 0, 0);
      
      while (tempDate <= targetUntil && occurrencesCount < maxOccurrences) {
        const dayOfWeek = tempDate.getDay();
        if (activeDays.includes(dayOfWeek)) {
          const startSunday = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 12, 0, 0);
          startSunday.setDate(startSunday.getDate() - startSunday.getDay());
          
          const currentSunday = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 12, 0, 0);
          currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());
          
          const diffWeeks = Math.round((currentSunday - startSunday) / (7 * 24 * 60 * 60 * 1000));
          if (diffWeeks % interval === 0) {
            if (dayOfWeek !== 0) {
              const y = tempDate.getFullYear();
              const m = String(tempDate.getMonth() + 1).padStart(2, '0');
              const d = String(tempDate.getDate()).padStart(2, '0');
              const iso = `${y}-${m}-${d}`;
              if (iso >= date && !datesToBook.includes(iso)) {
                datesToBook.push(iso);
                occurrencesCount++;
              }
            }
          }
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }
    } else if (unit === "month") {
      let tempDate = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 12, 0, 0);
      const targetUntil = new Date(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate(), 12, 0, 0);
      
      while (tempDate <= targetUntil && occurrencesCount < maxOccurrences) {
        if (tempDate.getDay() !== 0) {
          const y = tempDate.getFullYear();
          const m = String(tempDate.getMonth() + 1).padStart(2, '0');
          const d = String(tempDate.getDate()).padStart(2, '0');
          const iso = `${y}-${m}-${d}`;
          if (iso >= date) {
            datesToBook.push(iso);
            occurrencesCount++;
          }
        }
        tempDate.setMonth(tempDate.getMonth() + interval);
      }
    }
  } else {
    datesToBook.push(date);
  }

  const bookingPromises = datesToBook.map(dateStr => {
    const newBooking = {
      facilityId:    selectedFacility.id,
      purpose,
      date:          dateStr,
      startTime:     start,
      endTime:       end,
      attendeeCount: count,
      requirements:  requirements || undefined,
      pocName,
      pocContact,
      isExternal:    isExternal,
      isRecurring:   isRecurring
    };
    return store.dispatch(createBooking(newBooking));
  });

  Promise.all(bookingPromises).then(() => {
    // Refresh visible panels instantly
    if (currentRole === 'faculty') {
      store.dispatch(fetchMyBookings()).then(() => {
        renderRecentBookings();
        renderCalendar();
        if (facultyPage === "myBookings") renderMyBookings();
      });
    } else {
      store.dispatch(fetchBookings()).then(() => {
        renderAdminCalendar();
        renderAdminDashboard();
      });
    }
  });
  renderRecentBookings();
  renderCalendar();
  renderAdminCalendar();
  if (facultyPage === "myBookings") renderMyBookings();

  const facilityLabel = selectedFacility.label;
  closeModal();
  showToast(`Booking request sent for ${facilityLabel}${isRecurring ? ' (Recurring)' : ''}!`);
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
        <td style="font-weight:700;">
          ${b.facility}
          ${b.isExternal ? `<div style="font-size:0.65rem; background:#ef4444; color:white; padding:1px 5px; border-radius:4px; margin-top:0.25rem; font-weight:800; width:fit-content;">EXT</div>` : ''}
        </td>
        <td>
          <div style="font-weight:600;">${b.purpose}</div>
          ${b.recurring ? `
          <div style="font-size:0.7rem;color:#7c3aed;margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;font-weight:700;background:rgba(124,58,237,0.06);padding:0.15rem 0.45rem;border-radius:4px;width:fit-content;">
            <i data-lucide="repeat" style="width:11px;height:11px;"></i>
            <span>Recurring Booking (Weekly)</span>
          </div>` : ""}
          ${b.requirements ? `
          <div style="font-size:0.75rem;color:var(--primary);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
            <i data-lucide="sliders" style="width:11px;height:11px;"></i>
            <span><strong>Req:</strong> ${b.requirements}</span>
          </div>` : ""}
          ${b.pocName ? `
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
            <i data-lucide="user" style="width:11px;height:11px;color:var(--accent);"></i>
            <span><strong>POC:</strong> ${b.pocName} (${b.pocContact})</span>
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
      btn.addEventListener("click", () => updateStatus(btn.dataset.id, "APPROVED"));
    });
    adminPendingList.querySelectorAll(".btn-reject").forEach(btn => {
      btn.addEventListener("click", () => updateStatus(btn.dataset.id, "REJECTED"));
    });
  }

  const historyBookings = bookings.filter(b => b.status !== 'PENDING');
  if (!historyBookings.length) {
    adminAllList.innerHTML = `
      <tr><td colspan="6" class="empty-row">
        <i data-lucide="archive" style="width:24px;height:24px;opacity:0.4;"></i>
        <div>No completed bookings yet.</div>
      </td></tr>`;
  } else {
    adminAllList.innerHTML = historyBookings.map(b => `
    <tr>
      <td>
        <div class="requester-name">${b.requester}</div>
        <div class="requester-role">${b.requesterRole}</div>
      </td>
      <td style="font-weight:700;">
        ${b.facility}
        ${b.isExternal ? `<div style="font-size:0.65rem; background:#ef4444; color:white; padding:1px 5px; border-radius:4px; margin-top:0.25rem; font-weight:800; width:fit-content;">EXT</div>` : ''}
      </td>
      <td>
        <div style="font-weight:600;">${b.purpose}</div>
        ${b.recurring ? `
        <div style="font-size:0.7rem;color:#7c3aed;margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;font-weight:700;background:rgba(124,58,237,0.06);padding:0.15rem 0.45rem;border-radius:4px;width:fit-content;">
          <i data-lucide="repeat" style="width:11px;height:11px;"></i>
          <span>Recurring Booking (Weekly)</span>
        </div>` : ""}
        ${b.requirements ? `
        <div style="font-size:0.75rem;color:var(--primary);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
          <i data-lucide="sliders" style="width:11px;height:11px;"></i>
          <span><strong>Req:</strong> ${b.requirements}</span>
        </div>` : ""}
        ${b.pocName ? `
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
          <i data-lucide="user" style="width:11px;height:11px;color:var(--accent);"></i>
          <span><strong>POC:</strong> ${b.pocName} (${b.pocContact})</span>
        </div>` : ""}
        ${b.cancelReason ? `
        <div style="font-size:0.75rem;color:#ef4444;margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem;">
          <i data-lucide="alert-circle" style="width:11px;height:11px;"></i>
          <span><strong>Reason:</strong> ${b.cancelReason}</span>
        </div>` : ""}
      </td>
      <td>
        <div style="font-weight:600;">${formatDate(b.date)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${b.time}</div>
      </td>
      <td>
        <div class="feed-status ${b.status.toLowerCase()}">${b.status === 'APPROVED' ? 'Accepted' : b.status === 'REJECTED' ? 'Rejected' : b.status}</div>
        ${(b.status === "APPROVED" || b.status === "REJECTED") && b.approvedByName ? `
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.3rem; display:flex; align-items:center; gap:0.25rem;">
            <i data-lucide="${b.status === 'APPROVED' ? 'user-check' : 'user-x'}" style="width:11px; height:11px; color:${b.status === 'APPROVED' ? 'var(--success)' : '#ef4444'};"></i>
            <span>${b.status === 'APPROVED' ? 'Accepted' : 'Rejected'} by <strong>${b.approvedByName}</strong></span>
          </div>
        ` : ""}
      </td>
      <td>
        ${b.status === "APPROVED" ? `
          <div class="actions-cell">
            <button class="btn-reject btn-action btn-cancel-approved" data-id="${b.id}" title="Cancel Approved Booking">
              <i data-lucide="x" style="width:18px;height:18px;"></i>
            </button>
          </div>
        ` : `
          <span style="font-size:0.75rem;color:var(--text-muted);font-style:italic;">—</span>
        `}
      </td>
    </tr>
  `).join("");

    adminAllList.querySelectorAll(".btn-cancel-approved").forEach(btn => {
      btn.addEventListener("click", () => {
        updateStatus(btn.dataset.id, "REJECTED");
      });
    });
  }

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
        <div class="upcoming-facility">
          ${b.facility}
          ${b.isExternal ? `<span style="font-size:0.6rem; background:#ef4444; color:white; padding:1px 4px; border-radius:4px; margin-left:0.4rem; vertical-align:middle; font-weight:800;">EXT</span>` : ''}
        </div>
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
          Reason: ${b.cancelReason || (b.status === 'REJECTED' ? 'Declined by Admin' : 'Cancelled by Faculty')}
        </div>
      </div>
    </div>
  `).join("");
}

function openCancellationModal(bookingId, targetStatus) {
  pendingCancellationBookingId = bookingId;
  pendingCancellationStatus = targetStatus;
  
  const modal = document.getElementById("cancelReasonModal");
  const reasonInput = document.getElementById("cancelReasonInput");
  if (modal && reasonInput) {
    reasonInput.value = "";
    modal.classList.add("active");
  }
}

function initCancellationModal() {
  const modal = document.getElementById("cancelReasonModal");
  const closeBtn = document.getElementById("closeCancelReasonModal");
  const abortBtn = document.getElementById("btnCancelReasonAbort");
  const submitBtn = document.getElementById("btnCancelReasonSubmit");
  const reasonInput = document.getElementById("cancelReasonInput");

  if (!modal) return;

  const closeModal = () => {
    modal.classList.remove("active");
    pendingCancellationBookingId = null;
  };

  closeBtn.addEventListener("click", closeModal);
  abortBtn.addEventListener("click", closeModal);

  submitBtn.addEventListener("click", () => {
    const reason = reasonInput.value.trim();
    if (!reason) {
      showToast("Error: Please provide a cancellation reason!");
      return;
    }
    
    if (pendingCancellationBookingId !== null) {
      store.dispatch(updateBookingStatus({
        id: pendingCancellationBookingId,
        status: pendingCancellationStatus,
        remarks: reason
      })).then(() => {
        // Refresh data after update
        if (currentRole === 'faculty') {
          store.dispatch(fetchMyBookings()).then(() => {
            renderRecentBookings();
            renderCalendar();
            if (facultyPage === "myBookings") renderMyBookings();
          });
        } else {
          store.dispatch(fetchBookings()).then(() => {
            renderAdminDashboard();
            renderCalendar();
            renderAdminCalendar();
          });
        }
        
        showToast(`Booking ${pendingCancellationStatus.toLowerCase()} successfully!`);
        closeModal();
      });
    }
  });
}

function updateStatus(id, status) {
  if (status === "REJECTED" || status === "CANCELLED") {
    openCancellationModal(id, status);
    return;
  }

  console.log('[updateStatus] id:', id, 'status:', status);
  store.dispatch(updateBookingStatus({ id, status })).then((action) => {
    if (action.type.endsWith('/rejected')) {
      console.error('[updateStatus] PATCH failed:', action.payload);
      showToast('Error: ' + (action.payload || 'Failed to update booking'));
      return;
    }
    store.dispatch(fetchBookings()).then(() => {
      renderAdminDashboard();
      renderCalendar();
      renderAdminCalendar();
      showToast(`Booking ${status.toLowerCase()} successfully!`);
    });
  });
}

/* =========================================
   ADMIN: MANAGE USERS & VENUES
   ========================================= */
function renderAdminManage() {
  const usersList = document.getElementById("adminManageUsersList");
  const venuesList = document.getElementById("adminManageVenuesList");
  
  if (!usersList || !venuesList) return;
  
  // Hide form containers and buttons if not superadmin
  const isSuperAdmin = currentRole === "superadmin";
  const addUserBtn = document.getElementById("btnAddUserBtn");
  const addVenueBtn = document.getElementById("btnAddVenueBtn");
  
  if (addUserBtn) {
    addUserBtn.style.display = isSuperAdmin ? "flex" : "none";
  }
  if (addVenueBtn) {
    addVenueBtn.style.display = isSuperAdmin ? "flex" : "none";
  }
  
  if (!isSuperAdmin) {
    const addUserForm = document.getElementById("addUserFormContainer");
    const addVenueForm = document.getElementById("addVenueFormContainer");
    if (addUserForm) addUserForm.classList.add("hidden");
    if (addVenueForm) addVenueForm.classList.add("hidden");
  }

  // Render users list
  usersList.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1.5rem;"><i data-lucide="loader" style="width:16px;height:16px;display:inline-block;animation:spin 1s linear infinite;"></i> Loading users…</td></tr>`;
  lucide.createIcons();

  const token = localStorage.getItem('token');
  fetch(`${API_BASE_URL}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      usersList.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444;padding:1.5rem;">Error loading users: ${data.error}</td></tr>`;
      return;
    }
    const profiles = data.users;
    supabaseUsers = profiles;

    if (!profiles.length) {
      usersList.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No users found.</td></tr>`;
    } else {
      const roleColors = { superadmin: "#8b5cf6", admin: "#2563eb", faculty: "#059669", viewer: "#64748b" };
      usersList.innerHTML = profiles.map(u => `
        <tr>
          <td>
            <div style="font-weight:700; color:var(--text-main);">${escapeHtml(u.name)}</div>
            <div style="font-size:0.73rem; color:var(--text-muted);">${escapeHtml(u.email)}</div>
          </td>
          <td>
            <span style="font-size:0.72rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:20px; background:${roleColors[u.role] || '#64748b'}22; color:${roleColors[u.role] || '#64748b'}; text-transform:capitalize;">${u.role}</span>
          </td>
          <td>
            ${u.first_login
              ? `<span style="font-size:0.7rem;font-weight:700;color:#f59e0b;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="clock" style="width:12px;height:12px;"></i> Pending first login</span>`
              : `<span style="font-size:0.7rem;font-weight:700;color:#10b981;display:inline-flex;align-items:center;gap:0.25rem;"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> Active</span>`
            }
          </td>
          <td>
            <div class="actions-cell">
              ${isSuperAdmin ? `
                <button class="btn-reject btn-action btn-delete-user" data-uid="${u.id}" title="Delete User" style="background:rgba(239,68,68,0.06); border-color:rgba(239,68,68,0.12); color:#ef4444;">
                  <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                </button>
              ` : `<span style="font-size:0.75rem;color:var(--text-muted);font-style:italic;">N/A</span>`}
            </div>
          </td>
        </tr>
      `).join("");

      if (isSuperAdmin) {
        usersList.querySelectorAll(".btn-delete-user").forEach(btn => {
          btn.addEventListener("click", () => {
            window.deleteUser(btn.dataset.uid);
          });
        });
      }
    }
    lucide.createIcons();
  })
  .catch(err => {
    usersList.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444;padding:1.5rem;">Error loading users: ${err.message}</td></tr>`;
  });
  
  // Render venues list
  if (!facilities.length) {
    venuesList.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No facilities registered.</td></tr>`;
  } else {
    venuesList.innerHTML = facilities.map((f, index) => {
      const sn = String(index + 1).padStart(2, "0");
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:0.75rem; font-weight:700; background:rgba(37,99,235,0.08); color:var(--primary); padding:0.15rem 0.4rem; border-radius:4px;">${sn}</span>
              <div style="font-weight:700; color:var(--text-main);">${f.label}</div>
            </div>
          </td>
          <td>
            <div style="font-size:0.78rem; color:var(--text-muted);">
              <strong>Cap:</strong> ${f.capacity} | <strong>Cat:</strong> ${f.category}
            </div>
            <div style="font-size:0.7rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:220px;" title="${f.desc}">
              ${f.desc}
            </div>
          </td>
          <td>
            <div class="actions-cell">
              ${isSuperAdmin ? `
                <button class="btn-reject btn-action btn-delete-venue" data-id="${f.id}" title="Delete Venue" style="background:rgba(239,68,68,0.06); border-color:rgba(239,68,68,0.12); color:#ef4444;">
                  <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                </button>
              ` : `<span style="font-size:0.75rem;color:var(--text-muted);font-style:italic;">N/A</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (isSuperAdmin) {
      venuesList.querySelectorAll(".btn-delete-venue").forEach(btn => {
        btn.addEventListener("click", () => {
          window.deleteVenue(btn.dataset.id);
        });
      });
    }
  }
  
  lucide.createIcons();
}

window.toggleAddUserForm = function() {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const container = document.getElementById("addUserFormContainer");
  if (container) {
    container.classList.toggle("hidden");
  }
};

window.submitAddUser = async function() {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const nameInput    = document.getElementById("addUserNameInput");
  const emailInput   = document.getElementById("addUserEmailInput");
  const roleSelect   = document.getElementById("addUserRoleSelect");
  const tempPwdInput = document.getElementById("addUserTempPwdInput");
  const errEl        = document.getElementById("addUserServerError");
  const saveBtn      = document.getElementById("saveUserBtn");

  if (!nameInput || !emailInput || !roleSelect || !tempPwdInput) return;

  const name    = nameInput.value.trim();
  const email   = emailInput.value.trim();
  const role    = roleSelect.value;
  const tempPwd = tempPwdInput.value.trim();

  if (errEl) errEl.classList.add("hidden");

  if (!name || !email || !tempPwd) {
    if (errEl) { errEl.textContent = "All fields are required."; errEl.classList.remove("hidden"); }
    return;
  }
  if (tempPwd.length < 6) {
    if (errEl) { errEl.textContent = "Temporary password must be at least 6 characters."; errEl.classList.remove("hidden"); }
    return;
  }

  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Creating…"; }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, email: email.toLowerCase(), password: tempPwd, role })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create user");

    nameInput.value    = "";
    emailInput.value   = "";
    tempPwdInput.value = "";
    document.getElementById("addUserFormContainer").classList.add("hidden");

    renderAdminManage();
    showToast(`User ${name} created successfully!`);
  } catch (err) {
    if (errEl) { errEl.textContent = err.message || "Failed to create user."; errEl.classList.remove("hidden"); }
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Create User"; }
  }
};

window.toggleAddVenueForm = function() {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const container = document.getElementById("addVenueFormContainer");
  if (container) {
    container.classList.toggle("hidden");
  }
};

window.submitAddVenue = async function() {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const nameInput = document.getElementById("addVenueNameInput");
  const capacityInput = document.getElementById("addVenueCapacityInput");
  const categorySelect = document.getElementById("addVenueCategorySelect");
  const iconInput = document.getElementById("addVenueIconInput");
  const descInput = document.getElementById("addVenueDescInput");
  const urlInput = document.getElementById("addVenueImageUrlInput");
  const fileInput = document.getElementById("addVenueImageFileInput");
  
  if (!nameInput || !capacityInput || !categorySelect || !iconInput || !descInput) return;
  
  const label = nameInput.value.trim();
  const capacity = capacityInput.value.trim();
  const category = categorySelect.value;
  const icon = iconInput.value.trim() || "building-2";
  const desc = descInput.value.trim();
  
  if (!label || !capacity || !desc) {
    showToast("Error: Name, capacity, and description are required!");
    return;
  }
  
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  
  if (facilities.some(f => f.id === id)) {
    showToast("Error: A facility with this name already exists!");
    return;
  }
  
  let image = "";
  if (uploadedVenueImageBase64) {
    image = uploadedVenueImageBase64;
  } else if (urlInput && urlInput.value.trim()) {
    image = urlInput.value.trim();
  }
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/facilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: label,
        capacity: capacity,
        category: category,
        description: desc,
        icon: icon,
        images: image ? [image] : [],
        type: 'OTHER',
        location: 'Main Campus',
        isActive: true
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create venue");
    }

    nameInput.value = "";
    capacityInput.value = "";
    iconInput.value = "";
    descInput.value = "";
    if (urlInput) urlInput.value = "";
    if (fileInput) fileInput.value = "";
    uploadedVenueImageBase64 = null;
    
    document.getElementById("addVenueFormContainer").classList.add("hidden");
    
    // Refresh facilities via Redux
    await store.dispatch(fetchFacilities());
    
    renderAdminManage();
    renderGrid();
    renderCalendar();
    renderAdminCalendar();
    renderAdminDashboard();
    showToast(`Venue ${label} created successfully!`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

window.deleteUser = async function(uid) {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const profile = supabaseUsers.find(u => u.id === uid);
  const uName   = profile ? profile.name : "User";

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/admin/users/${uid}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to delete user");
    }

    supabaseUsers = supabaseUsers.filter(u => u.id !== uid);
    renderAdminManage();
    showToast(`User ${uName} removed!`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

window.deleteVenue = async function(facilityId) {
  if (currentRole !== "superadmin") {
    showToast("Error: Unauthorized action!");
    return;
  }
  const fIndex = facilities.findIndex(f => f.id === facilityId);
  if (fIndex === -1) return;
  const fLabel = facilities[fIndex].label;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/facilities/${facilityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to delete venue");
    }

    await store.dispatch(fetchFacilities());
    renderAdminManage();
    renderGrid();
    renderCalendar();
    renderAdminCalendar();
    renderAdminDashboard();
    showToast(`Venue ${fLabel} deleted!`);
  } catch(err) {
    showToast(`Error: ${err.message}`);
  }
};

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
function initDateSelectorNav() {
  const prevBtn = document.getElementById("datePrevBtn");
  const nextBtn = document.getElementById("dateNextBtn");

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      if (dateSelectorOffset > 0) {
        dateSelectorOffset--;
        initDateSelector();
      }
    });

    nextBtn.addEventListener("click", () => {
      dateSelectorOffset++;
      initDateSelector();
    });
  }
}
async function initApp() {
  if (localStorage.getItem('token')) {
    enterDashboard();
  } else {
    showLoginPage();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSearch();
  initCancellationModal();
  initDateSelectorNav();

  // Set up password visibility toggles
  setupPasswordToggle("toggleLoginPwd",   "toggleLoginPwdIcon",   "loginPassword");
  setupPasswordToggle("toggleCurrentPwd", "toggleCurrentPwdIcon", "currentPassword");
  setupPasswordToggle("toggleNewPwd",     "toggleNewPwdIcon",     "newPassword");
  setupPasswordToggle("toggleConfirmPwd", "toggleConfirmPwdIcon", "confirmPassword");

  // Profile Dropdown toggle
  const badge = document.getElementById("navUserBadge");
  if (badge) {
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = document.getElementById("profileDropdownMenu");
      if (menu) menu.classList.toggle("hidden");
    });
  }

  // Close dropdown on click outside
  document.addEventListener("click", () => {
    const menu = document.getElementById("profileDropdownMenu");
    if (menu) menu.classList.add("hidden");
  });

  // Dropdown Action: Change Password
  const dropdownChangePwdBtn = document.getElementById("dropdownChangePwdBtn");
  if (dropdownChangePwdBtn) {
    dropdownChangePwdBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openChangePasswordScreen();
    });
  }

  const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");
  if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      store.dispatch(logoutAction());
      currentRole        = null;
      currentUserProfile = null;
      supabaseUsers      = [];
      hideAllViews();
      loginView.classList.remove("hidden");
      lucide.createIcons();
    });
  }

  // Settings page "Change Password" buttons
  document.querySelectorAll(".open-change-pwd-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openChangePasswordScreen();
    });
  });
  
  // Set up venue image file listener
  const fileInput = document.getElementById("addVenueImageFileInput");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedVenueImageBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        uploadedVenueImageBase64 = null;
      }
    });
  }

  // Set up recurring booking listeners
  const recurringCheckbox = document.getElementById("bookingRecurring");
  if (recurringCheckbox) {
    recurringCheckbox.addEventListener("change", () => {
      const recurringPanel = document.getElementById("recurringOptionsPanel");
      if (recurringCheckbox.checked) {
        if (recurringPanel) recurringPanel.classList.remove("hidden");
        
        // Initialize default until date (28 days later)
        const dateStr = document.getElementById("selectedDate").value;
        if (dateStr) {
          const [y, m, d] = dateStr.split("-").map(Number);
          const startDate = new Date(y, m - 1, d);
          const defaultUntil = new Date(startDate);
          defaultUntil.setDate(defaultUntil.getDate() + 28);
          document.getElementById("recurringUntilDate").value = defaultUntil.toISOString().split("T")[0];
        }
        
        syncRecurringWeekdayFromDate();
        updateRecurringSummary();
      } else {
        if (recurringPanel) recurringPanel.classList.add("hidden");
      }
    });
  }

  const intervalSelect = document.getElementById("recurringInterval");
  if (intervalSelect) {
    intervalSelect.addEventListener("change", updateRecurringSummary);
  }

  const unitSelect = document.getElementById("recurringUnit");
  if (unitSelect) {
    unitSelect.addEventListener("change", () => {
      const weekdaysGroup = document.getElementById("recurringWeekdaysGroup");
      if (unitSelect.value === "week") {
        if (weekdaysGroup) weekdaysGroup.style.display = "flex";
      } else {
        if (weekdaysGroup) weekdaysGroup.style.display = "none";
      }
      updateRecurringSummary();
    });
  }

  const untilDateInput = document.getElementById("recurringUntilDate");
  if (untilDateInput) {
    untilDateInput.addEventListener("change", updateRecurringSummary);
  }

  document.querySelectorAll(".recurring-day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      updateRecurringSummary();
    });
  });
  
  initApp();
  lucide.createIcons();
});
