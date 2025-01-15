import { Box, Typography, Divider, Chip, Button } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { EmailAnalysis } from "../../types";
import WarningIcon from "@mui/icons-material/Warning";
import SecurityIcon from "@mui/icons-material/Security";

interface EmailDetailsProps {
  email: EmailAnalysis | null;
  onClose: () => void;
}

export const EmailDetails: React.FC<EmailDetailsProps> = ({ email, onClose }) => {
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
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip
          icon={email.is_phishing ? <WarningIcon /> : <SecurityIcon />}
          label={email.is_phishing ? "Phishing Detected" : "Safe Email"}
          color={email.is_phishing ? "error" : "success"}
          sx={{ mb: 2 }}
        />
        <Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              // Add delete functionality here
              console.log('Delete email:', email.email_id);
            }}
            sx={{ mr: 1 }}
          >
            Delete
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
        </Box>
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
