import { Box, Typography, Divider, Chip } from "@mui/material";
import { EmailAnalysis } from "../../types";
import WarningIcon from "@mui/icons-material/Warning";
import SecurityIcon from "@mui/icons-material/Security";

interface EmailDetailsProps {
  email: EmailAnalysis | null;
}

export const EmailDetails: React.FC<EmailDetailsProps> = ({ email }) => {
  if (!email) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select an email to view details
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Email Details
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Chip
          icon={email.is_phishing ? <WarningIcon /> : <SecurityIcon />}
          label={email.is_phishing ? "Phishing Detected" : "Safe Email"}
          color={email.is_phishing ? "error" : "success"}
          sx={{ mb: 2 }}
        />
      </Box>
      <Typography variant="subtitle2" color="text.secondary">
        From
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {email.sender}
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" color="text.secondary">
        Subject
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {email.subject}
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" color="text.secondary">
        Content
      </Typography>
      <Typography 
        variant="body1" 
        sx={{ 
          mt: 1,
          maxHeight: "300px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          bgcolor: "#f5f5f5",
          p: 2,
          borderRadius: 1
        }}
      >
        {email.body}
      </Typography>
    </Box>
  );
};
