/**
 * Campus Marketplace - Edit Product Controller
 */

let productId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/my-listings.html';
    return;
  }

  await loadCategories();
  await loadProductData();
  setupImagePreview();
  setupAiPolish();
  setupFormSubmit();
});

async function loadCategories() {
  const select = document.getElementById('edit-category');
  try {
    const res = await window.API.getCategories();
    if (res.success && res.data && res.data.categories) {
      select.innerHTML = res.data.categories
        .map((c) => `<option value="${c._id}">${window.Utils.escapeHTML(c.name)}</option>`)
        .join('');
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadProductData() {
  try {
    const res = await window.API.getProduct(productId);
    if (res.success && res.data && res.data.product) {
      const p = res.data.product;
      const user = window.Auth.getUser();

      // Check ownership
      const sellerId = p.seller ? (p.seller._id || p.seller) : null;
      if (String(user._id) !== String(sellerId) && user.role !== 'admin') {
        window.Utils.showToast('You do not have permission to edit this listing', 'error');
        setTimeout(() => (window.location.href = '/my-listings.html'), 1000);
        return;
      }

      document.getElementById('edit-name').value = p.name;
      document.getElementById('edit-price').value = p.price;
      document.getElementById('edit-description').value = p.description;
      document.getElementById('edit-condition').value = p.condition;
      document.getElementById('edit-status').value = p.status;
      if (p.category) {
        document.getElementById('edit-category').value = p.category._id;
      }

      const imgPreview = document.getElementById('current-image-preview');
      if (imgPreview) imgPreview.src = p.imageUrl;
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to load listing details', 'error');
  }
}

function setupImagePreview() {
  const fileInput = document.getElementById('edit-image');
  const imgPreview = document.getElementById('current-image-preview');

  if (fileInput && imgPreview) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imgPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function setupAiPolish() {
  const improveBtn = document.getElementById('ai-improve-edit-btn');
  const descTextarea = document.getElementById('edit-description');
  const nameInput = document.getElementById('edit-name');
  const catSelect = document.getElementById('edit-category');

  if (improveBtn && descTextarea) {
    improveBtn.addEventListener('click', async () => {
      const text = descTextarea.value.trim();
      if (!text) {
        window.Utils.showToast('Enter a description first', 'warning');
        return;
      }

      try {
        improveBtn.disabled = true;
        improveBtn.textContent = 'Polishing with Claude...';

        const categoryName = catSelect.options[catSelect.selectedIndex]?.text || '';

        const res = await window.API.improveDescription({
          currentDescription: text,
          name: nameInput.value.trim(),
          category: categoryName,
        });

        if (res.success && res.data && res.data.description) {
          descTextarea.value = res.data.description;
          window.Utils.showToast('Description polished successfully!', 'success');
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Claude AI polish failed', 'error');
      } finally {
        improveBtn.disabled = false;
        improveBtn.textContent = '🪄 Claude AI Polish';
      }
    });
  }
}

function setupFormSubmit() {
  const form = document.getElementById('edit-product-form');
  const saveBtn = document.getElementById('save-changes-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('edit-name').value.trim();
      const category = document.getElementById('edit-category').value;
      const condition = document.getElementById('edit-condition').value;
      const price = document.getElementById('edit-price').value;
      const status = document.getElementById('edit-status').value;
      const description = document.getElementById('edit-description').value.trim();
      const fileInput = document.getElementById('edit-image');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('price', price);
      formData.append('status', status);
      formData.append('description', description);

      if (fileInput.files && fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Changes...';

        const res = await window.API.updateProduct(productId, formData);
        if (res.success) {
          window.Utils.showToast('Listing updated successfully!', 'success');
          setTimeout(() => {
            window.location.href = `/product-details.html?id=${productId}`;
          }, 800);
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to update listing', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }
}
