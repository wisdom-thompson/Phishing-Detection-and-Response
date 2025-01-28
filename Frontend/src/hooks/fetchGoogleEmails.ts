import { EmailAnalysis } from "../types";

export const fetchGoogleEmails = async (
  token: string | null
): Promise<EmailAnalysis[]> => {
  if (!token) {
    throw new Error("Token is required to fetch Google emails");
  }

  try {
    console.log("Fetching Google emails with token:", token);

    const response = await fetch(
      `http://localhost:5000/emails/fetch?token=${token}`
    );

    // Check if the response code
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch Google emails");
    }

    // Parse the response data
    const data = await response.json();
    console.log("Raw response from backend:", data);

    // Handle different response formats
    let emails = [];
    if (data.emails && Array.isArray(data.emails)) {
      emails = data.emails;
    } else if (Array.isArray(data)) {
      emails = data;
    } else {
      console.warn("Unexpected response format:", data);
      return [];
    }
    return emails;
  } catch (error: any) {
    console.error("Error fetching Google emails:", error.message);
    throw error;
  }
};
