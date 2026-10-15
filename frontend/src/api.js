const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload.data ?? payload;
}
export const api = {
  books: (q = "") => request(`/books${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  addBook: (body) => request('/books', { method:'POST', body:JSON.stringify(body) }),
  updateBook: (id, body) => request(`/books/${id}`, { method:'PUT', body:JSON.stringify(body) }),
  deleteBook: (id) => request(`/books/${id}`, { method:'DELETE' }),
  members: (q = "") => request(`/members${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  addMember: (body) => request('/members', { method:'POST', body:JSON.stringify(body) }),
  updateMember: (id, body) => request(`/members/${id}`, { method:'PUT', body:JSON.stringify(body) }),
  deleteMember: (id) => request(`/members/${id}`, { method:'DELETE' }),
  transactions: () => request('/transactions'),
  issue: (body) => request('/transactions/issue', { method:'POST', body:JSON.stringify(body) }),
  returnBook: (id) => request(`/transactions/${id}/return`, { method:'PATCH' })
};
