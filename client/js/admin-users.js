/**
 * Campus Marketplace - Admin Users Controller
 */

let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  setupUserFilters();
  setupUserTableEvents();
  await loadUsers();
});

function setupUserFilters() {
  const searchInput = document.getElementById('users-search-input');
  const roleFilter = document.getElementById('user-role-filter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFilteredUsers();
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      renderFilteredUsers();
    });
  }
}

function setupUserTableEvents() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (!btn) return;

    e.preventDefault();
    const userId = btn.getAttribute('data-id');
    const userName = btn.getAttribute('data-name') || 'this user';
    if (!userId) return;

    if (!confirm(`Are you sure you want to remove user "${userName}" from the platform?`)) {
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Removing...';
      const res = await window.API.deleteUser(userId);
      if (res.success) {
        window.Utils.showToast(`User ${userName} removed successfully`, 'info');
        allUsers = allUsers.filter((u) => u._id !== userId);
        renderFilteredUsers();
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to remove user', 'error');
      btn.disabled = false;
      btn.textContent = 'Remove';
    }
  });
}

async function loadUsers() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    const res = await window.API.getUsers({ limit: 100 });
    if (res.success && res.data && res.data.users) {
      allUsers = res.data.users;
      renderFilteredUsers();
    }
  } catch (err) {
    console.error('Users load error:', err);
    window.Utils.renderError(container, 'Failed to fetch registered student accounts.');
  }
}

function renderFilteredUsers() {
  const container = document.getElementById('users-table-container');
  const countBadge = document.getElementById('user-count-badge');
  const searchInput = document.getElementById('users-search-input');
  const roleFilter = document.getElementById('user-role-filter');

  if (!container) return;

  const searchVal = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const roleVal = roleFilter ? roleFilter.value : '';

  const filtered = allUsers.filter((u) => {
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchesSearch = !searchVal || name.includes(searchVal) || email.includes(searchVal);
    const matchesRole = !roleVal || u.role === roleVal;
    return matchesSearch && matchesRole;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${allUsers.length} Students`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem 1.5rem; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="font-size: 1.15rem; margin-bottom: 0.35rem;">No students found</h3>
        <p class="text-muted" style="font-size: 0.9rem;">Try adjusting your search criteria or role filters.</p>
      </div>
    `;
    return;
  }

  const currentUser = window.Auth.getUser() || {};

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Registered</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((u) => {
              const isSelf = currentUser._id === u._id;
              return `
              <tr>
                <td data-label="Student">
                  <div class="table-user-cell">
                    ${
                      u.profileImage
                        ? `<img src="${u.profileImage}" class="nav-avatar" alt="Avatar" />`
                        : `<div class="nav-avatar-placeholder" style="width: 34px; height: 34px; font-size: 0.85rem; font-weight: 700;">${window.Utils.escapeHTML(
                            (u.name || 'U').charAt(0).toUpperCase()
                          )}</div>`
                    }
                    <div>
                      <div style="font-weight: 700; color: var(--text-main);">${window.Utils.escapeHTML(u.name)}</div>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">${window.Utils.escapeHTML(u.university || 'Campus Student')}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Email" style="font-size: 0.88rem; color: var(--text-main);">
                  <a href="mailto:${window.Utils.escapeHTML(u.email)}" style="color: inherit; text-decoration: none;">
                    ${window.Utils.escapeHTML(u.email)}
                  </a>
                </td>
                <td data-label="Phone" style="font-size: 0.88rem; color: var(--text-muted);">${window.Utils.escapeHTML(u.phone || '—')}</td>
                <td data-label="Role">
                  <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-good'}" style="font-size: 0.78rem;">
                    ${window.Utils.escapeHTML(u.role === 'admin' ? 'Administrator' : 'Student')}
                  </span>
                </td>
                <td data-label="Registered" style="color: var(--text-muted); font-size: 0.85rem;">
                  ${window.Utils.formatDate(u.createdAt)}
                </td>
                <td data-label="Action" style="text-align: right;">
                  ${
                    isSelf
                      ? '<span class="badge badge-accent" style="font-size: 0.78rem;">Current Account</span>'
                      : `<button type="button" class="btn btn-danger btn-sm" data-action="remove" data-id="${u._id}" data-name="${window.Utils.escapeHTML(
                          u.name
                        )}">Remove</button>`
                  }
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
