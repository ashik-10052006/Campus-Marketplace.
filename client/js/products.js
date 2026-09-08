/**
 * Campus Marketplace - Products Catalog Controller
 */

let currentParams = {
  page: 1,
  limit: 12,
  search: '',
  category: '',
  condition: '',
  minPrice: '',
  maxPrice: '',
  status: 'AVAILABLE',
  sort: 'newest',
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Read URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search')) currentParams.search = urlParams.get('search');
  if (urlParams.has('category')) currentParams.category = urlParams.get('category');
  if (urlParams.has('condition')) currentParams.condition = urlParams.get('condition');
  if (urlParams.has('minPrice')) currentParams.minPrice = urlParams.get('minPrice');
  if (urlParams.has('maxPrice')) currentParams.maxPrice = urlParams.get('maxPrice');
  if (urlParams.has('status')) currentParams.status = urlParams.get('status');
  if (urlParams.has('sort')) currentParams.sort = urlParams.get('sort');
  if (urlParams.has('page')) currentParams.page = parseInt(urlParams.get('page'), 10) || 1;

  // 2. Sync filter input states from URL
  syncInputsWithState();

  // 3. Load categories for filter dropdown
  await populateCategoryDropdown();

  // 4. Attach event listeners
  setupEventListeners();

  // 5. Fetch and render products
  fetchAndRenderProducts();
});

function syncInputsWithState() {
  const searchInput = document.getElementById('search-input');
  const conditionSelect = document.getElementById('filter-condition');
  const minPriceInput = document.getElementById('filter-min-price');
  const maxPriceInput = document.getElementById('filter-max-price');
  const statusSelect = document.getElementById('filter-status');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = currentParams.search || '';
  if (conditionSelect) conditionSelect.value = currentParams.condition || '';
  if (minPriceInput) minPriceInput.value = currentParams.minPrice || '';
  if (maxPriceInput) maxPriceInput.value = currentParams.maxPrice || '';
  if (statusSelect) statusSelect.value = currentParams.status || 'AVAILABLE';
  if (sortSelect) sortSelect.value = currentParams.sort || 'newest';
}

async function populateCategoryDropdown() {
  const categorySelect = document.getElementById('filter-category');
  if (!categorySelect) return;

  try {
    const response = await window.API.getCategories();
    if (response.success && response.data && response.data.categories) {
      const categories = response.data.categories;
      categories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        if (currentParams.category.toLowerCase() === cat.name.toLowerCase()) {
          option.selected = true;
        }
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to populate categories filter:', error);
  }
}

function setupEventListeners() {
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const applyBtn = document.getElementById('apply-filters-btn');
  const clearBtn = document.getElementById('clear-filters-btn');
  const sortSelect = document.getElementById('sort-select');
  const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
  const filtersSidebar = document.getElementById('filters-sidebar');

  // Search
  const handleSearch = () => {
    currentParams.search = searchInput ? searchInput.value.trim() : '';
    currentParams.page = 1;
    fetchAndRenderProducts();
  };

  if (searchBtn) searchBtn.addEventListener('click', handleSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }

  // Apply filters
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const categorySelect = document.getElementById('filter-category');
      const conditionSelect = document.getElementById('filter-condition');
      const minPrice = document.getElementById('filter-min-price');
      const maxPrice = document.getElementById('filter-max-price');
      const statusSelect = document.getElementById('filter-status');

      currentParams.category = categorySelect ? categorySelect.value : '';
      currentParams.condition = conditionSelect ? conditionSelect.value : '';
      currentParams.minPrice = minPrice ? minPrice.value.trim() : '';
      currentParams.maxPrice = maxPrice ? maxPrice.value.trim() : '';
      currentParams.status = statusSelect ? statusSelect.value : 'AVAILABLE';
      currentParams.page = 1;

      fetchAndRenderProducts();

      // On mobile, close filter drawer after applying
      if (filtersSidebar && filtersSidebar.classList.contains('is-open')) {
        filtersSidebar.classList.remove('is-open');
      }
    });
  }

  // Clear filters
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentParams = {
        page: 1,
        limit: 12,
        search: '',
        category: '',
        condition: '',
        minPrice: '',
        maxPrice: '',
        status: 'AVAILABLE',
        sort: 'newest',
      };
      syncInputsWithState();
      const categorySelect = document.getElementById('filter-category');
      if (categorySelect) categorySelect.value = '';
      fetchAndRenderProducts();
    });
  }

  // Sort
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentParams.sort = sortSelect.value;
      currentParams.page = 1;
      fetchAndRenderProducts();
    });
  }

  // Mobile toggle filters
  if (toggleFiltersBtn && filtersSidebar) {
    toggleFiltersBtn.style.display = 'inline-flex';
    toggleFiltersBtn.addEventListener('click', () => {
      filtersSidebar.classList.toggle('is-open');
    });
  }
}

async function fetchAndRenderProducts() {
  const grid = document.getElementById('products-grid');
  const countLabel = document.getElementById('results-count');
  const paginationWrapper = document.getElementById('pagination-wrapper');

  if (!grid) return;

  // Update browser URL query string without reloading
  updateUrlParams();

  grid.innerHTML = `
    <div class="spinner-wrapper" style="grid-column: 1 / -1;">
      <div class="spinner"></div>
      <span class="spinner-text">Searching campus marketplace...</span>
    </div>
  `;

  try {
    const response = await window.API.getProducts(currentParams);
    if (response.success && response.data) {
      const { products, pagination } = response.data;

      // Update count label
      if (countLabel) {
        countLabel.textContent = `Showing ${products.length} of ${pagination.total} ${pagination.total === 1 ? 'item' : 'items'}`;
      }

      if (products.length === 0) {
        window.Utils.renderEmptyState(grid, {
          title: 'No products found',
          subtitle: 'Try adjusting your search terms or clearing your filter selections.',
          actionText: 'Clear All Filters',
          actionLink: '/products.html',
        });
        if (paginationWrapper) paginationWrapper.innerHTML = '';
        return;
      }

      // Render product cards
      grid.innerHTML = products
        .map((product) => {
          return `
            <a href="/product-details.html?id=${product._id}" class="product-card">
              <div class="product-card-img-wrapper">
                <img src="${product.imageUrl}" alt="${window.Utils.escapeHTML(product.name)}" class="product-card-img" loading="lazy" />
              </div>
              <div class="product-card-body">
                <div class="product-card-badges">
                  ${window.Utils.getConditionBadge(product.condition)}
                  ${window.Utils.getStatusBadge(product.status)}
                </div>
                <h3 class="product-card-title">${window.Utils.escapeHTML(product.name)}</h3>
                <div class="product-card-price">${window.Utils.formatCurrency(product.price)}</div>
                <div class="product-card-meta">
                  <span>${window.Utils.escapeHTML(product.category ? product.category.name : 'General')}</span>
                  <span>${window.Utils.formatRelativeTime(product.createdAt)}</span>
                </div>
              </div>
            </a>
          `;
        })
        .join('');

      // Render pagination
      renderPagination(pagination);
    }
  } catch (error) {
    console.error('Products load error:', error);
    window.Utils.renderError(grid, 'Failed to fetch items. Please check your connection.');
  }
}

function renderPagination({ page, totalPages }) {
  const container = document.getElementById('pagination-wrapper');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
      &larr; Prev
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
      html += `
        <button class="page-btn ${p === page ? 'active' : ''}" onclick="changePage(${p})">
          ${p}
        </button>
      `;
    } else if (p === page - 3 || p === page + 3) {
      html += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
    }
  }

  html += `
    <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">
      Next &rarr;
    </button>
  `;

  container.innerHTML = html;
}

window.changePage = function (newPage) {
  currentParams.page = newPage;
  window.scrollTo({ top: 120, behavior: 'smooth' });
  fetchAndRenderProducts();
};

function updateUrlParams() {
  const params = new URLSearchParams();
  Object.keys(currentParams).forEach((key) => {
    if (currentParams[key] !== '' && currentParams[key] !== undefined) {
      if (key === 'status' && currentParams[key] === 'AVAILABLE') return;
      if (key === 'sort' && currentParams[key] === 'newest') return;
      if (key === 'page' && currentParams[key] === 1) return;
      params.set(key, currentParams[key]);
    }
  });
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState({}, '', newUrl);
}
