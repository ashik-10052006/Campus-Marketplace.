/**
 * Campus Marketplace - Dynamic Navigation Component
 * Renders stateful links depending on visitor, student, or administrator status.
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
      <button class="nav-hamburger" id="nav-hamburger-btn" aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-menu" id="nav-menu">
        ${linksHtml}
      </div>
    </div>
  `;

  // Hamburger toggle
  const hamburgerBtn = document.getElementById('nav-hamburger-btn');
  const navMenu = document.getElementById('nav-menu');
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('nav-menu-open');
      hamburgerBtn.classList.toggle('is-open');
    });
  }

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
