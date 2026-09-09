/**
 * Campus Marketplace - Home Page Interactions
 */

const categoryIcons = {
  Books: '📚',
  Electronics: '💻',
  Furniture: '🪑',
  Clothing: '👕',
  Bicycles: '🚲',
  Calculators: '🔢',
  Accessories: '🎒',
  Stationery: '✏️',
  'Hostel Items': '🛏️',
  Other: '📦',
};

document.addEventListener('DOMContentLoaded', async () => {
  // Setup Auth state for guest vs logged-in user banners
  setupAuthView();

  // Hero Search Form Handler
  const searchForm = document.getElementById('hero-search-form');
  const searchInput = document.getElementById('hero-search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = searchInput.value.trim();
      if (term) {
        window.location.href = `/products.html?search=${encodeURIComponent(term)}`;
      } else {
        window.location.href = '/products.html';
      }
    });
  }

  // Load Popular Categories
  loadCategories();

  // Load Latest Listings
  loadLatestProducts();
});

async function setupAuthView() {
  const guestBanner = document.getElementById('guest-cta-banner');
  const userBanner = document.getElementById('user-dashboard-banner');
  const heroCtaContainer = document.getElementById('hero-cta-container');

  try {
    const user = window.Auth ? await window.Auth.checkAuth() : null;

    if (user) {
      // Hide guest registration banner (strictly only before login)
      if (guestBanner) guestBanner.style.display = 'none';

      // Show logged-in student/admin dashboard banner
      if (userBanner) {
        userBanner.style.display = 'block';
        const titleEl = document.getElementById('logged-dashboard-title');
        const subtitleEl = document.getElementById('logged-dashboard-subtitle');
        const firstName = user.name ? user.name.split(' ')[0] : 'Student';

        if (user.role === 'admin') {
          if (titleEl) titleEl.textContent = `Welcome Back, Admin ${window.Utils.escapeHTML(firstName)}!`;
          if (subtitleEl) subtitleEl.textContent = 'Manage categories, review student listing reports, or explore the catalog.';
          const dashBtn = userBanner.querySelector('.btn-user-dash');
          if (dashBtn) {
            dashBtn.href = '/admin.html';
            dashBtn.innerHTML = '🛡️ Admin Panel';
          }
        } else {
          if (titleEl) titleEl.textContent = `Welcome to Your Student Dashboard, ${window.Utils.escapeHTML(firstName)}!`;
          if (subtitleEl) subtitleEl.textContent = 'Access your active listings, read buyer messages, and trade safely on campus.';
        }
      }

      // Update hero CTA buttons for authenticated user
      if (heroCtaContainer) {
        heroCtaContainer.innerHTML = `
          <a href="${user.role === 'admin' ? '/admin.html' : '/dashboard.html'}" class="btn btn-primary btn-lg" style="background: #ffffff; color: #4338ca; box-shadow: 0 4px 14px rgba(0,0,0,0.15); font-weight: 700;">
            ${user.role === 'admin' ? '🛡️ Admin Panel' : 'Dashboard'}
          </a>
          <a href="/products.html" class="btn btn-outline btn-lg" style="color: #ffffff; border-color: rgba(255,255,255,0.4);">Browse Marketplace</a>
          <a href="/create-product.html" class="btn btn-sell btn-lg" style="box-shadow: 0 4px 14px rgba(0,0,0,0.15);">+ Start Selling</a>
        `;
      }
    } else {
      // Guest visitor: show guest banner, hide user dashboard banner
      if (guestBanner) guestBanner.style.display = 'block';
      if (userBanner) userBanner.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to setup auth view:', error);
  }
}

async function loadCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  try {
    const response = await window.API.getCategories();
    if (response.success && response.data && response.data.categories) {
      const categories = response.data.categories;
      container.innerHTML = categories
        .slice(0, 8)
        .map((cat) => {
          const icon = categoryIcons[cat.name] || '🏷️';
          return `
            <a href="/products.html?category=${encodeURIComponent(cat.name)}" class="card card-hoverable text-center" style="padding: 1.5rem 1rem; text-decoration: none; color: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${icon}</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${window.Utils.escapeHTML(cat.name)}</div>
            </a>
          `;
        })
        .join('');
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function loadLatestProducts() {
  const container = document.getElementById('latest-products-grid');
  if (!container) return;

  try {
    const response = await window.API.getProducts({ limit: 8, status: 'AVAILABLE', sort: 'newest' });
    if (response.success && response.data && response.data.products) {
      const products = response.data.products;
      if (products.length === 0) {
        window.Utils.renderEmptyState(container, {
          title: 'No listings posted yet',
          subtitle: 'Be the first student to post a deal on campus!',
          actionText: 'List an Item',
          actionLink: '/create-product.html',
        });
        return;
      }

      container.innerHTML = products
        .map((product) => {
          return `
            <a href="/product-details.html?id=${product._id}" class="product-card">
              <div class="product-card-img-wrapper">
                <img src="${product.imageUrl}" alt="${window.Utils.escapeHTML(product.name)}" class="product-card-img" loading="lazy" />
              </div>
              <div class="product-card-body">
                <div class="product-card-badges">
                  ${window.Utils.getConditionBadge(product.condition)}
                  <span class="badge badge-default">${window.Utils.escapeHTML(product.category ? product.category.name : 'General')}</span>
                </div>
                <h3 class="product-card-title">${window.Utils.escapeHTML(product.name)}</h3>
                <div class="product-card-price">${window.Utils.formatCurrency(product.price)}</div>
                <div class="product-card-meta">
                  <span>${window.Utils.escapeHTML(product.seller ? product.seller.name : 'Student')}</span>
                  <span>${window.Utils.formatRelativeTime(product.createdAt)}</span>
                </div>
              </div>
            </a>
          `;
        })
        .join('');
    }
  } catch (error) {
    console.error('Failed to load latest products:', error);
    window.Utils.renderError(container, 'Failed to load latest products. Please check back soon.');
  }
}
