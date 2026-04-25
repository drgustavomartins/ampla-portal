import { lazy, Suspense } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/auth";
import { VisitorTracker } from "./components/VisitorTracker";

// Custom hash-location hook that strips query string before matching routes,
// so that Stripe redirects like /#/pagamento/sucesso?plan=xxx&session_id=yyy
// still match Route path="/pagamento/sucesso".
function useHashLocationWithoutQuery(): [string, (to: string) => void] {
  const [loc, nav] = useHashLocation();
  const pathOnly = loc.split("?")[0];
  return [pathOnly, nav];
}

// ─── Critical path (kept in main bundle) ──────────────────────────────────
import LoginPage from "./pages/login";
import NotFound from "./pages/not-found";

// ─── Lazy-loaded pages ────────────────────────────────────────────────────
const StudentDashboard = lazy(() => import("./pages/student-dashboard"));
const AdminDashboard = lazy(() => import("./pages/admin-dashboard"));
const ModulePage = lazy(() => import("./pages/module-page"));
const ResetPasswordPage = lazy(() => import("./pages/reset-password"));
const UpgradePage = lazy(() => import("./pages/upgrade"));
const PagamentoSucesso = lazy(() => import("./pages/pagamento-sucesso"));
const TrialCartao = lazy(() => import("./pages/trial-cartao"));
const PlanosPublicos = lazy(() => import("./pages/planos-publicos"));
const PlanosAuth = lazy(() => import("./pages/planos"));
const QuizPage = lazy(() => import("./pages/quiz"));
const TermosPage = lazy(() => import("./pages/termos"));
const PrivacidadePage = lazy(() => import("./pages/privacidade"));
const CreditsPage = lazy(() => import("./pages/credits"));
const CreditsRulesPage = lazy(() => import("./pages/credits-rules"));
const ComunidadePage = lazy(() => import("./pages/comunidade"));
const AcompanhamentoPage = lazy(() => import("./pages/acompanhamento"));
const LandingPage = lazy(() => import("./pages/lp"));

// ─── Loading spinner for lazy chunks ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#F8F7F4" }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: "#D4A84340", borderTopColor: "transparent" }}
        />
        <span className="text-xs text-gray-400 tracking-wide">Carregando...</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Both admin and super_admin see the admin dashboard
  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <StudentDashboard />
    </Suspense>
  );
}

function ProtectedModulePage() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return (
    <Suspense fallback={<PageLoader />}>
      <ModulePage />
    </Suspense>
  );
}

function ProtectedPlanosPage() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      {user ? <PlanosAuth /> : <PlanosPublicos />}
    </Suspense>
  );
}

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <LoginPage />;
  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// Página protegida que admin TAMBÉM pode ver normalmente (p/ preview).
function ProtectedPageAdminOk({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocationWithoutQuery}>
          <VisitorTracker />
          <Switch>
            <Route path="/" component={AppContent} />
            <Route path="/module/:id" component={ProtectedModulePage} />
            <Route path="/reset-password/:token" component={() => <LazyRoute component={ResetPasswordPage} />} />
            <Route path="/planos" component={ProtectedPlanosPage} />
            <Route path="/upgrade" component={() => <ProtectedPage component={UpgradePage} />} />
            <Route path="/pagamento/sucesso" component={() => <ProtectedPage component={PagamentoSucesso} />} />
            <Route path="/trial/ativo" component={() => <ProtectedPage component={PagamentoSucesso} />} />
            <Route path="/trial/cartao" component={() => <ProtectedPage component={TrialCartao} />} />
            <Route path="/trial/cartao-confirmado" component={() => <ProtectedPage component={TrialCartao} />} />
            <Route path="/comecar" component={() => <LazyRoute component={PlanosPublicos} />} />
            <Route path="/planos-publicos" component={() => <LazyRoute component={PlanosPublicos} />} />
            <Route path="/lp" component={() => <LazyRoute component={LandingPage} />} />
            <Route path="/quiz" component={() => <LazyRoute component={QuizPage} />} />
            <Route path="/creditos" component={() => <ProtectedPage component={CreditsPage} />} />
            <Route path="/creditos/regras" component={() => <ProtectedPage component={CreditsRulesPage} />} />
            <Route path="/comunidade" component={() => <ProtectedPage component={ComunidadePage} />} />
            <Route path="/acompanhamento" component={() => <ProtectedPageAdminOk component={AcompanhamentoPage} />} />
            <Route path="/termos" component={() => <LazyRoute component={TermosPage} />} />
            <Route path="/privacidade" component={() => <LazyRoute component={PrivacidadePage} />} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
