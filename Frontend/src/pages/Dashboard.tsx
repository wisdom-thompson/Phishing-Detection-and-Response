import { useEffect, useState, useCallback } from "react";
import { Box, Button, Container, Grid, Paper, Typography } from "@mui/material";
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
import { EmailStats, processEmailsForChart, updateEmails } from "./utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [imapEmails, setImapEmails] = useState<EmailAnalysis[]>([]);
  const [googleEmails, setGoogleEmails] = useState<EmailAnalysis[]>([]);
  const [_imapLoading, setImapLoading] = useState(false);
  const [_googleLoading, setGoogleLoading] = useState(false);
  const [imapError, setImapError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const loginType = sessionStorage.getItem("loginType");
  const token = sessionStorage.getItem("gmailToken");

  const handleDelete = () => {
    if (googleEmails.length > 0 && selectedEmail) {
      sessionStorage.removeItem(selectedEmail.email_id);
      setSelectedEmail(null);
    }
  };

  // Helper function to fetch IMAP emails
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
        setImapEmails((prevEmails) =>
          updateEmails(prevEmails, response.emails, "imap")
        );
      }
    } catch (err: any) {
      console.error("Error fetching IMAP emails:", err);
      setImapError(err.message || "Failed to fetch IMAP emails.");
    } finally {
      setImapLoading(false);
    }
  }, [user, loginType]);

  // Helper function to fetch Google emails
  const fetchGoogleMailEmails = useCallback(async () => {
    if (!token || loginType !== "google") return;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const fetchedEmails = await fetchGoogleEmails(token);
      if (Array.isArray(fetchedEmails) && fetchedEmails.length > 0) {
        setGoogleEmails((prevEmails) =>
          updateEmails(prevEmails, fetchedEmails, "google")
        );
      }
    } catch (err: any) {
      console.error("Error in fetchGoogleMailEmails:", err);
      setGoogleError(err.message || "Failed to fetch Google emails.");
    } finally {
      setGoogleLoading(false);
    }
  }, [token, loginType]);

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

  useEffect(() => {
    const emails = loginType === "imap" ? imapEmails : googleEmails;
    const emailStats = processEmailsForChart(emails);
    setEmailStats(emailStats);
  }, [imapEmails, googleEmails, loginType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (loginType === "imap") {
      await fetchImapEmails();
    } else if (loginType === "google") {
      await fetchGoogleMailEmails();
    }
    setRefreshing(false);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f9f7f3",
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Navbar />
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={4}>
          {/* Analytics Section */}
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

          {/* Email Trends Chart */}
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

          {/* Email List Section for IMAP */}
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
                {/* Header with title and refresh button */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#333" }}
                  >
                    Emails
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </Box>
                {/* Email List Container */}
                <Box
                  sx={{ position: "relative", height: 400, overflowY: "auto" }}
                >
                  {imapEmails.length > 0 ? (
                    <EmailList
                      emails={imapEmails}
                      onSelectEmail={setSelectedEmail}
                      selectedEmail={selectedEmail}
                      onDeleteEmail={handleDelete}
                    />
                  ) : (
                    <Typography textAlign="center" color="text.secondary">
                      No emails found.
                    </Typography>
                  )}
                  {/* Ghost overlay spinner when refreshing */}
                  {refreshing && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: "rgba(255,255,255,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                      }}
                    >
                      <CircularWithValueLabel />
                    </Box>
                  )}
                  {imapError && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 11,
                      }}
                    >
                      <Typography color="error">{imapError}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Email List Section for Google */}
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
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#333" }}
                  >
                    Gmail Emails
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </Box>
                <Box
                  sx={{ position: "relative", height: 400, overflowY: "auto" }}
                >
                  {googleEmails.length > 0 ? (
                    <EmailList
                      emails={googleEmails}
                      onSelectEmail={setSelectedEmail}
                      selectedEmail={selectedEmail}
                      onDeleteEmail={handleDelete}
                    />
                  ) : (
                    <Typography textAlign="center" color="text.secondary">
                      No emails found.
                    </Typography>
                  )}
                  {refreshing && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: "rgba(255,255,255,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                      }}
                    >
                      <CircularWithValueLabel />
                    </Box>
                  )}
                  {googleError && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 11,
                      }}
                    >
                      <Typography color="error">{googleError}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Email Details Section */}
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
              <Box sx={{ height: 400, overflowY: "auto" }}>
                {selectedEmail ? (
                  <EmailDetails
                    email={selectedEmail}
                    onClose={() => setSelectedEmail(null)}
                    onDelete={handleDelete}
                  />
                ) : (
                  <Typography>Select an email to view details.</Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
}
