import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Paper,
  useTheme,
} from "@mui/material";
import { EmailAnalysis } from "../../types";
import SecurityIcon from "@mui/icons-material/Security";
import WarningIcon from "@mui/icons-material/Warning";
import EmailIcon from "@mui/icons-material/Email";
import { ReactNode } from "react";

interface AnalyticsProps {
  emails: EmailAnalysis[];
}

export default function Analytics({ emails }: AnalyticsProps) {
  const theme = useTheme();

  // Calculate statistics
  const totalEmails = emails.length;
  const phishingEmails = emails.filter((email) => email.is_phishing).length;
  const safeEmails = totalEmails - phishingEmails;
  const phishingPercentage =
    totalEmails > 0 ? (phishingEmails / totalEmails) * 100 : 0;
  const safePercentage = totalEmails > 0 ? (safeEmails / totalEmails) * 100 : 0;

  const CircularProgressWithLabel = (props: {
    value: number;
    color:
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning"
      | "inherit";
    icon: ReactNode;
    label: string;
    count: number;
    gradient?: string[];
  }) => {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 4,
          background: props.gradient
            ? `linear-gradient(135deg, ${props.gradient[0]}, ${props.gradient[1]})`
            : "white",
          transition: "transform 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-5px)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
            <CircularProgress
              variant="determinate"
              size={140}
              thickness={4}
              value={100}
              sx={{
                color: theme.palette.grey[200],
                position: "absolute",
              }}
            />
            <CircularProgress
              variant="determinate"
              size={140}
              thickness={4}
              value={props.value}
              sx={{
                color:
                  props.color === "inherit"
                    ? "#fff"
                    : theme.palette[props.color].main,
                transition: "all 0.5s ease-in-out",
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: props.gradient,
              }}
            >
              {props.icon}
              <Typography
                variant="h4"
                component="div"
                sx={{
                  fontWeight: "bold",
                  color: props.gradient ? "#fff" : "inherit",
                  mt: 1,
                }}
              >
                {props.count}
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: props.gradient ? "#fff" : theme.palette.text.secondary,
              textAlign: "center",
            }}
          >
            {props.label}
          </Typography>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ py: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: "bold",
          textAlign: "left",
          mb: 4,
          color: "#333",
        }}
      >
        Email Analytics Overview
      </Typography>
      <Grid container spacing={4} justifyContent="center" alignItems="stretch">
        <Grid item xs={12} sm={4}>
          <CircularProgressWithLabel
            value={100}
            color="inherit"
            icon={<EmailIcon sx={{ fontSize: 40, color: "#fff" }} />}
            label="Total Emails"
            count={totalEmails}
            gradient={["#004e89", "#21CBF3"]}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CircularProgressWithLabel
            value={safePercentage}
            color="success"
            icon={<SecurityIcon sx={{ fontSize: 40, color: "#fff" }} />}
            label="Safe Emails"
            count={safeEmails}
            gradient={["#0ead69", "#3bceac"]}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CircularProgressWithLabel
            value={phishingPercentage}
            color="error"
            icon={<WarningIcon sx={{ fontSize: 40, color: "#fff" }} />}
            label="Phishing Detected"
            count={phishingEmails}
            gradient={["#8d0801", "#da1e37"]}
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 4,
          p: 2,
          borderRadius: 2,
          background:
            phishingPercentage > 50
              ? "linear-gradient(45deg, #ff9800 30%, #f44336 90%)"
              : "linear-gradient(45deg, #4caf50 30%, #2196f3 90%)",
          boxShadow: "0 3px 5px 2px rgba(0, 0, 0, .1)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            color: "white",
          }}
        >
          {phishingPercentage.toFixed(1)}% of emails flagged as potential
          phishing attempts
        </Typography>
      </Box>
    </Box>
  );
}
