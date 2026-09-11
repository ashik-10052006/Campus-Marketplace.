/**
 * Campus Marketplace - Admin Products Controller
 */

let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  setupProductFilters();
  setupProductTableEvents();
  await loadProducts();
});

function setupProductFilters() {
  const searchInput = document.getElementById('products-search-input');
  const statusFilter = document.getElementById('product-status-filter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFilteredProducts();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      renderFilteredProducts();
    });
  }
}

function setupProductTableEvents() {
  const container = document.getElementById('admin-products-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (!btn) return;

    e.preventDefault();
    const productId = btn.getAttribute('data-id');
    const productName = btn.getAttribute('data-name') || 'this product';
    if (!productId) return;

    if (!confirm(`Are you sure you want to remove listing "${productName}" from the marketplace?`)) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Removing...';
      const res = await window.API.deleteProduct(productId);
      if (res.success) {
        window.Utils.showToast(`Listing "${productName}" removed`, 'info');
        // Update product status locally or remove from list
        allProducts = allProducts.map((p) => {
          if (p._id === productId) {
            return { ...p, status: 'REMOVED' };
          }
          return p;
        });
        renderFilteredProducts();
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to remove listing', 'error');
      btn.disabled = false;
      btn.textContent = 'Remove';
    }
  });
}

async function loadProducts() {
  const container = document.getElementById('admin-products-container');
  if (!container) return;

  try {
    const res = await window.API.getProducts({ limit: 100, status: '' });
    if (res.success && res.data && res.data.products) {
      allProducts = res.data.products;
      renderFilteredProducts();
    }
  } catch (err) {
    console.error('Products admin load error:', err);
    window.Utils.renderError(container, 'Failed to fetch platform products.');
  }
}

function renderFilteredProducts() {
  const container = document.getElementById('admin-products-container');
  const countBadge = document.getElementById('product-count-badge');
  const searchInput = document.getElementById('products-search-input');
  const statusFilter = document.getElementById('product-status-filter');

  if (!container) return;

  const searchVal = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const statusVal = statusFilter ? statusFilter.value : '';

  const filtered = allProducts.filter((p) => {
    const title = (p.name || '').toLowerCase();
    const seller = (p.seller && p.seller.name ? p.seller.name : '').toLowerCase();
    const category = (p.category && p.category.name ? p.category.name : '').toLowerCase();
    const matchesSearch = !searchVal || title.includes(searchVal) || seller.includes(searchVal) || category.includes(searchVal);
    const matchesStatus = !statusVal || p.status === statusVal;
    return matchesSearch && matchesStatus;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${allProducts.length} Listings`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem 1.5rem; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📦</div>
        <h3 style="font-size: 1.15rem; margin-bottom: 0.35rem;">No marketplace listings found</h3>
        <p class="text-muted" style="font-size: 0.9rem;">Try changing your search term or status filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Seller</th>
            <th>Category</th>
            <th>Price (₹)</th>
            <th>Condition</th>
            <th>Status</th>
            <th>Created</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((p) => {
              const defaultImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120&auto=format&fit=crop&q=80';
              const imgUrl = p.imageUrl || (p.images && p.images[0]) || defaultImg;
              return `
              <tr>
                <td data-label="Product">
                  <div class="table-product-cell">
                    <img src="${imgUrl}" class="table-product-thumb" alt="${window.Utils.escapeHTML(p.name)}" onerror="this.src='${defaultImg}'" />
                    <div style="min-width: 0;">
                      <a href="/product-details.html?id=${p._id}" style="font-weight: 700; color: var(--text-main); text-decoration: none; display: block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${window.Utils.escapeHTML(p.name)}
                      </a>
                      <span style="font-size: 0.8rem; color: var(--text-muted);">${window.Utils.escapeHTML(p.category ? p.category.name : 'General')}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Seller" style="font-size: 0.88rem; color: var(--text-main);">
                  ${window.Utils.escapeHTML(p.seller ? p.seller.name : 'Campus Student')}
                </td>
                <td data-label="Category" style="font-size: 0.88rem; color: var(--text-muted);">
                  ${window.Utils.escapeHTML(p.category ? p.category.name : 'General')}
                </td>
                <td data-label="Price" style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">
                  ${window.Utils.formatCurrency(p.price)}
                </td>
                <td data-label="Condition">
                  ${window.Utils.getConditionBadge(p.condition)}
                </td>
                <td data-label="Status">
                  ${window.Utils.getStatusBadge(p.status)}
                </td>
                <td data-label="Created" style="color: var(--text-muted); font-size: 0.85rem;">
                  ${window.Utils.formatDate(p.createdAt)}
                </td>
                <td data-label="Action" style="text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
                    <a href="/product-details.html?id=${p._id}" class="btn btn-outline btn-sm">View</a>
                    ${
                      p.status !== 'REMOVED'
                        ? `<button type="button" class="btn btn-danger btn-sm" data-action="remove" data-id="${p._id}" data-name="${window.Utils.escapeHTML(p.name)}">Remove</button>`
                        : '<span class="badge" style="background: var(--bg-subtle); color: var(--text-muted); font-size: 0.78rem;">Removed</span>'
                    }
                  </div>
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
