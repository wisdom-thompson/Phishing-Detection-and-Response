import axios from "axios";
import { LoginCredentials, EmailAnalysis } from "../types";

const API_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const login = async (credentials: LoginCredentials | { email: string }) => {
  try {
    const response = await api.post("/auth/login", credentials);
    // Store auth token if provided
    const token = response.data.token;
    if (token) {
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || "Login failed";
      throw new Error(errorMessage);
    }
    throw error;
  }
};

export const analyzeEmails = async (credentials: LoginCredentials | { email: string }) => {
  const response = await api.post<{ emails: EmailAnalysis[] }>(
    "/emails/analyze",
    credentials
  );
  return response.data;
};
