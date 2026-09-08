/**
 * Campus Marketplace - Auth State Manager & Route Guard
 */

let currentUser = null;
let authCheckPromise = null;

async function checkAuth() {
  if (authCheckPromise) return authCheckPromise;

  authCheckPromise = (async () => {
    try {
      const response = await window.API.getCurrentUser();
      if (response.success && response.data && response.data.user) {
        currentUser = response.data.user;
        window.currentUser = currentUser;
      } else {
        currentUser = null;
        window.currentUser = null;
      }
    } catch (error) {
      currentUser = null;
      window.currentUser = null;
    }
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      window.Navbar.render();
    }
    return currentUser;
  })();

  return authCheckPromise;
}

async function requireAuth(redirectTo = '/login.html') {
  const user = await checkAuth();
  if (!user) {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${redirectTo}?redirect=${currentPath}`;
    return null;
  }
  return user;
}

async function requireAdmin(redirectTo = '/index.html') {
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    window.Utils.showToast('Access Denied: Administrator account required', 'error');
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1500);
    return null;
  }
  return user;
}

async function logout() {
  try {
    await window.API.logoutUser();
    currentUser = null;
    window.currentUser = null;
    window.Utils.showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 800);
  } catch (error) {
    window.Utils.showToast(error.message || 'Logout failed', 'error');
  }
}

window.Auth = {
  checkAuth,
  requireAuth,
  requireAdmin,
  logout,
  getUser: () => currentUser,
};
