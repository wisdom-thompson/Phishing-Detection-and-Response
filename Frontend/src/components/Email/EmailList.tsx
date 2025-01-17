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
    <List sx={{ maxHeight: "80vh", overflow: "auto" }}>
      {emails
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .map((email) => (
          <ListItemButton
            selected={selectedEmail?.email_id === email.email_id}
            onClick={() => onSelectEmail(email)}
            key={email.email_id}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemText
              primary={email.subject}
              secondary={
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography component="span" variant="body2">
                    From: {email.sender}
                  </Typography>
                  <Chip
                    label={email.is_phishing ? "Phishing" : "Safe"}
                    color={email.is_phishing ? "error" : "success"}
                    size="small"
                    sx={{
                      ml: 1,
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
