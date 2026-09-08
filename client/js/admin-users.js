/**
 * Campus Marketplace - Admin Users Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  await loadUsers();
});

async function loadUsers() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    const res = await window.API.getUsers({ limit: 50 });
    if (res.success && res.data && res.data.users) {
      const users = res.data.users;
      const currentUser = window.Auth.getUser();

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
              ${users
                .map((u) => {
                  const isSelf = currentUser._id === u._id;
                  return `
                  <tr>
                    <td style="display: flex; align-items: center; gap: 0.75rem;">
                      ${
                        u.profileImage
                          ? `<img src="${u.profileImage}" class="nav-avatar" alt="Avatar" />`
                          : `<div class="nav-avatar-placeholder" style="width: 32px; height: 32px; font-size: 0.85rem;">${window.Utils.escapeHTML(u.name.charAt(0).toUpperCase())}</div>`
                      }
                      <span style="font-weight: 600;">${window.Utils.escapeHTML(u.name)}</span>
                    </td>
                    <td>${window.Utils.escapeHTML(u.email)}</td>
                    <td>${window.Utils.escapeHTML(u.phone || 'N/A')}</td>
                    <td>
                      <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-good'}">
                        ${window.Utils.escapeHTML(u.role)}
                      </span>
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">${window.Utils.formatDate(u.createdAt)}</td>
                    <td style="text-align: right;">
                      ${
                        isSelf
                          ? '<span class="text-muted" style="font-size: 0.8rem;">Current Account</span>'
                          : `<button class="btn btn-danger btn-sm" onclick="removeUser('${u._id}', '${window.Utils.escapeHTML(u.name)}')">Remove</button>`
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
  } catch (err) {
    console.error('Users load error:', err);
    window.Utils.renderError(container, 'Failed to fetch registered users.');
  }
}

window.removeUser = async function (userId, name) {
  if (!confirm(`Are you sure you want to remove user "${name}" from the platform?`)) {
    return;
  }

  try {
    const res = await window.API.deleteUser(userId);
    if (res.success) {
      window.Utils.showToast(`User ${name} removed`, 'info');
      loadUsers();
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to remove user', 'error');
  }
};
