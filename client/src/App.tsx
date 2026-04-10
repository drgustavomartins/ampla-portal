import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/auth";
import LoginPage from "./pages/login";
import StudentDashboard from "./pages/student-dashboard";
import ModulePage from "./pages/module-page";
import AdminDashboard from "./pages/admin-dashboard";
import ResetPasswordPage from "./pages/reset-password";
import NotFound from "./pages/not-found";
import UpgradePage from "./pages/upgrade";
import PagamentoSucesso from "./pages/pagamento-sucesso";
import PlanosPublicos from "./pages/planos-publicos";
import QuizPage from "./pages/quiz";
import TermosPage from "./pages/termos";
import PrivacidadePage from "./pages/privacidade";

function AppContent() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Both admin and super_admin see the admin dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}

function ProtectedModulePage() {
  const { user, isAdmin } = useAuth();
  if (!user || isAdmin) return <LoginPage />;
  return <ModulePage />;
}

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <LoginPage />;
  if (isAdmin) return <AdminDashboard />;
  return <Component />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={AppContent} />
            <Route path="/module/:id" component={ProtectedModulePage} />
            <Route path="/reset-password/:token" component={ResetPasswordPage} />
            <Route path="/planos" component={PlanosPublicos} />
            <Route path="/upgrade" component={() => <ProtectedPage component={UpgradePage} />} />
            <Route path="/pagamento/sucesso" component={() => <ProtectedPage component={PagamentoSucesso} />} />
            <Route path="/trial/ativo" component={() => <ProtectedPage component={PagamentoSucesso} />} />
            <Route path="/comecar" component={PlanosPublicos} />
            <Route path="/quiz" component={QuizPage} />
            <Route path="/termos" component={TermosPage} />
            <Route path="/privacidade" component={PrivacidadePage} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
