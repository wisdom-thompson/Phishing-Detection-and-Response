import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { createTheme } from "@mui/material/styles";
import { LoginForm } from "./components/Auth/LoginForm";
import Dashboard from "./pages/Dashboard";
// import { useEffect, useState } from "react";
// import { User } from "firebase/auth";
// import { auth } from "./components/Auth/FireBase";

const theme = createTheme();
const queryClient = new QueryClient();
// const [user, setUser] = useState<User | null>
// const [loggedIn, setIsLoggedIn] = useState<Boolean>(false)

// useEffect(() => {
//   const unSubscribe = auth.onAuthStateChanged((user) => {
//     if(user) {
//       setUser(user)
//       setIsLoggedIn(true)

//     }else {
//       setUser(null)
//       setIsLoggedIn(false)
//     }
//   })

//   return () => unSubscribe()

// }, [])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
