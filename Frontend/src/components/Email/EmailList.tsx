import {
  List,
  ListItemText,
  Typography,
  Chip,
  ListItemButton,
  Box,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { EmailAnalysis } from "../../types";

interface EmailListProps {
  emails: EmailAnalysis[];
  onSelectEmail: (email: EmailAnalysis) => void;
  selectedEmail: EmailAnalysis | null;
  onDeleteEmail?: (emailId: string) => void;
}

export default function EmailList({
  emails,
  onSelectEmail,
  selectedEmail,
  onDeleteEmail,
}: EmailListProps) {
  const handleDelete = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();

    const storedEmails = JSON.parse(sessionStorage.getItem("emails") || "[]");

    const updatedEmails = storedEmails.filter(
      (email: EmailAnalysis) => email.email_id !== emailId
    );

    sessionStorage.setItem("emails", JSON.stringify(updatedEmails));

    if (onDeleteEmail) {
      onDeleteEmail(emailId);
    }
  };

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
            key={`${email.email_id}-${email.timestamp}`}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              mb: 1,
              bgcolor:
                selectedEmail?.email_id === email.email_id
                  ? "grey.200"
                  : "white",
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
                  {email.subject || "No Subject Found"}
                </Typography>
              }
              secondary={
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box
                    component="span"
                    sx={{ color: "text.secondary", typography: "body2" }}
                  >
                    From: {email.sender || "Unknown Sender"}
                  </Box>
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
            <IconButton
              onClick={(e) => handleDelete(e, email.email_id)}
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          </ListItemButton>
        ))}
    </List>
  );
}
