/**
 * Campus Marketplace - Student Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  const statTotal = document.getElementById('stat-total');
  const statAvailable = document.getElementById('stat-available');
  const statSold = document.getElementById('stat-sold');
  const statMessages = document.getElementById('stat-messages');
  const listingsContainer = document.getElementById('dashboard-listings-container');

  try {
    // 1. Fetch user's listings
    const listingsRes = await window.API.getMyListings();
    const products = (listingsRes.success && listingsRes.data && listingsRes.data.products) || [];

    const total = products.length;
    const available = products.filter((p) => p.status === 'AVAILABLE').length;
    const sold = products.filter((p) => p.status === 'SOLD').length;

    if (statTotal) statTotal.textContent = total;
    if (statAvailable) statAvailable.textContent = available;
    if (statSold) statSold.textContent = sold;

    // 2. Fetch conversations
    try {
      const convsRes = await window.API.getConversations();
      const convs = (convsRes.success && convsRes.data && convsRes.data.conversations) || [];
      if (statMessages) statMessages.textContent = convs.length;
    } catch (e) {
      console.warn('Could not fetch conversations count:', e);
    }

    // 3. Render table of recent listings
    if (listingsContainer) {
      if (products.length === 0) {
        window.Utils.renderEmptyState(listingsContainer, {
          title: "You haven't listed anything yet",
          subtitle: 'Start selling your unused college books and gadgets today!',
          actionText: 'Post Your First Item',
          actionLink: '/create-product.html',
        });
      } else {
        const recent = products.slice(0, 5);
        listingsContainer.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Listed Date</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${recent
                  .map((p) => {
                    return `
                    <tr>
                      <td style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${p.imageUrl}" class="table-thumbnail" alt="${window.Utils.escapeHTML(p.name)}" />
                        <span style="font-weight: 600;">${window.Utils.escapeHTML(p.name)}</span>
                      </td>
                      <td style="font-weight: 700; color: var(--primary);">${window.Utils.formatCurrency(p.price)}</td>
                      <td>${window.Utils.getConditionBadge(p.condition)}</td>
                      <td>${window.Utils.getStatusBadge(p.status)}</td>
                      <td style="color: var(--text-muted);">${window.Utils.formatDate(p.createdAt)}</td>
                      <td style="text-align: right;">
                        <a href="/product-details.html?id=${p._id}" class="btn btn-outline btn-sm">View</a>
                        <a href="/edit-product.html?id=${p._id}" class="btn btn-outline btn-sm">Edit</a>
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
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
    if (listingsContainer) {
      window.Utils.renderError(listingsContainer, 'Failed to load dashboard metrics.');
    }
  }
}
