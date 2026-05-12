import { auth } from "./auth.js";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = auth.token();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Envia fazenda selecionada para owner/super_admin
  const fazendaSelecionada = localStorage.getItem("fazenda_selecionada_id");
  if (fazendaSelecionada) headers["X-Fazenda-Id"] = fazendaSelecionada;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (res.status === 401) {
    auth.logout();
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  if (res.status === 403) {
    throw new Error("Acesso negado para este perfil de usuario.");
  }

  if (!res.ok || !json.success)
    throw new Error(json.message ?? "Erro na requisicao");
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
