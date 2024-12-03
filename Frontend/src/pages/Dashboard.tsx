import React, { useEffect, useState } from "react";
import { EmailAnalysis } from "../types";
import { Box, Container, Grid, Paper, Typography } from "@mui/material";
import useAuth from "../hooks/useAuth";
import { analyzeEmails } from "../services/api";
import { Navbar } from "../components/Layout/Navbar";
import { EmailList } from "../components/Email/EmailList";
import { EmailDetails } from "../components/Email/EmailDetails";
import { Analytics } from "../components/Dashboard/Analytics";
import { Footer } from "../components/Layout/Footer";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const [emails, setEmails] = useState<EmailAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, credentials, isAuthenticated } = useAuth();
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailAnalysis | null>(
    null
  );

  // Load emails from localStorage on component mount
  useEffect(() => {
    const storedEmails = localStorage.getItem("emails");
    if (storedEmails) {
      setEmails(JSON.parse(storedEmails));
    }
  }, []);

  const fetchEmails = async () => {
    try {
      if (!credentials) {
        throw new Error("No credentials available");
      }

      // Check if the user is authenticated before proceeding
      if (!isAuthenticated) {
        console.log(isAuthenticated);
        throw new Error("User is not authenticated");
      }

      setLoading(true);
      const response = await analyzeEmails(credentials);

      // Merge new emails with existing ones, avoiding duplicates
      setEmails((prevEmails) => {
        const newEmails = response.emails || [];
        const existingIds = new Set(prevEmails.map((email) => email.email_id));
        const uniqueNewEmails = newEmails.filter(
          (email: EmailAnalysis) => !existingIds.has(email.email_id)
        );
        const updatedEmails = [...prevEmails, ...uniqueNewEmails];

        // Store updated emails in localStorage
        localStorage.setItem("emails", JSON.stringify(updatedEmails));
        return updatedEmails;
      });

      setError(null);
      setLastFetchTime(Date.now()); // Update last fetch time
    } catch (err) {
      setError("Failed to fetch emails. Please try again.");
      console.error("Error fetching emails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | number;

    const checkAuth = async () => {
      if (user && credentials) {
        const now = Date.now();
        // set fetch interval to 1minute
        if (!lastFetchTime || now - lastFetchTime > 60000) {
          await fetchEmails();
        }
      }
    };

    // Initial fetch
    checkAuth();

    // Set up auto-refresh every 2 minutes if authenticated
    if (user && credentials) {
      intervalId = setInterval(checkAuth, 60000);
    }

    // Cleanup interval on component unmount or when dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, credentials]);


  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "#f5f5f5",
      display: "flex",
      flexDirection: "column" 
    }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Analytics Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
              <Analytics emails={emails} />
            </Paper>
          </Grid>

          {/* Email List Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" gutterBottom component="div">
                Email Analysis
              </Typography>
              {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}
              {loading && (
                <Typography color="text.secondary">
                  Loading emails...
                </Typography>
              )}
              {!loading && emails.length === 0 && (
                <Typography color="text.secondary">
                  No emails found in your inbox.
                </Typography>
              )}
              {!loading && emails.length > 0 && (
                <EmailList
                  emails={emails}
                  onSelectEmail={setSelectedEmail}
                  selectedEmail={selectedEmail}
                />
              )}
            </Paper>
          </Grid>

          {/* Email Details Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, display: "flex", flexDirection: "column" }}>
              <EmailDetails email={selectedEmail} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
};

export default Dashboard;
