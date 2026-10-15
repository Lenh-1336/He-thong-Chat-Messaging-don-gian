const API_BASE = import.meta.env.VITE_API_URL || '/api';

function errorMessage(data, status) {
  const candidate = data?.error ?? data?.message;
  if (typeof candidate === 'string' && candidate.trim()) return candidate;
  if (candidate && typeof candidate === 'object') {
    for (const key of ['message', 'detail', 'reason']) {
      if (typeof candidate[key] === 'string' && candidate[key].trim()) return candidate[key];
    }
    if (Array.isArray(candidate.errors)) {
      const messages = candidate.errors.map(item => typeof item === 'string' ? item : item?.message).filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
  }
  return `Yêu cầu thất bại (${status}).`;
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('alenh-agent-token') || sessionStorage.getItem('alenh-agent-token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('alenh-agent-token');
    sessionStorage.removeItem('alenh-agent-token');
    window.dispatchEvent(new CustomEvent('alenh:unauthorized'));
  }
  if (!response.ok) throw new Error(errorMessage(data, response.status));
  return data;
}
