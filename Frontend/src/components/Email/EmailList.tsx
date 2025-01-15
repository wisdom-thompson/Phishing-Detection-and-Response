import {
  List,
  ListItemText,
  Typography,
  Chip,
  ListItemButton,
  Box,
} from "@mui/material";
import { EmailAnalysis } from "../../types";

interface EmailListProps {
  emails: EmailAnalysis[];
  onSelectEmail: (email: EmailAnalysis) => void;
  selectedEmail: EmailAnalysis | null;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  onSelectEmail,
  selectedEmail,
}) => {
  return (
    <List sx={{ maxHeight: "80vh", overflowY: "auto" }}>
      {emails
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .map((email) => (
          <ListItemButton
            selected={selectedEmail?.email_id === email.email_id}
            onClick={() => onSelectEmail(email)}
            key={`${email.email_id}-${email.timestamp}`} // Unique key for list item
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              mb: 1,
              bgcolor: selectedEmail?.email_id === email.email_id ? "grey.200" : "white",
              "&:hover": { bgcolor: "grey.100" },
            }}
          >
            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  sx={{ color: "text.primary" }}
                >
                  {email.subject || "No Subject"}
                </Typography>
              }
              secondary={
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary" component="span">
                    From: {email.sender || "Unknown Sender"}
                  </Typography>
                  <Chip
                    label={email.is_phishing ? "Phishing" : "Safe"}
                    color={email.is_phishing ? "error" : "success"}
                    size="small"
                    sx={{
                      width: "80px",
                      height: "30px",
                      borderRadius: "16px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                </Box>
              }
            />
          </ListItemButton>
        ))}
    </List>
  );
};
