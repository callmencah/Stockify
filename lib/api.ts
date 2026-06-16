export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Terjadi kesalahan" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  post: <T>(url: string, data: unknown) =>
    apiRequest<T>(url, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    apiRequest<T>(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(url: string, data: unknown) =>
    apiRequest<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: "DELETE" }),
};
