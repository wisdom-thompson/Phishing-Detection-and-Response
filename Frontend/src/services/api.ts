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
      sessionStorage.setItem('authToken', token);
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


export const analyzeEmails = async (credentials: LoginCredentials, token?: string) => {
  try {
    const response = await api.post<{ emails: EmailAnalysis[] }>(
      "/emails/analyze",
      token ? { token } : credentials,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || "Failed to analyze emails";
      throw new Error(errorMessage);
    }
    throw error;
  }
};



export const getGoogleAuthUrl = async () => {
  const response = await api.get('/auth/google');
  return response.data.url;
};

export const handleGoogleCallback = async (code: string) => {
  const response = await api.post('/auth/callback', { code });
  return response.data;
};

export const scanNetwork = async () => {
    const response = await fetch(`${API_URL}/scan-network`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to scan network');
    }
    return response.json();
}

export const monitorNetworkTraffic = async (duration: number = 15) => {
    const response = await fetch(`${API_URL}/network-monitor?duration=${duration}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to monitor network traffic');
    }
    return response.json();
}
