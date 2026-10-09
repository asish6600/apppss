import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { apiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const checkEmail = async (email) => (await api.post("/auth/check", { email })).data;
  const requestOtp = async (email) => (await api.post("/auth/otp/request", { email })).data;
  const verifyOtp = async (email, code, name) => {
    const { data } = await api.post("/auth/otp/verify", { email, code, name });
    setUser(data.user);
    return data.user;
  };
  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };
  const forgot = async (email) => (await api.post("/auth/password/forgot", { email })).data;
  const reset = async (payload) => (await api.post("/auth/password/reset", payload)).data;

  return (
    <AuthContext.Provider value={{ user, ready, isAuthed: !!user, refresh, checkEmail, requestOtp, verifyOtp, login, logout, forgot, reset, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { apiError };
