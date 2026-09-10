/**
 * Campus Marketplace - Product Details Controller
 */

let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  await loadProductDetails(productId);
  setupReportForm(productId);
});

async function loadProductDetails(productId) {
  const container = document.getElementById('product-details-container');
  const breadcrumbName = document.getElementById('breadcrumb-product-name');

  try {
    const response = await window.API.getProduct(productId);

    if (response.success && response.data && response.data.product) {
      currentProduct = response.data.product;

      if (breadcrumbName) {
        breadcrumbName.textContent = currentProduct.name;
      }
      document.title = `${currentProduct.name} | Campus Marketplace`;

      renderProductView(container, currentProduct);
    } else {
      window.Utils.renderEmptyState(container, {
        title: 'Listing Not Found',
        subtitle: 'This item may have been removed by the seller or administrator.',
        actionText: 'Back to Marketplace',
        actionLink: '/products.html',
      });
    }
  } catch (error) {
    console.error('Failed to fetch product details:', error);
    window.Utils.renderError(
      container,
      error.message || 'Unable to load listing details. Please try again.'
    );
  }
}

function renderProductView(container, product) {
  const user = window.Auth ? window.Auth.getUser() : null;
  const sellerId = product.seller ? (product.seller._id || product.seller) : null;
  const isOwner = user && sellerId && String(user._id) === String(sellerId);
  const isAdmin = user && user.role === 'admin';

  let actionButtonsHtml = '';

  if (isOwner) {
    // Owner Actions
    actionButtonsHtml = `
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem;">
        <a href="/edit-product.html?id=${product._id}" class="btn btn-outline" style="flex: 1;">
          ✏️ Edit Listing
        </a>
        ${
          product.status === 'AVAILABLE'
            ? `<button id="mark-sold-btn" class="btn btn-success" style="flex: 1;">✓ Mark as Sold</button>`
            : `<button class="btn btn-outline" disabled style="flex: 1;">Listing Sold</button>`
        }
        <button id="delete-listing-btn" class="btn btn-danger">🗑️ Delete</button>
      </div>
    `;
  } else {
    // Buyer / Visitor Actions
    actionButtonsHtml = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
        ${
          product.status === 'AVAILABLE'
            ? `<button id="contact-seller-btn" class="btn btn-primary btn-lg btn-block">
                💬 Contact Student Seller
              </button>`
            : `<div class="badge badge-sold" style="padding: 0.75rem; text-align: center; font-size: 0.95rem; justify-content: center;">
                This item has been marked as SOLD
              </div>`
        }
        <button id="open-report-btn" class="btn btn-outline btn-sm" style="align-self: center; margin-top: 0.5rem; color: var(--text-muted);">
          🚩 Report this listing
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="product-details-grid">
      <!-- Product Image -->
      <div class="product-gallery-main">
        <img src="${product.imageUrl}" alt="${window.Utils.escapeHTML(product.name)}" class="product-gallery-img" />
      </div>

      <!-- Product Information -->
      <div class="product-info-panel">
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          ${window.Utils.getConditionBadge(product.condition)}
          ${window.Utils.getStatusBadge(product.status)}
          <span class="badge badge-default">${window.Utils.escapeHTML(product.category ? product.category.name : 'Item')}</span>
        </div>

        <h1 style="font-size: 2.2rem; margin-top: 0.75rem; font-weight: 800;">
          ${window.Utils.escapeHTML(product.name)}
        </h1>

        <div class="product-info-price">
          ${window.Utils.formatCurrency(product.price)}
        </div>

        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Listed on ${window.Utils.formatDate(product.createdAt)} (${window.Utils.formatRelativeTime(product.createdAt)})
        </div>

        <!-- Description Box -->
        <div>
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Item Description</h3>
          <div class="product-description-box">
            ${window.Utils.escapeHTML(product.description)}
          </div>
        </div>

        <!-- Seller Profile Card -->
        <div class="seller-profile-card">
          ${
            product.seller && product.seller.profileImage
              ? `<img src="${product.seller.profileImage}" class="seller-avatar" alt="Seller Avatar" />`
              : `<div class="nav-avatar-placeholder" style="width: 54px; height: 54px; font-size: 1.4rem;">${window.Utils.escapeHTML((product.seller ? product.seller.name : 'S').charAt(0).toUpperCase())}</div>`
          }
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 1.05rem;">${window.Utils.escapeHTML(product.seller ? product.seller.name : 'Campus Seller')}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">
              Campus Peer &bull; Member since ${window.Utils.formatDate(product.seller ? product.seller.createdAt : null)}
            </div>
            ${
              product.seller && product.seller.phone && user
                ? `<div style="font-size: 0.85rem; color: var(--primary); margin-top: 0.2rem;">📞 ${window.Utils.escapeHTML(product.seller.phone)}</div>`
                : ''
            }
          </div>
        </div>

        <!-- Dynamic Action Buttons -->
        ${actionButtonsHtml}
      </div>
    </div>

    <!-- Mobile Sticky Action Bar -->
    <div class="mobile-product-action-bar" id="mobile-product-action-bar" style="display: none;">
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">${isOwner ? 'Your Listing' : 'Price'}</div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">${window.Utils.formatCurrency(product.price)}</div>
      </div>
      <div style="display: flex; gap: 0.6rem; align-items: center;">
        ${
          isOwner
            ? `
              <a href="/edit-product.html?id=${product._id}" class="btn btn-outline btn-sm">✏️ Edit</a>
              ${product.status === 'AVAILABLE' ? `<button id="mobile-mark-sold-btn" class="btn btn-success btn-sm">✓ Sold</button>` : ''}
            `
            : product.status === 'AVAILABLE'
            ? `<button id="mobile-contact-seller-btn" class="btn btn-primary" style="padding: 0.75rem 1.4rem; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                💬 Contact Seller
              </button>`
            : `<span class="badge badge-sold" style="padding: 0.5rem 0.9rem; font-size: 0.85rem;">SOLD</span>`
        }
      </div>
    </div>
  `;

  // Attach dynamic button listeners
  attachProductActions(product, isOwner);
}

function attachProductActions(product, isOwner) {
  // Contact seller
  const contactBtn = document.getElementById('contact-seller-btn');
  const mobileContactBtn = document.getElementById('mobile-contact-seller-btn');

  const handleContactSeller = async () => {
    const user = await window.Auth.requireAuth();
    if (!user) return;

    try {
      if (contactBtn) {
        contactBtn.disabled = true;
        contactBtn.textContent = 'Opening chat...';
      }
      if (mobileContactBtn) {
        mobileContactBtn.disabled = true;
        mobileContactBtn.textContent = 'Opening...';
      }

      const response = await window.API.startConversation(product._id);
      if (response.success && response.data && response.data.conversation) {
        window.location.href = `/messages.html?conversationId=${response.data.conversation._id}`;
      }
    } catch (error) {
      window.Utils.showToast(error.message || 'Could not start conversation', 'error');
      if (contactBtn) {
        contactBtn.disabled = false;
        contactBtn.textContent = '💬 Contact Student Seller';
      }
      if (mobileContactBtn) {
        mobileContactBtn.disabled = false;
        mobileContactBtn.textContent = '💬 Contact Seller';
      }
    }
  };

  if (contactBtn) contactBtn.addEventListener('click', handleContactSeller);
  if (mobileContactBtn) mobileContactBtn.addEventListener('click', handleContactSeller);

  // Mark as sold
  const markSoldBtn = document.getElementById('mark-sold-btn');
  const mobileMarkSoldBtn = document.getElementById('mobile-mark-sold-btn');

  if (mobileMarkSoldBtn && markSoldBtn) {
    mobileMarkSoldBtn.addEventListener('click', () => markSoldBtn.click());
  }

  // Open report modal
  const reportBtn = document.getElementById('open-report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      const user = await window.Auth.requireAuth();
      if (user) {
        window.Utils.openModal('report-modal');
      }
    });
  }

  // Mark as sold handler
  if (markSoldBtn) {
    markSoldBtn.addEventListener('click', async () => {
      if (!confirm('Mark this listing as sold? Fellow students will see that this item is no longer available.')) {
        return;
      }

      try {
        markSoldBtn.disabled = true;
        const res = await window.API.markProductSold(product._id);
        if (res.success) {
          window.Utils.showToast('Listing marked as SOLD', 'success');
          setTimeout(() => location.reload(), 600);
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Failed to update status', 'error');
        markSoldBtn.disabled = false;
      }
    });
  }

  // Delete listing
  const deleteBtn = document.getElementById('delete-listing-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to permanently remove this listing?')) {
        return;
      }

      try {
        deleteBtn.disabled = true;
        const res = await window.API.deleteProduct(product._id);
        if (res.success) {
          window.Utils.showToast('Listing deleted successfully', 'info');
          setTimeout(() => {
            window.location.href = '/my-listings.html';
          }, 800);
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Failed to delete listing', 'error');
        deleteBtn.disabled = false;
      }
    });
  }
}

function setupReportForm(productId) {
  const reportModal = document.getElementById('report-modal');
  const reportForm = document.getElementById('report-form');
  const submitReportBtn = document.getElementById('submit-report-btn');
  const cancelBtn = document.getElementById('cancel-report-btn');
  const closeBtn = document.getElementById('close-report-modal-btn');
  const backdrop = document.getElementById('report-modal-backdrop');

  const closeReportModal = () => {
    if (window.Utils && typeof window.Utils.closeModal === 'function') {
      window.Utils.closeModal('report-modal');
    } else if (reportModal) {
      reportModal.classList.remove('is-active');
      reportModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  // Dedicated click handlers for closing modal
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeReportModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeReportModal();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeReportModal();
    });
  }

  // Click on modal container background outside content closes modal
  if (reportModal) {
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) {
        closeReportModal();
      }
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (reportModal && (reportModal.classList.contains('is-active') || reportModal.style.display === 'flex')) {
        closeReportModal();
      }
    }
  });

  if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const reason = document.getElementById('report-reason').value;
      const description = document.getElementById('report-description').value.trim();

      if (!reason) {
        window.Utils.showToast('Please select a violation category', 'warning');
        return;
      }

      try {
        submitReportBtn.disabled = true;
        submitReportBtn.textContent = 'Submitting...';

        const res = await window.API.createReport({
          productId,
          reason,
          description,
        });

        if (res.success) {
          closeReportModal();
          window.Utils.showToast('Report submitted. Thank you for keeping our campus safe.', 'success');
          reportForm.reset();
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Failed to submit report', 'error');
      } finally {
        submitReportBtn.disabled = false;
        submitReportBtn.textContent = 'Submit Report';
      }
    });
  }
}
