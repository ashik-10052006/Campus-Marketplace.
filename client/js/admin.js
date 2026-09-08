/**
 * Campus Marketplace - Admin Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAdmin();
  if (!user) return;

  await loadAdminStats();
});

async function loadAdminStats() {
  const statUsers = document.getElementById('stat-total-users');
  const statProducts = document.getElementById('stat-total-products');
  const statAvail = document.getElementById('stat-avail-products');
  const statReports = document.getElementById('stat-pending-reports');

  try {
    // 1. Users count
    const usersRes = await window.API.getUsers({ limit: 1 });
    if (usersRes.success && usersRes.data && usersRes.data.pagination) {
      if (statUsers) statUsers.textContent = usersRes.data.pagination.total;
    }

    // 2. Products count
    const productsRes = await window.API.getProducts({ limit: 1 });
    if (productsRes.success && productsRes.data && productsRes.data.pagination) {
      if (statAvail) statAvail.textContent = productsRes.data.pagination.total;
    }

    // 3. Total products including sold/removed
    const allProductsRes = await window.API.getProducts({ status: 'SOLD', limit: 1 });
    const soldTotal =
      (allProductsRes.success && allProductsRes.data && allProductsRes.data.pagination.total) || 0;
    const availTotal =
      (productsRes.success && productsRes.data && productsRes.data.pagination.total) || 0;
    if (statProducts) statProducts.textContent = availTotal + soldTotal;

    // 4. Pending reports count
    const reportsRes = await window.API.getReports({ status: 'PENDING', limit: 1 });
    if (reportsRes.success && reportsRes.data && reportsRes.data.pagination) {
      if (statReports) statReports.textContent = reportsRes.data.pagination.total;
    }
  } catch (error) {
    console.error('Failed to load admin stats:', error);
  }
}
