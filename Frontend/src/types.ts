export interface LoginCredentials {
  email: string;
  password: string;
}

export interface EmailAnalysis {
  email_id: string;
  subject: string;
  sender: string;
  is_phishing: boolean;
  timestamp: string;
  body: string;
}

export interface User {
  email: string;
}