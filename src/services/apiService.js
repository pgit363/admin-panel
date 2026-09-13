const ADMIN_API = import.meta.env.VITE_ADMIN_API_BASE || '/admin/v2';
const PUBLIC_API = import.meta.env.VITE_PUBLIC_API_BASE || '/api/v2';

export const publicApiService = async (endpoint) => {
  const response = await fetch(`${PUBLIC_API}/${endpoint}`);
  const data = await response.json();
  return data;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('token');
    // Notify App so the route guards re-evaluate against the now-missing token,
    // otherwise the stale `isAuthenticated` bounces /login back to /dashboard.
    window.dispatchEvent(new Event('auth-change'));
    if (!window.location.hash.startsWith('#/login')) {
      window.location.hash = '#/login';
    }
    throw new Error('Session expired. Please log in again.');
  }
  if (response.status === 403) {
    // Middleware-level rejection: /admin/v2/* now requires the admin role.
    // Real HTTP 403, no `success` key — comes from middleware, not BaseController.
    throw new Error('Access Forbidden — your account does not have the admin role required for this action.');
  }
  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.message || 'Too many requests. Please slow down and try again later.');
  }
  const data = await response.json();
  if (!response.ok) {
    if (data.message && typeof data.message === 'object') {
      throw new Error(Object.values(data.message).flat().join('\n'));
    } else if (typeof data.message === 'string') {
      throw new Error(data.message);
    } else {
      throw new Error('Network response was not ok');
    }
  }
  return data;
};

const apiService = async (method, endpoint, body = null) => {
  const token = localStorage.getItem('token');

  const config = {
    method: method.toUpperCase(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-App-Source': 'admin',
    },
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
    if (body instanceof FormData) {
      delete config.headers['Content-Type'];
    }
  }

  const response = await fetch(`${ADMIN_API}/${endpoint}`, config);
  return handleResponse(response);
};

export default apiService;
