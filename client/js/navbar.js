/**
 * Campus Marketplace - Dynamic Navigation Component
 * Renders modern top header and mobile bottom navigation bar based on authentication status.
 */

function renderNavbar() {
  const navContainer = document.getElementById('navbar');
  if (!navContainer) return;

  const user = window.Auth ? window.Auth.getUser() : null;
  const currentPath = window.location.pathname;

  let linksHtml = '';

  if (!user) {
    // Visitor navigation
    linksHtml = `
      <a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
      <a href="/products.html" class="nav-link ${currentPath.includes('products.html') ? 'active' : ''}">Marketplace</a>
      <button type="button" class="nav-ai-trigger" id="nav-ai-btn" title="Ask Campus AI Assistant">✨ Ask AI</button>
      <div class="nav-auth-buttons">
        <a href="/login.html" class="btn btn-outline btn-sm">Log In</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Sign Up</a>
      </div>
    `;
  } else if (user.role === 'admin') {
    // Admin navigation
    linksHtml = `
      <a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
      <a href="/products.html" class="nav-link ${currentPath.includes('products.html') ? 'active' : ''}">Marketplace</a>
      <a href="/admin.html" class="nav-link ${currentPath.includes('admin') ? 'active' : ''}">
        <span class="badge badge-admin">Admin Panel</span>
      </a>
      <a href="/messages.html" class="nav-link ${currentPath.includes('messages.html') ? 'active' : ''}">Messages</a>
      <button type="button" class="nav-ai-trigger" id="nav-ai-btn" title="Ask Campus AI Assistant">✨ Ask AI</button>
      <div class="nav-user-dropdown">
        <span class="user-greeting">Admin: <strong>${window.Utils.escapeHTML(user.name.split(' ')[0])}</strong></span>
        <button id="nav-logout-btn" class="btn btn-outline btn-sm">Log Out</button>
      </div>
    `;
  } else {
    // Student navigation
    linksHtml = `
      <a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
      <a href="/products.html" class="nav-link ${currentPath.includes('products.html') && !currentPath.includes('create') && !currentPath.includes('my-listings') ? 'active' : ''}">Marketplace</a>
      <a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard.html') ? 'active' : ''}">Dashboard</a>
      <a href="/my-listings.html" class="nav-link ${currentPath.includes('my-listings.html') ? 'active' : ''}">My Listings</a>
      <a href="/messages.html" class="nav-link ${currentPath.includes('messages.html') ? 'active' : ''}">Messages</a>
      <button type="button" class="nav-ai-trigger" id="nav-ai-btn" title="Ask Campus AI Assistant">✨ Ask AI</button>
      <a href="/create-product.html" class="btn btn-sell btn-sm">+ Sell Item</a>
      <div class="nav-user-dropdown">
        <a href="/profile.html" class="nav-profile-link" title="My Profile">
          ${
            user.profileImage
              ? `<img src="${user.profileImage}" class="nav-avatar" alt="Avatar" />`
              : `<div class="nav-avatar-placeholder">${window.Utils.escapeHTML(user.name.charAt(0).toUpperCase())}</div>`
          }
          <span class="user-name">${window.Utils.escapeHTML(user.name.split(' ')[0])}</span>
        </a>
        <button id="nav-logout-btn" class="btn btn-outline btn-sm">Log Out</button>
      </div>
    `;
  }

  navContainer.innerHTML = `
    <div class="nav-inner container">
      <a href="/index.html" class="nav-logo">
        <span class="logo-icon">🎓</span>
        <span class="logo-text">Campus<span class="text-accent">Market</span></span>
      </a>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="nav-hamburger" id="nav-hamburger-btn" aria-label="Toggle navigation menu" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="nav-menu" id="nav-menu">
        ${linksHtml}
      </div>
    </div>
  `;

  // Render or update backdrop overlay
  let backdrop = document.getElementById('nav-drawer-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'nav-drawer-backdrop';
    backdrop.className = 'nav-drawer-backdrop';
    document.body.appendChild(backdrop);
  }

  // Hamburger toggle logic
  const hamburgerBtn = document.getElementById('nav-hamburger-btn');
  const navMenu = document.getElementById('nav-menu');

  const closeDrawer = () => {
    if (navMenu) navMenu.classList.remove('nav-menu-open');
    if (hamburgerBtn) {
      hamburgerBtn.classList.remove('is-open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
    if (backdrop) backdrop.classList.remove('is-active');
  };

  const openDrawer = () => {
    if (navMenu) navMenu.classList.add('nav-menu-open');
    if (hamburgerBtn) {
      hamburgerBtn.classList.add('is-open');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
    }
    if (backdrop) backdrop.classList.add('is-active');
  };

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navMenu.classList.contains('nav-menu-open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    backdrop.addEventListener('click', closeDrawer);

    // Auto-close on link click
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('nav-menu-open')) {
        closeDrawer();
      }
    });
  }

  // Render Mobile Bottom Navigation Bar
  renderMobileBottomNav(user, currentPath);

  // Logout listener
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.Auth && window.Auth.logout) {
        window.Auth.logout();
      }
    });
  }

  // AI Assistant trigger listener
  const navAiBtn = document.getElementById('nav-ai-btn');
  if (navAiBtn) {
    navAiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      if (window.AiAssistant && window.AiAssistant.open) {
        window.AiAssistant.open();
      }
    });
  }
}

/**
 * Renders a sleek, app-like bottom navigation bar for mobile screens
 */
function renderMobileBottomNav(user, currentPath) {
  // Don't render or hide on specific full-screen pages if desired, but for general pages keep it active
  const isMessagesPage = document.body.classList.contains('messages-page');

  let bottomNav = document.getElementById('mobile-bottom-nav');
  if (!bottomNav) {
    bottomNav = document.createElement('nav');
    bottomNav.id = 'mobile-bottom-nav';
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.setAttribute('aria-label', 'Mobile Navigation');
    document.body.appendChild(bottomNav);
  }

  // Add body padding helper class
  document.body.classList.add('has-bottom-nav');
  if (document.querySelector('.footer')) {
    document.body.classList.add('has-footer');
  }

  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isMarket = currentPath.includes('products.html') && !currentPath.includes('create') && !currentPath.includes('my-listings');
  const isSell = currentPath.includes('create-product.html');
  const isMessages = currentPath.includes('messages.html');
  const isDashboard = currentPath.includes('dashboard.html') || currentPath.includes('my-listings.html');
  const isProfile = currentPath.includes('profile.html');
  const isAdmin = currentPath.includes('admin');
  const isLogin = currentPath.includes('login.html') || currentPath.includes('register.html');

  if (!user) {
    // Visitor Bottom Navigation
    bottomNav.innerHTML = `
      <a href="/index.html" class="bottom-nav-item ${isHome ? 'active' : ''}">
        <span class="bottom-nav-icon">🏠</span>
        <span class="bottom-nav-label">Home</span>
      </a>
      <a href="/products.html" class="bottom-nav-item ${isMarket ? 'active' : ''}">
        <span class="bottom-nav-icon">🛍️</span>
        <span class="bottom-nav-label">Browse</span>
      </a>
      <a href="/create-product.html" class="bottom-nav-sell-wrapper" title="Sell Item">
        <div class="bottom-nav-sell-btn">+</div>
        <span class="bottom-nav-sell-label">Sell</span>
      </a>
      <button type="button" class="bottom-nav-item" id="bottom-nav-ai-btn">
        <span class="bottom-nav-icon">✨</span>
        <span class="bottom-nav-label">AI Assist</span>
      </button>
      <a href="/login.html" class="bottom-nav-item ${isLogin ? 'active' : ''}">
        <span class="bottom-nav-icon">👤</span>
        <span class="bottom-nav-label">Account</span>
      </a>
    `;
  } else if (user.role === 'admin') {
    // Admin Bottom Navigation
    bottomNav.innerHTML = `
      <a href="/index.html" class="bottom-nav-item ${isHome ? 'active' : ''}">
        <span class="bottom-nav-icon">🏠</span>
        <span class="bottom-nav-label">Home</span>
      </a>
      <a href="/products.html" class="bottom-nav-item ${isMarket ? 'active' : ''}">
        <span class="bottom-nav-icon">🛍️</span>
        <span class="bottom-nav-label">Browse</span>
      </a>
      <a href="/create-product.html" class="bottom-nav-sell-wrapper" title="Sell Item">
        <div class="bottom-nav-sell-btn">+</div>
        <span class="bottom-nav-sell-label">Sell</span>
      </a>
      <a href="/messages.html" class="bottom-nav-item ${isMessages ? 'active' : ''}">
        <span class="bottom-nav-icon">💬</span>
        <span class="bottom-nav-label">Messages</span>
      </a>
      <a href="/admin.html" class="bottom-nav-item ${isAdmin ? 'active' : ''}">
        <span class="bottom-nav-icon">📊</span>
        <span class="bottom-nav-label">Admin</span>
      </a>
    `;
  } else {
    // Student Bottom Navigation
    bottomNav.innerHTML = `
      <a href="/index.html" class="bottom-nav-item ${isHome ? 'active' : ''}">
        <span class="bottom-nav-icon">🏠</span>
        <span class="bottom-nav-label">Home</span>
      </a>
      <a href="/products.html" class="bottom-nav-item ${isMarket ? 'active' : ''}">
        <span class="bottom-nav-icon">🛍️</span>
        <span class="bottom-nav-label">Browse</span>
      </a>
      <a href="/create-product.html" class="bottom-nav-sell-wrapper" title="Sell Item">
        <div class="bottom-nav-sell-btn">+</div>
        <span class="bottom-nav-sell-label">Sell</span>
      </a>
      <a href="/messages.html" class="bottom-nav-item ${isMessages ? 'active' : ''}">
        <span class="bottom-nav-icon">💬</span>
        <span class="bottom-nav-label">Messages</span>
      </a>
      <a href="/dashboard.html" class="bottom-nav-item ${isDashboard || isProfile ? 'active' : ''}">
        <span class="bottom-nav-icon">👤</span>
        <span class="bottom-nav-label">Profile</span>
      </a>
    `;
  }

  // Hook AI trigger in bottom nav
  const bottomAiBtn = document.getElementById('bottom-nav-ai-btn');
  if (bottomAiBtn) {
    bottomAiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.AiAssistant && window.AiAssistant.open) {
        window.AiAssistant.open();
      }
    });
  }
}

/**
 * Dynamically loads AI assistant CSS and JS assets if not already included on the page.
 */
function loadAiAssistantAssets() {
  if (!document.querySelector('link[href*="ai-assistant.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/ai-assistant.css';
    document.head.appendChild(link);
  }

  if (!window.AiAssistant && !document.querySelector('script[src*="ai-assistant.js"]')) {
    const script = document.createElement('script');
    script.src = '/js/ai-assistant.js';
    script.defer = true;
    document.body.appendChild(script);
  }
}

// Auto-run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  loadAiAssistantAssets();
  if (window.Auth) {
    await window.Auth.checkAuth();
  } else {
    renderNavbar();
  }
});

window.Navbar = {
  render: renderNavbar,
};
