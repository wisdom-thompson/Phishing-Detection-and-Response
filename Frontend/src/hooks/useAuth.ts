import { useState, useCallback } from "react";
import { LoginCredentials, User } from "../types";
import { User as FirebaseUser } from "firebase/auth";

interface AuthState {
  user: User | null;
  credentials: LoginCredentials | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const storedUser = localStorage.getItem("user");
    const userData = storedUser ? JSON.parse(storedUser) : null;
    return {
      user: userData,
      credentials: userData
        ? { email: userData.email, password: userData.password }
        : null,
      isLoading: false,
      error: null,
      isAuthenticated: Boolean(localStorage.getItem("user")),
    };
  });

  const login = useCallback(async (credentials: LoginCredentials | { email: string; idToken: string }) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = 'email' in credentials ? {
        email: credentials.email,
        password: credentials.password,
      } : {
        email: credentials.email,
        password: '', // For Google login
      };
      localStorage.setItem("user", JSON.stringify(user));

      setAuthState({
        user,
        credentials: user,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        user: null,
        credentials: null,
        isLoading: false,
        isAuthenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during login",
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("user");

    setAuthState({
      user: null,
      credentials: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...authState,
    login,
    logout,
  };
};

export default useAuth;
