const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, API_BASE_URL), init);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
