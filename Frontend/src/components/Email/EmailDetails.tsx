import { Box, Typography, Button, Divider, Paper } from "@mui/material";
import { EmailAnalysis } from "../../types";

interface EmailDetailsProps {
  email: EmailAnalysis;
  onClose: () => void;
}

export default function EmailDetails({ email, onClose }: EmailDetailsProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 600,
        margin: "auto",
        padding: 3,
        borderRadius: 4,
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#fff",
      }}
    >
      <Box>
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          sx={{ color: "#333" }}
        >
          {email.subject || "No Subject"}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ color: "#777", mb: 1 }}>
          <strong>From:</strong> {email.sender || "Unknown Sender"}
        </Typography>

        <Typography variant="subtitle2" sx={{ color: "#aaa", mb: 2 }}>
          <strong>Received:</strong>{" "}
          {new Date(email.timestamp).toLocaleString()}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="body1"
          sx={{ color: "#555", whiteSpace: "pre-wrap" }}
        >
          {email.body || "This email has no content."}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
