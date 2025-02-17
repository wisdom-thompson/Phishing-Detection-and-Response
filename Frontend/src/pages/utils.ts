import { EmailAnalysis } from "../types";

export interface EmailStats {
  date: string;
  total: number;
  phishing: number;
  safe: number;
}

export const processEmailsForChart = (
  emails: EmailAnalysis[]
): EmailStats[] => {
  const emailsByDate = emails.reduce(
    (acc: { [key: string]: EmailStats }, email) => {
      const date = new Date(email.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, total: 0, phishing: 0, safe: 0 };
      }
      acc[date].total += 1;
      email.is_phishing ? (acc[date].phishing += 1) : (acc[date].safe += 1);
      return acc;
    },
    {}
  );

  return Object.values(emailsByDate).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const updateEmails = (
  emails: EmailAnalysis[],
  newEmails: EmailAnalysis[],
  type: "imap" | "google"
): EmailAnalysis[] => {
  const updatedEmails = [...emails, ...newEmails];
  const sortedEmails = updatedEmails.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  try {
    sessionStorage.setItem(`${type}Emails`, JSON.stringify(sortedEmails));
  } catch (error) {
    console.error(`Failed to update session storage for ${type}:`, error);
  }
  return sortedEmails;
};
