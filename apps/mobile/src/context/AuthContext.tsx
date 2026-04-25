import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthContextType {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        setToken,
        setUser,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
