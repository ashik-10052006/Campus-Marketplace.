/**
 * Campus Marketplace - Create Product Controller with Claude AI Integration
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authenticated
  const user = await window.Auth.requireAuth();
  if (!user) return;

  await loadCategories();
  setupImagePreview();
  setupAiFeatures();
  setupFormSubmission();
});

async function loadCategories() {
  const select = document.getElementById('product-category');
  if (!select) return;

  try {
    const res = await window.API.getCategories();
    if (res.success && res.data && res.data.categories) {
      res.data.categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat._id;
        opt.textContent = cat.name;
        opt.setAttribute('data-name', cat.name);
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function setupImagePreview() {
  const fileInput = document.getElementById('product-image');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');

  if (fileInput && previewContainer && previewImg) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          window.Utils.showToast('File size exceeds 5MB limit. Please choose a smaller image.', 'warning');
          fileInput.value = '';
          previewContainer.style.display = 'none';
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = 'none';
      }
    });
  }
}

function setupAiFeatures() {
  const nameInput = document.getElementById('product-name');
  const categorySelect = document.getElementById('product-category');
  const conditionSelect = document.getElementById('product-condition');
  const priceInput = document.getElementById('product-price');
  const descTextarea = document.getElementById('product-description');

  // 1. Smart Listing Assistant
  const assistantBtn = document.getElementById('ai-assistant-btn');
  const quickNotesInput = document.getElementById('ai-quick-notes');

  if (assistantBtn && quickNotesInput) {
    assistantBtn.addEventListener('click', async () => {
      const notes = quickNotesInput.value.trim();
      if (!notes) {
        window.Utils.showToast('Please type some notes about your item first', 'warning');
        return;
      }

      try {
        assistantBtn.disabled = true;
        assistantBtn.textContent = 'Analyzing with Claude...';

        const res = await window.API.getListingAssistant({ rawNotes: notes });
        if (res.success && res.data && res.data.listing) {
          const item = res.data.listing;

          if (item.name) nameInput.value = item.name;
          if (item.description) descTextarea.value = item.description;
          if (item.suggestedPrice) priceInput.value = item.suggestedPrice;
          if (item.condition) conditionSelect.value = item.condition;

          // Match category by name in options
          if (item.category) {
            for (let i = 0; i < categorySelect.options.length; i++) {
              if (
                categorySelect.options[i].getAttribute('data-name') &&
                categorySelect.options[i].getAttribute('data-name').toLowerCase() ===
                  item.category.toLowerCase()
              ) {
                categorySelect.selectedIndex = i;
                break;
              }
            }
          }

          window.Utils.showToast('Listing autofilled by Claude! Review and customize below.', 'success');
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'AI assistant encountered an error', 'error');
      } finally {
        assistantBtn.disabled = false;
        assistantBtn.textContent = '✨ Autofill Listing';
      }
    });
  }

  // 2. Suggest Category
  const suggestCatBtn = document.getElementById('ai-suggest-category-btn');
  if (suggestCatBtn) {
    suggestCatBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        window.Utils.showToast('Enter a listing title before asking for category suggestion', 'warning');
        nameInput.focus();
        return;
      }

      try {
        suggestCatBtn.disabled = true;
        suggestCatBtn.textContent = 'Suggesting...';

        const res = await window.API.suggestCategory({
          name,
          description: descTextarea.value.trim(),
        });

        if (res.success && res.data && res.data.category) {
          const catName = res.data.category;
          let matched = false;
          for (let i = 0; i < categorySelect.options.length; i++) {
            if (
              categorySelect.options[i].getAttribute('data-name') &&
              categorySelect.options[i].getAttribute('data-name').toLowerCase() === catName.toLowerCase()
            ) {
              categorySelect.selectedIndex = i;
              matched = true;
              break;
            }
          }

          if (matched) {
            window.Utils.showToast(`Selected category: ${catName}`, 'success');
          } else {
            window.Utils.showToast(`Suggested category: ${catName}`, 'info');
          }
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Category suggestion failed', 'error');
      } finally {
        suggestCatBtn.disabled = false;
        suggestCatBtn.textContent = '✨ AI Suggest';
      }
    });
  }

  // 3. Generate Description
  const genDescBtn = document.getElementById('ai-generate-desc-btn');
  if (genDescBtn) {
    genDescBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        window.Utils.showToast('Please enter a product title first', 'warning');
        nameInput.focus();
        return;
      }

      const selectedOpt = categorySelect.options[categorySelect.selectedIndex];
      const categoryName = selectedOpt ? selectedOpt.getAttribute('data-name') || '' : '';

      try {
        genDescBtn.disabled = true;
        genDescBtn.textContent = 'Drafting...';

        const res = await window.API.generateDescription({
          name,
          category: categoryName,
          condition: conditionSelect.value,
          price: priceInput.value || 0,
        });

        if (res.success && res.data && res.data.description) {
          descTextarea.value = res.data.description;
          window.Utils.showToast('Marketplace description generated!', 'success');
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Description generation failed', 'error');
      } finally {
        genDescBtn.disabled = false;
        genDescBtn.textContent = '✨ Generate Description';
      }
    });
  }

  // 4. Improve Description
  const improveDescBtn = document.getElementById('ai-improve-desc-btn');
  if (improveDescBtn) {
    improveDescBtn.addEventListener('click', async () => {
      const currentDesc = descTextarea.value.trim();
      if (!currentDesc) {
        window.Utils.showToast('Please write a draft description first to improve', 'warning');
        descTextarea.focus();
        return;
      }

      const selectedOpt = categorySelect.options[categorySelect.selectedIndex];
      const categoryName = selectedOpt ? selectedOpt.getAttribute('data-name') || '' : '';

      try {
        improveDescBtn.disabled = true;
        improveDescBtn.textContent = 'Polishing...';

        const res = await window.API.improveDescription({
          currentDescription: currentDesc,
          name: nameInput.value.trim(),
          category: categoryName,
        });

        if (res.success && res.data && res.data.description) {
          descTextarea.value = res.data.description;
          window.Utils.showToast('Description polished for student marketplace!', 'success');
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Improve description failed', 'error');
      } finally {
        improveDescBtn.disabled = false;
        improveDescBtn.textContent = '🪄 Improve Draft';
      }
    });
  }
}

function setupFormSubmission() {
  const form = document.getElementById('create-product-form');
  const submitBtn = document.getElementById('submit-listing-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('product-name').value.trim();
      const category = document.getElementById('product-category').value;
      const condition = document.getElementById('product-condition').value;
      const price = document.getElementById('product-price').value;
      const fileInput = document.getElementById('product-image');
      const description = document.getElementById('product-description').value.trim();

      if (!name || !category || !condition || !price || !description) {
        window.Utils.showToast('Please complete all required fields', 'warning');
        return;
      }

      if (!fileInput.files || !fileInput.files[0]) {
        window.Utils.showToast('Please select an item image', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('image', fileInput.files[0]);

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading & Publishing...';

        const res = await window.API.createProduct(formData);

        if (res.success && res.data && res.data.product) {
          window.Utils.showToast('Listing published successfully!', 'success');
          setTimeout(() => {
            window.location.href = `/product-details.html?id=${res.data.product._id}`;
          }, 800);
        }
      } catch (error) {
        window.Utils.showToast(error.message || 'Failed to publish listing', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Listing';
      }
    });
  }
}
