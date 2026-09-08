/**
 * Campus Marketplace - Centralized Frontend API Service
 * Encapsulates all Fetch API requests, cookie credentials, and error normalization.
 */

const API_BASE_URL = '/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Include credentials so HTTP-only auth cookies are sent with requests
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    const result = await response.json().catch(() => ({
      success: false,
      message: `HTTP Error ${response.status}: ${response.statusText}`,
    }));

    if (!response.ok) {
      throw new Error(result.message || 'An unexpected error occurred');
    }

    return result;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// ---------------- AUTH APIS ----------------
async function registerUser(userData) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

async function loginUser(credentials) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

async function logoutUser() {
  return apiRequest('/auth/logout', {
    method: 'POST',
  });
}

async function getCurrentUser() {
  return apiRequest('/auth/me', {
    method: 'GET',
  });
}

// ---------------- USER PROFILE & ADMIN USERS ----------------
async function getProfile() {
  return apiRequest('/users/profile', {
    method: 'GET',
  });
}

async function updateProfile(formData) {
  return apiRequest('/users/profile', {
    method: 'PUT',
    body: formData,
  });
}

async function getUsers(params = {}) {
  const query = buildQueryString(params);
  return apiRequest(`/users${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async function getUser(id) {
  return apiRequest(`/users/${id}`, {
    method: 'GET',
  });
}

async function deleteUser(id) {
  return apiRequest(`/users/${id}`, {
    method: 'DELETE',
  });
}

// ---------------- CATEGORY APIS ----------------
async function getCategories() {
  return apiRequest('/categories', {
    method: 'GET',
  });
}

async function createCategory(data) {
  return apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateCategory(id, data) {
  return apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async function deleteCategory(id) {
  return apiRequest(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ---------------- PRODUCT APIS ----------------
// Helper to build clean query string
function buildQueryString(params = {}) {
  const clean = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      clean[key] = params[key];
    }
  });
  return new URLSearchParams(clean).toString();
}

async function getProducts(params = {}) {
  const query = buildQueryString(params);
  return apiRequest(`/products${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async function getProduct(id) {
  return apiRequest(`/products/${id}`, {
    method: 'GET',
  });
}

async function createProduct(formData) {
  return apiRequest('/products', {
    method: 'POST',
    body: formData,
  });
}

async function updateProduct(id, formData) {
  return apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

async function deleteProduct(id) {
  return apiRequest(`/products/${id}`, {
    method: 'DELETE',
  });
}

async function getMyListings() {
  return apiRequest('/products/my-listings', {
    method: 'GET',
  });
}

async function markProductSold(id) {
  return apiRequest(`/products/${id}/sold`, {
    method: 'PATCH',
  });
}

// ---------------- MESSAGING APIS ----------------
async function getConversations() {
  return apiRequest('/messages/conversations', {
    method: 'GET',
  });
}

async function startConversation(productId) {
  return apiRequest('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

async function getConversation(id) {
  return apiRequest(`/messages/conversations/${id}`, {
    method: 'GET',
  });
}

async function sendMessage(conversationId, text) {
  return apiRequest(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

async function markMessageRead(messageId) {
  return apiRequest(`/messages/${messageId}/read`, {
    method: 'PATCH',
  });
}

// ---------------- REPORT APIS ----------------
async function createReport(reportData) {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
}

async function getReports(params = {}) {
  const query = buildQueryString(params);
  return apiRequest(`/reports${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async function updateReportStatus(id, status, removeProduct = false) {
  return apiRequest(`/reports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, removeProduct }),
  });
}

// ---------------- CLAUDE AI APIS ----------------
async function generateDescription(data) {
  return apiRequest('/ai/generate-description', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function improveDescription(data) {
  return apiRequest('/ai/improve-description', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function suggestCategory(data) {
  return apiRequest('/ai/suggest-category', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function getListingAssistant(data) {
  return apiRequest('/ai/listing-assistant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function getMessageSuggestions(data) {
  return apiRequest('/ai/message-suggestions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function classifyReport(data) {
  return apiRequest('/ai/classify-report', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Attach globally for vanilla JS modules
window.API = {
  apiRequest,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getProfile,
  updateProfile,
  getUsers,
  getUser,
  deleteUser,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyListings,
  markProductSold,
  getConversations,
  startConversation,
  getConversation,
  sendMessage,
  markMessageRead,
  createReport,
  getReports,
  updateReportStatus,
  generateDescription,
  improveDescription,
  suggestCategory,
  getListingAssistant,
  getMessageSuggestions,
  classifyReport,
};
