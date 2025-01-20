import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  LineChart,
  Line,
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
import { EmailList } from "../components/Email/EmailList";
import EmailDetails from "../components/Email/EmailDetails";
import { Analytics } from "../components/Dashboard/Analytics";
import { Footer } from "../components/Layout/Footer";
import { fetchGoogleEmails } from "../hooks/fetchGoogleEmails";
import { EmailAnalysis } from "../types";

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
      if (email.is_phishing) {
        acc[date].phishing += 1;
      } else {
        acc[date].safe += 1;
      }
      return acc;
    },
    {}
  );

  return Object.values(emailsByDate).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(null);

  const [loginType] = useState<string | null>(
    sessionStorage.getItem("loginType")
  );

  const emailIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchIMAPEmails = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const storedPassword = sessionStorage.getItem('userPassword');
      const response: any = await analyzeEmails({
        email: user.email,
        password: storedPassword || user.password,
        loginType: "imap",
      });
      
      if (response?.emails) {
        const uniqueEmails = response.emails.filter((newEmail: EmailAnalysis) => 
          !emails.some(existingEmail => existingEmail.email_id === newEmail.email_id)
        );
        if (uniqueEmails.length > 0) {
          setEmails(prevEmails => [...prevEmails, ...uniqueEmails]);
        }
      }
    } catch (err) {
      console.error("Error fetching IMAP emails:", err);
      setError("Failed to fetch emails. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, emails]);

  const fetchGoogleEmailsHandler = useCallback(async () => {
    if (!user) return;

    const token = sessionStorage.getItem("gmailToken");
    if (!token) {
      console.error("Gmail token missing");
      setError("Authentication token is missing. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedGoogleEmails = await fetchGoogleEmails(token);
      if (fetchedGoogleEmails && fetchedGoogleEmails.length > 0) {
        const uniqueEmails = fetchedGoogleEmails.filter(newEmail => 
          !emails.some(existingEmail => existingEmail.email_id === newEmail.email_id)
        );
        if (uniqueEmails.length > 0) {
          setEmails(prevEmails => [...prevEmails, ...uniqueEmails]);
        }
      }
    } catch (err) {
      console.error("Error fetching Google emails:", err);
      setError("Failed to fetch Google emails. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, emails]);

  const setupEmailFetchingInterval = useCallback(() => {
    if (emailIntervalRef.current) {
      clearInterval(emailIntervalRef.current);
    }

    emailIntervalRef.current = setInterval(() => {
      if (loginType === "imap") {
        fetchIMAPEmails();
      } else if (loginType === "google") {
        fetchGoogleEmailsHandler();
      }
    }, 60000);
  }, [fetchIMAPEmails, fetchGoogleEmailsHandler, loginType]);

  useEffect(() => {
    const initializeFetching = async () => {
      const currentLoginType = sessionStorage.getItem('loginType');
      
      if (currentLoginType === "imap") {
        await fetchIMAPEmails();
      } else if (currentLoginType === "google") {
        await fetchGoogleEmailsHandler();
      }
      setupEmailFetchingInterval();
    };

    if (user) {
      initializeFetching();
    }

    return () => {
      if (emailIntervalRef.current) {
        clearInterval(emailIntervalRef.current);
      }
    };
  }, [fetchIMAPEmails, fetchGoogleEmailsHandler, setupEmailFetchingInterval, user]);

  useEffect(() => {
    const stats = processEmailsForChart(emails);
    setEmailStats(stats);
  }, [emails]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 3 }}>
              <Analytics emails={emails} />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", color: "#1976d2" }}
              >
                Email Trends
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={emailStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    name="Total Emails"
                  />
                  <Line
                    type="monotone"
                    dataKey="phishing"
                    stroke="#ff0000"
                    name="Phishing Emails"
                  />
                  <Line
                    type="monotone"
                    dataKey="safe"
                    stroke="#013220"
                    name="Safe Emails"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                boxShadow: 3,
                height: "auto",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", color: "#1976d2" }}
              >
                Emails
              </Typography>
              <Box sx={{ overflow: "auto" }}>
                {loading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="100%"
                  >
                    <CircularProgress />
                  </Box>
                ) : emails.length ? (
                  <EmailList
                    emails={emails}
                    onSelectEmail={setSelectedEmail}
                    selectedEmail={selectedEmail}
                  />
                ) : (
                  <Typography>No emails found.</Typography>
                )}
                {error && <Typography color="error">{error}</Typography>}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                boxShadow: 3,
                height: "auto",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", color: "#1976d2" }}
              >
                Email Details
              </Typography>
              {selectedEmail ? (
                <EmailDetails email={selectedEmail} onClose={() => setSelectedEmail(null)} />
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
};

export default Dashboard;
