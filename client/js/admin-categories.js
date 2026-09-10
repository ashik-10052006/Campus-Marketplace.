/**
 * Campus Marketplace - Admin Categories Controller
 */

let editingCategoryId = null;
let currentCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  setupCategoryEventListeners();
  await loadCategories();
  setupCategoryForm();
});

function setupCategoryEventListeners() {
  const openBtn = document.getElementById('open-category-modal-btn');
  const closeBtn = document.getElementById('close-category-modal-btn');
  const cancelBtn = document.getElementById('cancel-category-btn');
  const backdrop = document.getElementById('category-modal-backdrop');
  const modal = document.getElementById('category-modal');
  const tableContainer = document.getElementById('categories-table-container');

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCategoryModal();
    });
  }

  const closeCategoryModal = () => {
    if (window.Utils && typeof window.Utils.closeModal === 'function') {
      window.Utils.closeModal('category-modal');
    } else if (modal) {
      modal.classList.remove('is-active');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeCategoryModal(); });
  if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeCategoryModal(); });
  if (backdrop) backdrop.addEventListener('click', () => closeCategoryModal());

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCategoryModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && (modal.classList.contains('is-active') || modal.style.display === 'flex')) {
      closeCategoryModal();
    }
  });

  // Delegated click handling for Edit & Delete buttons inside categories table
  if (tableContainer) {
    tableContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      e.preventDefault();
      const action = btn.getAttribute('data-action');
      const catId = btn.getAttribute('data-id');
      if (!catId) return;

      const cat = currentCategories.find((c) => String(c._id) === String(catId));
      if (!cat) return;

      if (action === 'edit') {
        editCategory(cat._id, cat.name || '', cat.description || '');
      } else if (action === 'delete') {
        deleteCategory(cat._id, cat.name || 'Category');
      }
    });
  }
}

async function loadCategories() {
  const container = document.getElementById('categories-table-container');
  if (!container) return;

  try {
    const res = await window.API.getCategories();
    if (res.success && res.data && res.data.categories) {
      currentCategories = res.data.categories;

      if (currentCategories.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 2.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏷️</div>
            <h3>No categories created yet</h3>
            <p class="text-muted">Click the "+ Add Category" button above to create your first marketplace category.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Created</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${currentCategories
                .map((c) => {
                  return `
                  <tr>
                    <td data-label="Category Name" style="font-weight: 700; color: var(--text-main);">${window.Utils.escapeHTML(c.name)}</td>
                    <td data-label="Description" style="color: var(--text-muted); max-width: 320px;">${window.Utils.escapeHTML(c.description || '—')}</td>
                    <td data-label="Created" style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(c.createdAt)}</td>
                    <td data-label="Action" style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline btn-sm" data-action="edit" data-id="${c._id}">Edit</button>
                        <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${c._id}">Delete</button>
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
    console.error('Failed to load categories:', err);
    window.Utils.renderError(container, 'Failed to fetch categories.');
  }
}

window.openCategoryModal = function () {
  editingCategoryId = null;
  const titleEl = document.getElementById('category-modal-title');
  const idEl = document.getElementById('category-id');
  const nameEl = document.getElementById('category-name-input');
  const descEl = document.getElementById('category-desc-input');

  if (titleEl) titleEl.textContent = 'Add Category';
  if (idEl) idEl.value = '';
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';
  window.Utils.openModal('category-modal');
};

window.editCategory = function (id, name, desc) {
  editingCategoryId = id;
  const titleEl = document.getElementById('category-modal-title');
  const idEl = document.getElementById('category-id');
  const nameEl = document.getElementById('category-name-input');
  const descEl = document.getElementById('category-desc-input');

  if (titleEl) titleEl.textContent = 'Edit Category';
  if (idEl) idEl.value = id;
  if (nameEl) nameEl.value = name;
  if (descEl) descEl.value = desc;
  window.Utils.openModal('category-modal');
};

window.deleteCategory = async function (id, name) {
  if (!confirm(`Are you sure you want to delete the "${name}" category?`)) {
    return;
  }

  try {
    const res = await window.API.deleteCategory(id);
    if (res.success) {
      window.Utils.showToast(`Category "${name}" deleted`, 'info');
      loadCategories();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to delete category', 'error');
  }
};

function setupCategoryForm() {
  const form = document.getElementById('category-form');
  const saveBtn = document.getElementById('save-cat-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('category-name-input').value.trim();
      const description = document.getElementById('category-desc-input').value.trim();

      if (!name) return;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        if (editingCategoryId) {
          await window.API.updateCategory(editingCategoryId, { name, description });
          window.Utils.showToast('Category updated successfully', 'success');
        } else {
          await window.API.createCategory({ name, description });
          window.Utils.showToast('Category created successfully', 'success');
        }

        window.Utils.closeModal('category-modal');
        loadCategories();
      } catch (err) {
        window.Utils.showToast(err.message || 'Operation failed', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Category';
      }
    });
  }
}
