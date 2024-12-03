import { useState, useCallback, useEffect } from "react";
import { LoginCredentials, User } from "../types";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../components/Auth/FireBase";

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
      isAuthenticated: Boolean(userData),
    };
  });

  useEffect(() => {
    if (authState.user) {
      localStorage.setItem("user", JSON.stringify(authState.user));
    } else {
      localStorage.removeItem("user");
    }
  }, [authState.user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = {
        email: credentials.email,
        password: credentials.password,
      };
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

  const loginWithGoogle = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Google User:", user);

      setAuthState({
        user: {
          email: user.email,
       
        },
        credentials: null,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error("Google Login Error:", error);
      setAuthState((prev) => ({
        ...prev,
        user: null,
        credentials: null,
        isLoading: false,
        isAuthenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during Google login",
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
    loginWithGoogle,
    logout,
  };
};

export default useAuth;
