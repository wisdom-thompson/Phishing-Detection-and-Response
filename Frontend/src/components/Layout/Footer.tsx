import { Box, Container, Typography, Link } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: "auto",
        backgroundColor: (theme) => theme.palette.grey[100],
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", mb: { xs: 2, sm: 0 } }}
          >
            <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Phishing Shield by{" "}
              <Link
                href="https://github.com/wisdom-thompson"
                target="_blank"
                rel="noopener"
                color="primary"
                sx={{ textDecoration: "none", fontWeight: "bold" }}
              >
                Wisdom
              </Link>
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              href="https://www.linkedin.com/in/owhorji-wisdom-b23944194/"
              color="text.secondary"
              sx={{ textDecoration: "none" }}
            >
              Contact
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
