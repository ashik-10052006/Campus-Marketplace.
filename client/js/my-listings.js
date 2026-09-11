/**
 * Campus Marketplace - My Listings Controller
 */

let pendingConfirmAction = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  setupConfirmModalListeners();
  setupContainerEventListeners();
  await loadMyListings();
});

function setupConfirmModalListeners() {
  const closeBtn = document.getElementById('confirm-modal-close');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  const backdrop = document.getElementById('confirm-modal-backdrop');
  const proceedBtn = document.getElementById('confirm-modal-proceed');

  const closeModal = () => {
    pendingConfirmAction = null;
    window.Utils.closeModal('confirm-modal');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  if (proceedBtn) {
    proceedBtn.addEventListener('click', async () => {
      const action = pendingConfirmAction;
      closeModal();
      if (typeof action === 'function') {
        await action();
      }
    });
  }
}

function showConfirmDialog({ icon, title, text, proceedText, proceedBtnClass, onProceed }) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const textEl = document.getElementById('confirm-modal-text');
  const iconEl = document.getElementById('confirm-modal-icon');
  const proceedBtn = document.getElementById('confirm-modal-proceed');

  if (!modal || !proceedBtn) {
    // Graceful fallback if modal isn't present
    if (window.confirm(text || 'Are you sure?')) {
      onProceed();
    }
    return;
  }

  if (titleEl) titleEl.textContent = title || 'Confirm Action';
  if (textEl) textEl.textContent = text || 'Are you sure you want to proceed?';
  if (iconEl) iconEl.textContent = icon || '⚠️';

  proceedBtn.textContent = proceedText || 'Confirm';
  proceedBtn.className = `btn ${proceedBtnClass || 'btn-primary'}`;

  pendingConfirmAction = onProceed;
  window.Utils.openModal('confirm-modal');
}

function setupContainerEventListeners() {
  const container = document.getElementById('my-listings-container');
  if (!container || container._hasListener) return;
  container._hasListener = true;

  container.addEventListener('click', (e) => {
    const soldBtn = e.target.closest('.btn-mark-sold');
    if (soldBtn) {
      e.preventDefault();
      const id = soldBtn.getAttribute('data-id');
      const name = soldBtn.getAttribute('data-name') || 'this listing';
      triggerMarkSold(id, name);
      return;
    }

    const availBtn = e.target.closest('.btn-mark-available');
    if (availBtn) {
      e.preventDefault();
      const id = availBtn.getAttribute('data-id');
      const name = availBtn.getAttribute('data-name') || 'this listing';
      triggerMarkAvailable(id, name);
      return;
    }

    const delBtn = e.target.closest('.btn-delete-listing');
    if (delBtn) {
      e.preventDefault();
      const id = delBtn.getAttribute('data-id');
      const name = delBtn.getAttribute('data-name') || 'this listing';
      triggerDeleteListing(id, name);
      return;
    }
  });
}

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
                <th>Price (₹)</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Date Listed</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map((p) => {
                  const safeName = window.Utils.escapeHTML(p.name);
                  const isAvailable = p.status === 'AVAILABLE';
                  const isSold = p.status === 'SOLD';

                  return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <img src="${p.imageUrl}" class="table-thumbnail" alt="${safeName}" />
                        <span style="font-weight: 600; max-width: 220px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${safeName}
                        </span>
                      </div>
                    </td>
                    <td>${window.Utils.escapeHTML(p.category ? p.category.name : 'General')}</td>
                    <td style="font-weight: 700; color: var(--primary);">${window.Utils.formatCurrency(p.price)}</td>
                    <td>${window.Utils.getConditionBadge(p.condition)}</td>
                    <td>${window.Utils.getStatusBadge(p.status)}</td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(p.createdAt)}</td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem; flex-wrap: nowrap;">
                        <a href="/product-details.html?id=${p._id}" class="btn btn-outline btn-sm" title="View Listing">View</a>
                        <a href="/edit-product.html?id=${p._id}" class="btn btn-outline btn-sm" title="Edit Listing">Edit</a>
                        ${
                          isAvailable
                            ? `<button type="button" class="btn btn-success btn-sm btn-mark-sold" data-id="${p._id}" data-name="${safeName}" title="Mark as Sold">✓ Sold</button>`
                            : ''
                        }
                        ${
                          isSold
                            ? `<button type="button" class="btn btn-outline btn-sm btn-mark-available" data-id="${p._id}" data-name="${safeName}" title="Re-list item for sale">🔄 Re-list</button>`
                            : ''
                        }
                        <button type="button" class="btn btn-danger btn-sm btn-delete-listing" data-id="${p._id}" data-name="${safeName}" title="Delete Listing">🗑️ Delete</button>
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

function triggerMarkSold(productId, productName) {
  showConfirmDialog({
    icon: '🏷️',
    title: 'Mark Listing as Sold',
    text: `Are you sure you want to mark "${productName}" as SOLD? It will be marked as sold across the marketplace.`,
    proceedText: 'Yes, Mark as Sold',
    proceedBtnClass: 'btn-success',
    onProceed: async () => {
      try {
        const res = await window.API.markProductSold(productId);
        if (res.success) {
          window.Utils.showToast('Listing marked as SOLD', 'success');
          await loadMyListings();
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to update status', 'error');
      }
    },
  });
}

function triggerMarkAvailable(productId, productName) {
  showConfirmDialog({
    icon: '🔄',
    title: 'Re-list Product',
    text: `Re-list "${productName}" as AVAILABLE for students to browse and buy?`,
    proceedText: 'Re-list Item',
    proceedBtnClass: 'btn-primary',
    onProceed: async () => {
      try {
        const res = await window.API.markProductAvailable(productId);
        if (res.success) {
          window.Utils.showToast('Listing re-listed as AVAILABLE', 'success');
          await loadMyListings();
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to re-list product', 'error');
      }
    },
  });
}

function triggerDeleteListing(productId, productName) {
  showConfirmDialog({
    icon: '🗑️',
    title: 'Delete Listing',
    text: `Are you sure you want to permanently delete "${productName}"? This action cannot be undone.`,
    proceedText: 'Delete Permanently',
    proceedBtnClass: 'btn-danger',
    onProceed: async () => {
      try {
        const res = await window.API.deleteProduct(productId);
        if (res.success) {
          window.Utils.showToast('Listing deleted successfully', 'info');
          await loadMyListings();
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to delete listing', 'error');
      }
    },
  });
}

// Backwards compatibility globals
window.markAsSold = function (productId) {
  triggerMarkSold(productId, 'this item');
};

window.markAsAvailable = function (productId) {
  triggerMarkAvailable(productId, 'this item');
};

window.deleteListing = function (productId) {
  triggerDeleteListing(productId, 'this item');
};
