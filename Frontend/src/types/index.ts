export interface User {
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface EmailAnalysis {
  email_id: string;
  subject: string;
  sender: string;
  is_phishing: boolean;
}
