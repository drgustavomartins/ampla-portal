import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/auth";
import LoginPage from "./pages/login";
import StudentDashboard from "./pages/student-dashboard";
import AdminDashboard from "./pages/admin-dashboard";
import ResetPasswordPage from "./pages/reset-password";
import NotFound from "./pages/not-found";

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={AppContent} />
            <Route path="/reset-password/:token" component={ResetPasswordPage} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
