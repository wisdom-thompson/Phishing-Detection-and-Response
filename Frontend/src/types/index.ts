export interface User {
  email: string;
  profilePic?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  loginType: "google" | "imap";
}

export interface EmailAnalysis {
  email_id: string;
  subject: string;
  sender: string;
  is_phishing: boolean;
}
