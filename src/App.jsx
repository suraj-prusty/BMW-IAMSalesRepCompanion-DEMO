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

import bg1 from './images/DI21_000030168.jpg';
import bg2 from './images/DI22_000069073.jpg';
import bg3 from './images/DI22_000082218.jpg';
import bg4 from './images/DI22_000085881.jpg';
import bg5 from './images/DI22_000086421.jpg';
import bg6 from './images/DI25_000321641.png';

const BG_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6];

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
  const { isDark } = useTheme();
  const { pathname } = useLocation();
  const showNavbar       = !NO_NAVBAR.some((r) => pathname === r || pathname.startsWith(r));
  const showStepProgress = STEP_ROUTES.some((r) => pathname.startsWith(r));
  const showChatbot      = !NO_CHATBOT.some((r) => pathname === r || pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* BMW ambient background carousel — pure CSS, dark mode only */}
      {isDark && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          {BG_IMAGES.map((img, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0,
                // Each image starts 2s after the previous.
                // Negative delay on i=0 means it skips the initial fade-in and appears immediately.
                animation: `bgCarousel 12s ${i * 2 - 1}s infinite`,
              }}
            />
          ))}
          {/* Dark overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        background: isDark ? 'transparent' : 'var(--bg)',
        transition: 'background 0.25s',
      }}>
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
