import { api } from "@/lib/api";

export const authApi = {
  me: () => api.get<{ authenticated: boolean }>("/auth/me"),
  login: (username: string, password: string) =>
    api.post<void>("/auth/login", { username, password }),
  logout: () => api.post<void>("/auth/logout"),
};
