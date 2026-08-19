import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import StepProgress from './components/StepProgress';
import ChatBot from './components/ChatBot';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import DealerBriefing from './screens/DealerBriefing';
import VisitCapture from './screens/VisitCapture';
import ReviewSubmit from './screens/ReviewSubmit';
import Success from './screens/Success';
import TeamSelect from './screens/TeamSelect';
import { api } from './services/api';

// ── Theme context ──────────────────────────────────────────
export const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }

// Shows Navbar on all screens except /login and /success
const STEP_ROUTES = ['/dealer', '/visit', '/submit'];
const NO_NAVBAR   = ['/login', '/success'];
const NO_CHATBOT  = ['/submit', '/success', '/login', '/team'];

function PrivateRoute({ children }) {
  return api.isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function AppLayout() {
  const { pathname } = useLocation();
  const showNavbar      = !NO_NAVBAR.some((r) => pathname === r || pathname.startsWith(r));
  const showStepProgress = STEP_ROUTES.some((r) => pathname.startsWith(r));
  const showChatbot     = !NO_CHATBOT.some((r) => pathname === r || pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.25s' }}>
      {showNavbar && <Navbar />}
      {showStepProgress && <StepProgress />}

      <Routes>
        <Route path="/"            element={<Navigate to="/login" replace />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/team"        element={<PrivateRoute><TeamSelect /></PrivateRoute>} />
        <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dealer/:id"  element={<PrivateRoute><DealerBriefing /></PrivateRoute>} />
        <Route path="/visit/:id"   element={<PrivateRoute><VisitCapture /></PrivateRoute>} />
        <Route path="/submit/:id"  element={<PrivateRoute><ReviewSubmit /></PrivateRoute>} />
        <Route path="/success"     element={<PrivateRoute><Success /></PrivateRoute>} />
        <Route path="*"            element={<Navigate to="/login" replace />} />
      </Routes>

      {showChatbot && <ChatBot />}
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('iam-theme');
    return saved ? saved === 'dark' : true; // default: dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('iam-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
