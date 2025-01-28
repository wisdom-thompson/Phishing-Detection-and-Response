import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { analyzeEmails } from "../../services/api";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { LoginCredentials } from "../../types";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SecurityIcon from "@mui/icons-material/Security";
import { auth, googleProvider } from "./FireBase";
import { GoogleAuthProvider } from "firebase/auth";
import { fetchGoogleEmails } from "../../hooks/fetchGoogleEmails";
export const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
    loginType: "imap",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const success = await login(credentials);
      if (success) {
        // Store password temporarily for email fetching
        sessionStorage.setItem('userPassword', credentials.password);
        sessionStorage.setItem('loginType', 'imap');
        sessionStorage.setItem('userCredentials', JSON.stringify(credentials));
        toast.success("Login successful! Redirecting to dashboard...");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please check your credentials."
      );
    }
  };



  const handleGoogleLogin = async () => {
    try {
      googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      const result = await signInWithPopup(auth, googleProvider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem("gmailToken", credential.accessToken);
        sessionStorage.setItem("loginType", "google");
        toast.success("Google login successful!");

        // Login with Google credentials
        await login({
          email: result.user.email || '',
          password: '',
          loginType: 'google'
        });

        navigate("/dashboard");
        fetchGoogleEmails(credential.accessToken);

      }
    } catch (error) {
      console.error("Google Login failed", error);
      toast.error("Google Login failed");
    }
  };




  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 400,
          borderRadius: 2,
          backgroundColor: "white",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <SecurityIcon sx={{ fontSize: 40, color: "primary.main", mr: 1 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: "primary.main",
            }}
          >
            Phishing Shield
          </Typography>
        </Box>

        <Typography
          variant="body1"
          sx={{ mb: 3, textAlign: "center", color: "text.secondary" }}
        >
          Secure your inbox with advanced phishing detection
        </Typography>

        <Box sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
            value={credentials.email}
            onChange={(e) =>
              setCredentials({ ...credentials, email: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={credentials.password}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign In"
            )}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            sx={{
              mt: 1,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
            }}
            onClick={handleGoogleLogin}
          >

            Sign in with Google
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
