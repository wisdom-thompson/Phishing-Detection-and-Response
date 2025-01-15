import { useState, useCallback, useEffect } from "react";
import { LoginCredentials } from "../types";

interface AuthState {
  user: LoginCredentials | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  loginType: "google" | "imap" | null; // Ensure loginType is always defined
}
const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const storedUser = sessionStorage.getItem("user");
    const userData: LoginCredentials | null = storedUser ? JSON.parse(storedUser) : null;

    return {
      user: userData,
      isLoading: false,
      error: null,
      isAuthenticated: Boolean(userData),
      loginType: userData?.loginType || "imap", // Default to "imap" if missing
    };
  });

  useEffect(() => {
    if (authState.user) {
      sessionStorage.setItem("user", JSON.stringify(authState.user));
    } else {
      sessionStorage.removeItem("user");
    }
  }, [authState.user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Determine login type based on the presence of a Gmail token
      const loginType: "google" | "imap" = sessionStorage.getItem('gmailToken') ? 'google' : 'imap';

      const user: LoginCredentials = {
        email: credentials.email,
        password: credentials.password,
        loginType: loginType, // Ensure this is correctly typed
      };

      setAuthState({
        user,
        isLoading: false,
        error: null,
        isAuthenticated: true,
        loginType: loginType,
      });

      return true;
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        user: null,
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
    sessionStorage.clear();
    setAuthState({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      loginType: "imap", // Reset to default
    });
  }, []);

  return {
    ...authState,
    login,
    logout,
  };
};

export default useAuth;

