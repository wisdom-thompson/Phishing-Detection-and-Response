import { useEffect, useState, useRef, useCallback } from "react";
import { Box, Container, Grid, Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useAuth from "../hooks/useAuth";
import { analyzeEmails } from "../services/api";
import { Navbar } from "../components/Layout/Navbar";
import EmailDetails from "../components/Email/EmailDetails";
import { Footer } from "../components/Layout/Footer";
import { fetchGoogleEmails } from "../hooks/fetchGoogleEmails";
import { EmailAnalysis } from "../types";
import CircularWithValueLabel from "../components/Progress";
import Analytics from "../components/Dashboard/Analytics";
import EmailList from "../components/Email/EmailList";

interface EmailStats {
  date: string;
  total: number;
  phishing: number;
  safe: number;
}

const processEmailsForChart = (emails: EmailAnalysis[]): EmailStats[] => {
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

export default function Dashboard() {
  const { user } = useAuth();
  const [imapEmails, setImapEmails] = useState<EmailAnalysis[]>([]);
  const [googleEmails, setGoogleEmails] = useState<EmailAnalysis[]>([]);
  const [imapLoading, setImapLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [imapError, setImapError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(
    null
  );
  const loginType = sessionStorage.getItem("loginType");
  const emailIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const token = sessionStorage.getItem("gmailToken");

  function handleDelete() {
    if (googleEmails.length > 0 && selectedEmail) {
      sessionStorage.removeItem(selectedEmail.email_id);
      setSelectedEmail(null);
    }
  }

  // Helper function to update IMAP emails
  const updateImapEmails = useCallback((newEmails: EmailAnalysis[]) => {
    setImapEmails((prevEmails) => {
      const uniqueEmails = [...prevEmails];
      newEmails.forEach((newEmail) => {
        if (
          !uniqueEmails.some(
            (existing) => existing.email_id === newEmail.email_id
          )
        ) {
          uniqueEmails.push(newEmail);
        }
      });

      const sortedEmails = uniqueEmails.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      sessionStorage.setItem("imapEmails", JSON.stringify(sortedEmails));
      return sortedEmails;
    });
  }, []);

  // Helper function to update Google emails
  const updateGoogleEmails = useCallback((newEmails: EmailAnalysis[]) => {
    console.log("Processing new Google emails:", newEmails.length);

    setGoogleEmails((prevEmails) => {
      // Append new emails to existing ones
      const updatedEmails = [...prevEmails, ...newEmails];

      // Sort by timestamp (newest first)
      const sortedEmails = updatedEmails.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Update session storage
      try {
        sessionStorage.setItem("googleEmails", JSON.stringify(sortedEmails));
        console.log(
          "Updated session storage with",
          sortedEmails.length,
          "emails"
        );
      } catch (error) {
        console.error("Failed to update session storage:", error);
      }

      return sortedEmails;
    });
  }, []);

  // Fetch IMAP emails
  const fetchImapEmails = useCallback(async () => {
    if (!user || loginType !== "imap") return;

    setImapLoading(true);
    setImapError(null);

    try {
      const storedPassword = sessionStorage.getItem("userPassword");
      const response: any = await analyzeEmails({
        email: user.email,
        password: storedPassword || user.password,
        loginType: "imap",
      });
      if (response?.emails) {
        updateImapEmails(response.emails);
      }
    } catch (err: any) {
      console.error("Error fetching IMAP emails:", err);
      setImapError(err.message || "Failed to fetch IMAP emails.");
    } finally {
      setImapLoading(false);
    }
  }, [user, loginType]);

  // Fetch Google emails
  const fetchGoogleMailEmails = useCallback(async () => {
    if (!token || loginType !== "google") {
      console.log("Skipping Google fetch:", {
        hasToken: !!token,
        loginType,
        tokenValue: token?.substring(0, 10) + "...",
      });
      return;
    }
    setImapLoading(true);
    setImapError(null);

    console.log(
      "Starting Google email fetch with token:",
      token.substring(0, 10) + "..."
    );

    try {
      const fetchedEmails = await fetchGoogleEmails(token);
      console.log("Raw fetched emails:", fetchedEmails);

      if (Array.isArray(fetchedEmails) && fetchedEmails.length > 0) {
        console.log("Processing", fetchedEmails.length, "Google emails");

        // Ensure emails have required fields
        const validEmails = fetchedEmails.filter(
          (email) => email && email.email_id && email.timestamp
        );

        if (validEmails.length !== fetchedEmails.length) {
          console.warn(
            "Some emails were invalid:",
            fetchedEmails.length - validEmails.length,
            "emails filtered out"
          );
        }

        if (validEmails.length > 0) {
          console.log("Updating with", validEmails.length, "valid emails");
          updateGoogleEmails(validEmails);
          return validEmails;
        }
      } else {
        console.log("No valid emails received from API");
      }

      return [];
    } catch (err: any) {
      console.error("Error in fetchGoogleMailEmails:", err);
      setGoogleError(err.message || "Failed to fetch Google emails.");
      throw err;
    }
  }, [user, token, loginType, updateGoogleEmails]);

  // Initialize emails from session storage
  useEffect(() => {
    if (loginType === "imap") {
      const cachedEmails = sessionStorage.getItem("imapEmails");
      if (cachedEmails) {
        setImapEmails(JSON.parse(cachedEmails));
      }
    } else if (loginType === "google") {
      const cachedEmails = sessionStorage.getItem("googleEmails");
      if (cachedEmails) {
        setGoogleEmails(JSON.parse(cachedEmails));
      }
    }
  }, [loginType]);

  // Set up IMAP email fetching interval
  useEffect(() => {
    if (!user || loginType !== "imap") return;

    console.log("Setting up IMAP interval...");
    fetchImapEmails();
    const intervalId = setInterval(fetchImapEmails, 30000);
    emailIntervalRef.current = intervalId;

    return () => {
      console.log("Cleaning up IMAP interval...");
      clearInterval(intervalId);
    };
  }, [user, loginType, fetchImapEmails]);

  // Set up Google email fetching interval
  useEffect(() => {
    let isMounted = true;

    const fetchGoogleEmails = async () => {
      if (!isMounted) return;

      try {
        setGoogleLoading(true);
        setGoogleError(null);
        const emails = await fetchGoogleMailEmails();

        if (!isMounted) return;

        if (emails && emails.length > 0) {
          console.log("Successfully fetched", emails.length, "new emails");
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch Google emails:", error);
        setGoogleError(
          error instanceof Error ? error.message : "Failed to fetch emails"
        );
      } finally {
        if (isMounted) {
          setGoogleLoading(false);
        }
      }
    };

    const requirements = {
      token: !!token,
      isGoogleLogin: loginType === "google",
    };

    if (!requirements.token || !requirements.isGoogleLogin) {
      console.log("Google email fetch requirements not met:", requirements);
      return;
    }

    console.log("Setting up Google email fetch interval");
    fetchGoogleEmails(); // Initial fetch

    const intervalId = setInterval(fetchGoogleEmails, 60000);
    emailIntervalRef.current = intervalId;

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        emailIntervalRef.current = null;
      }
      console.log("Cleaned up Google email interval");
    };
  }, [user, token, loginType, fetchGoogleMailEmails]);

  // Update email stats whenever emails change
  useEffect(() => {
    const allEmails = loginType === "imap" ? imapEmails : googleEmails;
    setEmailStats(processEmailsForChart(allEmails));
  }, [imapEmails, googleEmails, loginType]);

  const handleDeleteEmail = (emailId: string) => {
    if (loginType === "imap") {
      setImapEmails((prevEmails) =>
        prevEmails.filter((email) => email.email_id !== emailId)
      );
    } else if (loginType === "google") {
      setGoogleEmails((prevEmails) =>
        prevEmails.filter((email) => email.email_id !== emailId)
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f9f7f3",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: 4,
                bgcolor: "rgba(255, 255, 255, 0.85)",
                "&:hover": { boxShadow: 8 },
              }}
            >
              <Analytics
                emails={loginType === "imap" ? imapEmails : googleEmails}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 4,
                borderRadius: 3,
                boxShadow: 4,
                bgcolor: "#f4f3ee",
                "&:hover": { boxShadow: 8 },
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", color: "#333" }}
              >
                Email Trends
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={emailStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="total"
                    fill="#2196f3"
                    name="Total Emails"
                    barSize={30}
                  />
                  <Bar
                    dataKey="phishing"
                    fill="#f44336"
                    name="Phishing Emails"
                    barSize={30}
                  />
                  <Bar
                    dataKey="safe"
                    fill="#4caf50"
                    name="Safe Emails"
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          {loginType === "imap" && (
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: 4,
                  bgcolor: "rgba(255, 255, 255, 0.85)",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: "bold", color: "#333" }}
                >
                  Emails
                </Typography>
                <Box sx={{ overflowY: "auto" }}>
                  {imapLoading ? (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <CircularWithValueLabel />
                    </Box>
                  ) : imapError ? (
                    <Typography color="error" textAlign="center">
                      {imapError}
                    </Typography>
                  ) : imapEmails.length > 0 ? (
                    <EmailList
                      emails={imapEmails}
                      onSelectEmail={setSelectedEmail}
                      selectedEmail={selectedEmail}
                      onDeleteEmail={handleDeleteEmail}
                    />
                  ) : (
                    <Typography textAlign="center" color="text.secondary">
                      No emails found.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}
          {loginType === "google" && (
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: 4,
                  bgcolor: "rgba(255, 255, 255, 0.85)",
                  "&:hover": { boxShadow: 8 },
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: "bold", color: "#333" }}
                >
                  Gmail Emails
                </Typography>
                <Box sx={{ overflowY: "auto" }}>
                  {googleLoading ? (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <CircularWithValueLabel />
                    </Box>
                  ) : googleError ? (
                    <Typography color="error" textAlign="center">
                      {googleError}
                    </Typography>
                  ) : googleEmails.length > 0 ? (
                    <EmailList
                      emails={googleEmails}
                      onSelectEmail={setSelectedEmail}
                      selectedEmail={selectedEmail}
                      onDeleteEmail={handleDeleteEmail}
                    />
                  ) : (
                    <Typography textAlign="center" color="text.secondary">
                      No emails found.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: 4,
                bgcolor: "rgba(255, 255, 255, 0.85)",
                "&:hover": { boxShadow: 8 },
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", color: "#333" }}
              >
                Email Details
              </Typography>
              {selectedEmail ? (
                <EmailDetails
                  email={selectedEmail}
                  onClose={() => setSelectedEmail(null)}
                  onDelete={handleDelete}
                />
              ) : (
                <Typography>Select an email to view details.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
}
