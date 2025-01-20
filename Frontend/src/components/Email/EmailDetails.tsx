import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { EmailAnalysis } from '../../types';

interface EmailDetailsProps {
  email: EmailAnalysis;
  onClose: () => void;
}

const EmailDetails: React.FC<EmailDetailsProps> = ({ email, onClose }) => {
  return (
    <Box>
      <Typography variant="h6">{email.subject}</Typography>
      <Typography variant="body1">{email.body}</Typography>
      <Button onClick={onClose}>Close</Button>
    </Box>
  );
};

export default EmailDetails;
