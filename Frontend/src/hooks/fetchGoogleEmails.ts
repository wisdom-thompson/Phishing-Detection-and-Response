import { EmailAnalysis } from "../types";

export const fetchGoogleEmails = async (token: string): Promise<EmailAnalysis[]> => {
  try {
    const response = await fetch(`http://localhost:5000/emails/fetch?token=${token}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google emails');
    }
    const data = await response.json();
    return data.emails || [];
  } catch (error) {
    console.error('Error fetching Google emails:', error);
    return [];
  }
};
