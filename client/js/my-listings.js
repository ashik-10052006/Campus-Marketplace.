/**
 * Campus Marketplace - My Listings Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  await loadMyListings();
});

async function loadMyListings() {
  const container = document.getElementById('my-listings-container');
  if (!container) return;

  try {
    const res = await window.API.getMyListings();
    if (res.success && res.data && res.data.products) {
      const products = res.data.products;

      if (products.length === 0) {
        window.Utils.renderEmptyState(container, {
          title: "You haven't listed anything yet",
          subtitle: 'Start selling your unused books, calculators, and gadgets.',
          actionText: 'List Your First Item',
          actionLink: '/create-product.html',
        });
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Category</th>
                <th>Price</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Date Listed</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map((p) => {
                  return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <img src="${p.imageUrl}" class="table-thumbnail" alt="${window.Utils.escapeHTML(p.name)}" />
                        <span style="font-weight: 600; max-width: 220px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${window.Utils.escapeHTML(p.name)}
                        </span>
                      </div>
                    </td>
                    <td>${window.Utils.escapeHTML(p.category ? p.category.name : 'General')}</td>
                    <td style="font-weight: 700; color: var(--primary);">${window.Utils.formatCurrency(p.price)}</td>
                    <td>${window.Utils.getConditionBadge(p.condition)}</td>
                    <td>${window.Utils.getStatusBadge(p.status)}</td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(p.createdAt)}</td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <a href="/product-details.html?id=${p._id}" class="btn btn-outline btn-sm" title="View Listing">View</a>
                        <a href="/edit-product.html?id=${p._id}" class="btn btn-outline btn-sm" title="Edit Listing">Edit</a>
                        ${
                          p.status === 'AVAILABLE'
                            ? `<button class="btn btn-success btn-sm" onclick="markAsSold('${p._id}')" title="Mark Sold">✓ Sold</button>`
                            : ''
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteListing('${p._id}')" title="Delete Listing">🗑️</button>
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
  } catch (error) {
    console.error('My listings error:', error);
    window.Utils.renderError(container, 'Failed to fetch your listings.');
  }
}

window.markAsSold = async function (productId) {
  if (!confirm('Mark this listing as SOLD?')) return;

  try {
    const res = await window.API.markProductSold(productId);
    if (res.success) {
      window.Utils.showToast('Listing marked as SOLD', 'success');
      loadMyListings();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to update status', 'error');
  }
};

window.deleteListing = async function (productId) {
  if (!confirm('Are you sure you want to permanently delete this listing? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await window.API.deleteProduct(productId);
    if (res.success) {
      window.Utils.showToast('Listing deleted successfully', 'info');
      loadMyListings();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to delete listing', 'error');
  }
};
