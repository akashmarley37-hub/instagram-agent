import axios from 'axios';

const rawEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') || '';
const RAW_BASE = rawEnv
  ? (rawEnv.startsWith('http://') || rawEnv.startsWith('https://') ? rawEnv : `https://${rawEnv}`)
  : '';
const API_BASE = RAW_BASE ? `${RAW_BASE}/api` : '/api';

export const getMediaUrl = (filenameOrUrl: string): string => {
  if (!filenameOrUrl) return '';
  if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
    return filenameOrUrl;
  }
  const cleanPath = filenameOrUrl.startsWith('/api/')
    ? filenameOrUrl
    : `/api/media/file/${filenameOrUrl.replace(/^\//, '')}`;
  return RAW_BASE ? `${RAW_BASE}${cleanPath}` : cleanPath;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

function normalizeMediaUrls(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(normalizeMediaUrls);
  }
  const result: any = { ...data };
  if (typeof result.url === 'string' && result.url.startsWith('/api/media/file/')) {
    result.url = getMediaUrl(result.url);
  }
  for (const key of Object.keys(result)) {
    if (result[key] && typeof result[key] === 'object') {
      result[key] = normalizeMediaUrls(result[key]);
    }
  }
  return result;
}

// Response interceptor — normalize error messages & media URLs
api.interceptors.response.use(
  (response) => {
    if (RAW_BASE && response.data) {
      response.data = normalizeMediaUrls(response.data);
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;

// ---- AI ----
export const aiAPI = {
  generate: (data: object) => api.post('/ai/generate', data),
  regenerate: (data: object) => api.post('/ai/regenerate', data),
};

// ---- Media ----
export const mediaAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (page = 1, perPage = 20, fileType?: string) =>
    api.get('/media', { params: { page, per_page: perPage, file_type: fileType } }),
  delete: (id: string) => api.delete(`/media/${id}`),
  getUrl: (filename: string) => getMediaUrl(filename),
};

// ---- Posts ----
export const postsAPI = {
  create: (data: object) => api.post('/posts', data),
  list: (page = 1, perPage = 10, status?: string) =>
    api.get('/posts', { params: { page, per_page: perPage, status } }),
  get: (id: string) => api.get(`/posts/${id}`),
  update: (id: string, data: object) => api.put(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  publish: (id: string) => api.post(`/posts/${id}/publish`),
  schedule: (id: string, scheduledAt: string, timezone: string) =>
    api.post(`/posts/${id}/schedule`, { scheduled_at: scheduledAt, timezone }),
  retry: (id: string) => api.post(`/posts/${id}/retry`),
};

// ---- Instagram ----
export const instagramAPI = {
  status: () => api.get('/instagram/status'),
  test: () => api.post('/instagram/test'),
};

// ---- Activity ----
export const activityAPI = {
  list: (limit = 50, postId?: string) =>
    api.get('/activity', { params: { limit, post_id: postId } }),
};

// ---- Integrations ----
export const integrationsAPI = {
  list: () => api.get('/integrations'),
  test: (service: string) => api.post(`/integrations/${service}/test`),
};

// ---- Google Drive ----
export const driveAPI = {
  status: () => api.get('/google-drive/status'),
  listMedia: (query?: string) => api.get('/google-drive/media', { params: { query } }),
  getAuthUrl: () => api.get('/google-drive/auth-url'),
  importFile: (fileId: string, filename: string, mimeType: string) =>
    api.post('/google-drive/import', null, {
      params: { file_id: fileId, filename, mime_type: mimeType }
    }),
};

// ---- Config ----
export const configAPI = {
  get: () => api.get('/config'),
  health: () => api.get('/health'),
};
