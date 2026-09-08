/**
 * Campus Marketplace - Admin Categories Controller
 */

let editingCategoryId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  await loadCategories();
  setupCategoryForm();
});

async function loadCategories() {
  const container = document.getElementById('categories-table-container');
  if (!container) return;

  try {
    const res = await window.API.getCategories();
    if (res.success && res.data && res.data.categories) {
      const categories = res.data.categories;

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
              ${categories
                .map((c) => {
                  return `
                  <tr>
                    <td style="font-weight: 700; color: var(--text-main);">${window.Utils.escapeHTML(c.name)}</td>
                    <td style="color: var(--text-muted); max-width: 320px;">${window.Utils.escapeHTML(c.description || '—')}</td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(c.createdAt)}</td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.4rem;">
                        <button class="btn btn-outline btn-sm" onclick="editCategory('${c._id}', '${window.Utils.escapeHTML(c.name)}', '${window.Utils.escapeHTML(c.description || '')}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c._id}', '${window.Utils.escapeHTML(c.name)}')">Delete</button>
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
  document.getElementById('category-modal-title').textContent = 'Add Category';
  document.getElementById('category-id').value = '';
  document.getElementById('category-name-input').value = '';
  document.getElementById('category-desc-input').value = '';
  window.Utils.openModal('category-modal');
};

window.editCategory = function (id, name, desc) {
  editingCategoryId = id;
  document.getElementById('category-modal-title').textContent = 'Edit Category';
  document.getElementById('category-id').value = id;
  document.getElementById('category-name-input').value = name;
  document.getElementById('category-desc-input').value = desc;
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
      }
    });
  }
}
