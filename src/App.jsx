import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { SessionProvider } from '@/lib/session';
import Landing from '@/pages/Landing';
import TenderDetail from '@/pages/TenderDetail';
import AuthPortal from '@/pages/AuthPortal';
import SupplierPortal from '@/pages/SupplierPortal';
import SelfAudit from '@/pages/SelfAudit';
import CommitteePortal from '@/pages/CommitteePortal';
import EvaluationWorkspace from '@/pages/EvaluationWorkspace';
import ResearchPortal from '@/pages/ResearchPortal';
import AdminPortal from '@/pages/AdminPortal';
import AuditVault from '@/pages/AuditVault';
import Login from '@/pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/tenders/:id" element={<TenderDetail />} />
      <Route path="/auth" element={<AuthPortal />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<AuthPortal />} />
      <Route path="/supplier" element={<SupplierPortal />} />
      <Route path="/supplier/self-audit" element={<SelfAudit />} />
      <Route path="/committee" element={<CommitteePortal />} />
      <Route path="/committee/tender/:id" element={<EvaluationWorkspace />} />
      <Route path="/research" element={<ResearchPortal />} />
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="/vault" element={<AuditVault />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <SessionProvider>
            <AuthenticatedApp />
          </SessionProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App