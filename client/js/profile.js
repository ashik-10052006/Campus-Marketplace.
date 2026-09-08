/**
 * Campus Marketplace - Profile Management Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  await loadProfile();
  setupAvatarPreview();
  setupProfileForm();
});

async function loadProfile() {
  try {
    const res = await window.API.getProfile();
    if (res.success && res.data && res.data.user) {
      const u = res.data.user;

      document.getElementById('profile-name').value = u.name || '';
      document.getElementById('profile-email').value = u.email || '';
      document.getElementById('profile-phone').value = u.phone || '';
      document.getElementById('profile-role').textContent = u.role || 'student';
      document.getElementById('profile-joined').textContent = window.Utils.formatDate(u.createdAt);

      const avatarImg = document.getElementById('avatar-image');
      const avatarPlaceholder = document.getElementById('avatar-placeholder');

      if (u.profileImage) {
        avatarImg.src = u.profileImage;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
      } else {
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
        avatarPlaceholder.textContent = (u.name || 'S').charAt(0).toUpperCase();
      }
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to load profile details', 'error');
  }
}

function setupAvatarPreview() {
  const fileInput = document.getElementById('profile-image-input');
  const avatarImg = document.getElementById('avatar-image');
  const avatarPlaceholder = document.getElementById('avatar-placeholder');

  if (fileInput && avatarImg && avatarPlaceholder) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          window.Utils.showToast('Profile image must be under 5MB', 'warning');
          fileInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          avatarImg.src = e.target.result;
          avatarImg.style.display = 'block';
          avatarPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('save-profile-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profile-name').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();
      const fileInput = document.getElementById('profile-image-input');

      if (!name || !phone) {
        window.Utils.showToast('Name and phone number are required', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);

      if (fileInput.files && fileInput.files[0]) {
        formData.append('profileImage', fileInput.files[0]);
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating Profile...';

        const res = await window.API.updateProfile(formData);
        if (res.success) {
          window.Utils.showToast('Profile updated successfully!', 'success');
          // Refresh navbar and state
          if (window.Auth) {
            await window.Auth.checkAuth();
          }
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile';
      }
    });
  }
}
