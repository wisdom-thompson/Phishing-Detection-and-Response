import { Box, Typography, Grid, Paper } from "@mui/material";
import { EmailAnalysis } from "../../types";
import SecurityIcon from "@mui/icons-material/Security";
import WarningIcon from "@mui/icons-material/Warning";
import EmailIcon from "@mui/icons-material/Email";

interface AnalyticsProps {
  emails: EmailAnalysis[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ emails }) => {
  const totalEmails = emails.length;
  const phishingEmails = emails.filter((email) => email.is_phishing).length;
  const safeEmails = totalEmails - phishingEmails;
  const phishingPercentage = totalEmails > 0 
    ? ((phishingEmails / totalEmails) * 100).toFixed(1) 
    : "0";

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Email Analytics
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "primary.light",
              color: "white",
            }}
          >
            <EmailIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{totalEmails}</Typography>
            <Typography variant="subtitle1">Total Emails</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "success.light",
              color: "white",
            }}
          >
            <SecurityIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{safeEmails}</Typography>
            <Typography variant="subtitle1">Safe Emails</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "error.light",
              color: "white",
            }}
          >
            <WarningIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{phishingEmails}</Typography>
            <Typography variant="subtitle1">Phishing Detected</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Typography variant="subtitle2" sx={{ mt: 2, textAlign: "center" }}>
        {phishingPercentage}% of emails flagged as potential phishing attempts
      </Typography>
    </Box>
  );
};
