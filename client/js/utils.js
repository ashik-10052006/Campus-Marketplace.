/**
 * Campus Marketplace - UI Helpers, Toast Notifications, and Utilities
 */

// Toast notification container init
let toastContainer = null;
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-in`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getConditionBadge(condition) {
  const map = {
    NEW: { label: 'Brand New', cls: 'badge-new' },
    LIKE_NEW: { label: 'Like New', cls: 'badge-like-new' },
    GOOD: { label: 'Good', cls: 'badge-good' },
    FAIR: { label: 'Fair', cls: 'badge-fair' },
  };
  const item = map[condition] || { label: condition || 'Used', cls: 'badge-default' };
  return `<span class="badge ${item.cls}">${escapeHTML(item.label)}</span>`;
}

function getStatusBadge(status) {
  const map = {
    AVAILABLE: { label: 'Available', cls: 'badge-available' },
    SOLD: { label: 'Sold', cls: 'badge-sold' },
    REMOVED: { label: 'Removed', cls: 'badge-removed' },
  };
  const item = map[status] || { label: status, cls: 'badge-default' };
  return `<span class="badge ${item.cls}">${escapeHTML(item.label)}</span>`;
}

function renderEmptyState(container, { title, subtitle, actionText, actionLink, icon = '📦' }) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${escapeHTML(title)}</h3>
      <p class="empty-state-subtitle">${escapeHTML(subtitle)}</p>
      ${
        actionText && actionLink
          ? `<a href="${escapeHTML(actionLink)}" class="btn btn-primary mt-3">${escapeHTML(actionText)}</a>`
          : ''
      }
    </div>
  `;
}

function renderError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <p class="error-text">${escapeHTML(message || 'Failed to load content')}</p>
    </div>
  `;
}

function showLoading(element, message = 'Loading...') {
  if (!element) return;
  element.setAttribute('data-prev-content', element.innerHTML);
  element.innerHTML = `
    <div class="spinner-wrapper">
      <div class="spinner"></div>
      <span class="spinner-text">${escapeHTML(message)}</span>
    </div>
  `;
}

function hideLoading(element) {
  if (!element) return;
  const prev = element.getAttribute('data-prev-content');
  if (prev !== null) {
    element.innerHTML = prev;
    element.removeAttribute('data-prev-content');
  }
}

function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Modal management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('is-active');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('is-active');
    document.body.classList.remove('modal-open');
  }
}

// Global UI utility attachment
window.Utils = {
  showToast,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  escapeHTML,
  getConditionBadge,
  getStatusBadge,
  renderEmptyState,
  renderError,
  showLoading,
  hideLoading,
  debounce,
  openModal,
  closeModal,
};
