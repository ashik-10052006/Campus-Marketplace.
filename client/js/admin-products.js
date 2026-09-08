/**
 * Campus Marketplace - Admin Products Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  await loadProducts();
});

async function loadProducts() {
  const container = document.getElementById('admin-products-container');
  if (!container) return;

  try {
    // Fetch products across statuses
    const res = await window.API.getProducts({ limit: 50, status: '' });
    if (res.success && res.data && res.data.products) {
      const products = res.data.products;

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Category</th>
                <th>Price</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Created</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map((p) => {
                  return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${p.imageUrl}" class="table-thumbnail" alt="${window.Utils.escapeHTML(p.name)}" />
                        <span style="font-weight: 600; max-width: 200px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${window.Utils.escapeHTML(p.name)}
                        </span>
                      </div>
                    </td>
                    <td>${window.Utils.escapeHTML(p.seller ? p.seller.name : 'Unknown')}</td>
                    <td>${window.Utils.escapeHTML(p.category ? p.category.name : 'General')}</td>
                    <td style="font-weight: 700; color: var(--primary);">${window.Utils.formatCurrency(p.price)}</td>
                    <td>${window.Utils.getConditionBadge(p.condition)}</td>
                    <td>${window.Utils.getStatusBadge(p.status)}</td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(p.createdAt)}</td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <a href="/product-details.html?id=${p._id}" class="btn btn-outline btn-sm">View</a>
                        ${
                          p.status !== 'REMOVED'
                            ? `<button class="btn btn-danger btn-sm" onclick="removeProduct('${p._id}', '${window.Utils.escapeHTML(p.name)}')">Remove</button>`
                            : '<span class="text-muted" style="font-size: 0.8rem;">Removed</span>'
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
  } catch (err) {
    console.error('Products admin load error:', err);
    window.Utils.renderError(container, 'Failed to fetch platform products.');
  }
}

window.removeProduct = async function (productId, name) {
  if (!confirm(`Are you sure you want to remove listing "${name}" from the marketplace?`)) {
    return;
  }

  try {
    const res = await window.API.deleteProduct(productId);
    if (res.success) {
      window.Utils.showToast(`Listing "${name}" removed`, 'info');
      loadProducts();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to remove listing', 'error');
  }
};
