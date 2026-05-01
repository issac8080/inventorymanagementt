import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/common/Navbar';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { simpleAuth, User } from './services/auth/simpleAuth';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.default })));
const AddProduct = lazy(() => import('./pages/AddProduct').then(m => ({ default: m.default })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.default })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.default })));
const Audit = lazy(() => import('./pages/Audit').then(m => ({ default: m.default })));
const PrintCodes = lazy(() => import('./pages/PrintCodes').then(m => ({ default: m.default })));
const GetWarranty = lazy(() => import('./pages/GetWarranty').then(m => ({ default: m.default })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.default })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.default })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.default })));

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = simpleAuth.initCloudAuthSync(() => {
      setUser(simpleAuth.getCurrentUser());
    });

    const checkUser = () => {
      const currentUser = simpleAuth.getCurrentUser();
      setUser(currentUser);
    };

    checkUser();

    const handleLogin = () => {
      checkUser();
    };

    window.addEventListener('userLogin', handleLogin);

    const handleStorageChange = () => {
      checkUser();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubAuth();
      window.removeEventListener('userLogin', handleLogin);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Re-check user when route changes
  useEffect(() => {
    const currentUser = simpleAuth.getCurrentUser();
    setUser(currentUser);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {user && <Navbar />}
      <Suspense fallback={<LoadingSpinner fullScreen text="Loading page…" />}>
        <Routes>
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login />}
              />
              <Route
                path="/"
                element={user ? <Home /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/add"
                element={user ? <AddProduct /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/product/:itemCode"
                element={user ? <ProductDetail /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/inventory"
                element={user ? <Inventory /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/audit"
                element={user ? <Audit /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/print"
                element={user ? <PrintCodes /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/warranty"
                element={user ? <GetWarranty /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/settings"
                element={user ? <Settings /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/admin"
                element={simpleAuth.isCurrentUserAdmin() ? <Admin /> : <Navigate to="/login" replace />}
              />
        </Routes>
      </Suspense>
      <Toaster
        position="top-center"
        gutter={12}
        toastOptions={{
          duration: 4000,
          className: '!shadow-lg !rounded-xl !border !border-gray-200',
          style: {
            background: '#ffffff',
            color: '#111827',
            fontSize: '17px',
            padding: '14px 18px',
            maxWidth: 'min(100vw - 24px, 28rem)',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#ecfdf5' },
            style: { borderColor: '#a7f3d0' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
            style: { borderColor: '#fecaca' },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

