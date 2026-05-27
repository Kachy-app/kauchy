// Shared navigation component for all pages
async function initializeNavigation() {
  const userData = localStorage.getItem("userData")


  // Only create navbar if it doesn't exist
  if (document.querySelector(".navbar")) {
    initializeNavbarEvents()
    return
  }

  // Create navbar HTML
  const navHTML = `
    <nav class="navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          <button class="mobile-menu-btn" id="mobileMenuBtn" title="Menu">
            ☰
          </button>
          <a href="index.html" class="logo" title="Home">
            <img src="https://icuklzexzhusblkzglnr.supabase.co/storage/v1/object/public/marketplace/logo/Upstart(2).png" alt="Upstart" class="logo-image">
          </a>
        </div>

        <div class="navbar-center">
          <div class="search-bar desktop-search">
            <input 
              type="text" 
              id="sharedSearchInput" 
              placeholder="Search products..."
              class="search-input"
            >
            <span class="search-icon">🔍</span>
          </div>
        </div>

        <div class="navbar-right">
          <!-- Mobile search toggle (hidden on desktop via css) -->
          <button class="nav-button search-toggle-btn mobile-only" id="mobileSearchToggle" title="Search">
            🔍
          </button>
          <div class="navbar-item auth" id="authControls" style="display:none;">
            <!-- Auth controls (Login / Signup) will be injected here -->
          </div>
          <div class="navbar-item desktop-only">
            <a href="leaderboard.html" class="nav-link" title="Leaderboard">
              🏆 <span class="nav-text">Leaderboard</span>
            </a>
          </div>
          <div class="navbar-item desktop-only">
            <a href="analytics.html" class="nav-link vendor-only" style="display:none;" id="analyticsLink" title="Analytics">
              📊 <span class="nav-text">Analytics</span>
            </a>
          </div>
          <div class="navbar-item wallet-item">
            <a href="wallet.html" class="nav-link" title="Wallet" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border-radius: 8px; text-decoration: none; font-weight: 500;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
              <span class="wallet-balance" id="walletBalance">₦0</span>
            </a>
          </div>
          <div class="navbar-item">
            <a href="cart.html" class="nav-link" title="Cart">
              🛒 <span class="badge" id="cartBadge">0</span>
            </a>
          </div>
          <div class="navbar-item notifications">
            <button class="nav-button notifications-btn" id="notificationsBtn" title="Notifications">
              🔔 <span class="badge" id="notificationsBadge">0</span>
            </button>
            <div class="notifications-dropdown" id="notificationsDropdown">
              <div class="notifications-list" id="notificationsList">
                <p class="empty-notifications">No notifications</p>
              </div>
            </div>
          </div>
          <div class="navbar-item profile desktop-only">
            <button class="nav-button profile-btn" id="profileBtn" title="Profile">
              👤
            </button>
            <div class="profile-dropdown" id="profileDropdown">
              <a href="profile.html" class="dropdown-item" id="viewProfile">View Profile</a>
              <a href="inventory.html" class="dropdown-item vendor-only" style="display:none;" id="inventoryLink">My Inventory</a>
              <a href="orders.html" class="dropdown-item">Orders</a>
              <a href="chat.html" class="dropdown-item">Messages</a>
              <a href="#" class="dropdown-item logout-item" id="logoutBtn">Logout</a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Search bar container (initially hidden on mobile) -->
      <div class="mobile-search-container" id="mobileSearchContainer">
        <div class="search-bar">
          <input 
            type="text" 
            id="mobileSearchInput" 
            placeholder="Search products..."
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
      </div>
      
      <!-- Mobile Menu Dropdown -->
      <div class="mobile-menu-dropdown" id="mobileMenuDropdown">
        <a href="profile.html" class="mobile-menu-item">
          <span>👤</span>
          <span>Profile</span>
        </a>
        <a href="leaderboard.html" class="mobile-menu-item">
          <span>🏆</span>
          <span>Leaderboard</span>
        </a>
        <a href="orders.html" class="mobile-menu-item">
          <span>🛍️</span>
          <span>Orders</span>
        </a>
        <a href="analytics.html" class="mobile-menu-item vendor-only" style="display:none;" id="mobileAnalyticsLink">
          <span>📊</span>
          <span>Analytics</span>
        </a>
        <a href="inventory.html" class="mobile-menu-item vendor-only" style="display:none;" id="mobileInventoryLink">
          <span>📦</span>
          <span>My Inventory</span>
        </a>
        <a href="chat.html" class="mobile-menu-item">
          <span>💬</span>
          <span>Messages</span>
        </a>
        <a href="#" class="mobile-menu-item" id="mobileLogoutBtn">
          <span>🚪</span>
          <span>Logout</span>
        </a>
      </div>
    </nav>
  `

  // Insert navbar at the beginning of body
  const parser = new DOMParser()
  const navElement = parser.parseFromString(navHTML, "text/html").body.firstChild
  document.body.insertBefore(navElement, document.body.firstChild)

  // Initialize navbar functionality
  initializeNavbarEvents()
}

function initializeNavbarEvents() {
  // Hide search bar on non-index pages
  // Note: we check if we ARE on the index page
  const isLandingPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/')
  
  // Specific targeting to avoid ambiguity
  const desktopSearchBar = document.querySelector('.navbar-center .search-bar')
  const mobileSearchBtn = document.getElementById('mobileSearchToggle')
  const mobileSearchContainer = document.getElementById('mobileSearchContainer')

  if (!isLandingPage) {
    // Hide everything if not on index
    if (desktopSearchBar) desktopSearchBar.style.display = 'none'
    if (mobileSearchBtn) mobileSearchBtn.style.display = 'none'
    if (mobileSearchContainer) mobileSearchContainer.style.display = 'none'
  } else {
    // We are on index page
    // Ensure desktop search is visible (flex)
    if (desktopSearchBar) desktopSearchBar.style.display = 'flex'
    // Mobile button visibility is handled by CSS .mobile-only class
    // Mobile search container visibility is handled by toggle logic (starts hidden)
  }

  // Initialize mobile search toggle
  setupSearchToggle();

  // Mobile menu toggle

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  const mobileMenuDropdown = document.getElementById("mobileMenuDropdown")
  
  if (mobileMenuBtn && mobileMenuDropdown) {
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      mobileMenuDropdown.classList.toggle("active")
    })
  }

  // Profile dropdown
  const profileBtn = document.getElementById("profileBtn")
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      const profileItem = document.querySelector(".navbar-item.profile")
      if (profileItem) profileItem.classList.toggle("active")
    })
  }

  // Notifications dropdown
  const notificationsBtn = document.getElementById("notificationsBtn")
  if (notificationsBtn) {
    notificationsBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      const notifItem = document.querySelector(".navbar-item.notifications")
      if (notifItem) notifItem.classList.toggle("active")
    })
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".navbar-item") && !e.target.closest(".mobile-menu-btn")) {
      document.querySelectorAll(".navbar-item").forEach((item) => item.classList.remove("active"))
      if (mobileMenuDropdown) mobileMenuDropdown.classList.remove("active")
    }
  })

  // Logout (desktop)
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("userData");
      window.location.href = "login.html"
    })
  }

  // Logout (mobile)
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn")
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("userData");
      window.location.href = "login.html"
    })
  }

  // Update vendor menu visibility
  
  updateVendorMenu()
  updateWalletBalance()
  updateCartBadge()
  updateNotifications()
  // Update auth controls (show login/signup when not logged in)
  updateAuthControls()
}

function updateAuthControls() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))

  const authControls = document.getElementById("authControls")
  const navbarItems = Array.from(document.querySelectorAll('.navbar-right > .navbar-item'))
  const mobileMenu = document.getElementById('mobileMenuDropdown')

  if (!authControls) return

  if (!currentUser) {
    // Hide desktop and mobile items except the auth container
    navbarItems.forEach((el) => {
      // keep the authControls container and any item that links to the leaderboard visible
      const hasLeaderboardLink = el.querySelector && el.querySelector('a[href="leaderboard.html"]')
      if (el.id !== 'authControls' && !hasLeaderboardLink) el.style.display = 'none'
    })

    // Populate auth controls with Login / Signup buttons
    authControls.innerHTML = `
      <a href="login.html" class="nav-link">Login</a>
      <a href="signup.html" class="nav-link" style="margin-left:12px;">Signup</a>
    `
    authControls.style.display = 'flex'

    // Mobile menu: hide existing items and show login/signup
    if (mobileMenu) {
      // Hide mobile items except the leaderboard so unauthenticated users can still access it
      Array.from(mobileMenu.querySelectorAll('.mobile-menu-item')).forEach((el) => {
        if (el.getAttribute && el.getAttribute('href') === 'leaderboard.html') {
          el.style.display = 'flex'
        } else {
          el.style.display = 'none'
        }
      })
      // add mobile auth items if not already present
      if (!document.getElementById('mobileLoginItem')) {
        const loginItem = document.createElement('a')
        loginItem.className = 'mobile-menu-item'
        loginItem.id = 'mobileLoginItem'
        loginItem.href = 'login.html'
        loginItem.innerHTML = `<span>🔑</span><span>Login</span>`
        mobileMenu.insertBefore(loginItem, mobileMenu.firstChild)

        const signupItem = document.createElement('a')
        signupItem.className = 'mobile-menu-item'
        signupItem.id = 'mobileSignupItem'
        signupItem.href = 'signup.html'
        signupItem.innerHTML = `<span>✍️</span><span>Signup</span>`
        mobileMenu.insertBefore(signupItem, mobileMenu.firstChild)
      }
      // ensure mobile auth items are visible
      const mobiLogin = document.getElementById('mobileLoginItem')
      const mobiSignup = document.getElementById('mobileSignupItem')
      if (mobiLogin) mobiLogin.style.display = 'flex'
      if (mobiSignup) mobiSignup.style.display = 'flex'
    }
  } else {
    // Logged in: show regular items (clear any inline hides)
    navbarItems.forEach((el) => {
      // restore display: let CSS control layout; default to inline-flex for authControls
      el.style.display = ''
    })
    // hide auth-controls container
    authControls.style.display = 'none'

    // Mobile menu: remove mobileLogin/mobileSignup or hide them
    if (mobileMenu) {
      const mobiLogin = document.getElementById('mobileLoginItem')
      const mobiSignup = document.getElementById('mobileSignupItem')
      if (mobiLogin) mobiLogin.style.display = 'none'
      if (mobiSignup) mobiSignup.style.display = 'none'
      // ensure mobile logout is visible only if logged in
      const mobileLogout = document.getElementById('mobileLogoutBtn')
      if (mobileLogout) mobileLogout.style.display = 'flex'
    }
  }
}

function updateVendorMenu() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  const inventoryLink = document.getElementById("inventoryLink")
  const analyticsLink = document.getElementById("analyticsLink")
  const mobileInventoryLink = document.getElementById("mobileInventoryLink")
  const mobileAnalyticsLink = document.getElementById("mobileAnalyticsLink")
  console.log(currentUser);

  if (currentUser && currentUser.user.role === "vendor") {
    if (inventoryLink) inventoryLink.style.display = "block"
    if (analyticsLink) analyticsLink.style.display = "block"
    if (mobileInventoryLink) mobileInventoryLink.style.display = "flex"
    if (mobileAnalyticsLink) mobileAnalyticsLink.style.display = "flex"
  } else {
    if (inventoryLink) inventoryLink.style.display = "none"
    if (analyticsLink) analyticsLink.style.display = "none"
    if (mobileInventoryLink) mobileInventoryLink.style.display = "none"
    if (mobileAnalyticsLink) mobileAnalyticsLink.style.display = "none"
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNavigation)
} else {
  initializeNavigation()
}

// Mobile search toggle logic
function setupSearchToggle() {
  const mobileSearchToggle = document.getElementById('mobileSearchToggle');
  const mobileSearchContainer = document.getElementById('mobileSearchContainer');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const desktopSearchInput = document.getElementById('sharedSearchInput');

  if (mobileSearchToggle && mobileSearchContainer) {
    mobileSearchToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileSearchContainer.classList.toggle('active');
      if (mobileSearchContainer.classList.contains('active') && mobileSearchInput) {
        mobileSearchInput.focus();
      }
    });

    // Close search when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileSearchContainer.contains(e.target) && !mobileSearchToggle.contains(e.target)) {
        mobileSearchContainer.classList.remove('active');
      }
    });
    
    // Sync mobile search with desktop search functionality
    if (mobileSearchInput && window.initializeSearch) {
      // Debounce setup for mobile input
      let searchTimeout;
      mobileSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        // Sync value to global search var or trigger same event
        const query = e.target.value;
        if (desktopSearchInput) desktopSearchInput.value = query;
        
        // Trigger search event manually if on index page
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
           if (typeof currentSearchQuery !== 'undefined') {
              currentSearchQuery = query.toLowerCase().trim();
           }
           searchTimeout = setTimeout(() => {
              if (typeof applyFilters === 'function') {
                applyFilters();
              }
           }, 300);
        }
      });
    }
  }
}

// Toast notification utility
function showNavToast(message, type = 'info', options = {}) {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  const timeout = options.timeout ?? 3500;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.padding = '12px 16px';
  toast.style.marginBottom = '8px';
  toast.style.borderRadius = '4px';
  toast.style.backgroundColor = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
  toast.style.color = 'white';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

  const text = document.createElement('div');
  text.textContent = message;
  toast.appendChild(text);

  let removed = false;
  function dismiss() {
    if (removed) return;
    removed = true;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  container.appendChild(toast);
  if (timeout > 0) {
    setTimeout(dismiss, timeout);
  }
  return { dismiss };
}

async function updateWalletBalance() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if(!currentUser) return

  try{
    const response = await fetch('https://upstartpy.onrender.com/wallet/getbalance/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        }
      });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Wallet balance: session expired');
        return;
      }
      console.error('Error fetching wallet balance:', response.status);
      return;
    }

    const balance = await response.json();
    console.log('Wallet balance updated');
    
    if (!balance || typeof balance.balance !== 'number') {
      console.warn('Invalid balance data received');
      return;
    }

    const balanceEl = document.getElementById("walletBalance")
    if (!balanceEl) return
    balanceEl.textContent = `₦${balance.balance}`
    
  }catch(error){
    console.error('Error updating wallet balance:', error);
  }
}

async function updateCartBadge() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) return

  try{
    const response = await fetch('https://upstartpy.onrender.com/cart/cart-items/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization": `Bearer ${currentUser.access}`,
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Cart badge: session expired');
        return;
      }
      console.error('Error fetching cart items:', response.status);
      return;
    }

    const cart = await response.json();
    console.log('Cart badge updated:', cart?.length || 0);
    
    const badge = document.getElementById("cartBadge");
    if (badge) {
      badge.textContent = cart?.length || 0;
    }
  }catch(error){
    console.error('Error updating cart badge:', error);
  }
}

function updateNotifications() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) return

  const notifications = JSON.parse(localStorage.getItem("notifications")) || []
  const userNotifications = notifications.filter((n) => n.userId === currentUser.id)
  const unreadCount = userNotifications.filter((n) => !n.read).length

  const badge = document.getElementById("notificationsBadge")
  if (badge) {
    badge.textContent = unreadCount
  }

  const list = document.getElementById("notificationsList")
  if (list) {
    if (userNotifications.length === 0) {
      list.innerHTML = '<p class="empty-notifications">No notifications</p>'
    } else {
      list.innerHTML = userNotifications
        .map(
          (notif) => `
          <div class="notification-item" onclick="handleNotificationClick(${notif.id})">
            <p>${notif.message}</p>
            <span class="notification-time">${new Date(notif.date).toLocaleDateString()}</span>
          </div>
        `,
        )
        .join("")
    }
  }
}

function handleNotificationClick(notificationId) {
  const notifications = JSON.parse(localStorage.getItem("notifications")) || []
  const notif = notifications.find((n) => n.id === notificationId)
  if (notif) {
    notif.read = true
    localStorage.setItem("notifications", JSON.stringify(notifications))
    updateNotifications()
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNavigation)
} else {
  initializeNavigation()
}


