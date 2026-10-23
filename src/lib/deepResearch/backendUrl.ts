const STORAGE_KEY = 'backend_api_url';
const DEFAULT_URL = 'http://127.0.0.1:3000';

export function getBackendUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim().replace(/\/+$/, '');
    }
  } catch {
    return DEFAULT_URL;
  }
  return DEFAULT_URL;
}

export function deepResearchUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getBackendUrl()}/api/deep-research${suffix}`;
}
