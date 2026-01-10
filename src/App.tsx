import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/common/Navbar';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.default })));
const AddProduct = lazy(() => import('./pages/AddProduct').then(m => ({ default: m.default })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.default })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.default })));
const Audit = lazy(() => import('./pages/Audit').then(m => ({ default: m.default })));
const PrintCodes = lazy(() => import('./pages/PrintCodes').then(m => ({ default: m.default })));
const GetWarranty = lazy(() => import('./pages/GetWarranty').then(m => ({ default: m.default })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.default })));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/add" element={<AddProduct />} />
              <Route path="/product/:itemCode" element={<ProductDetail />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/print" element={<PrintCodes />} />
              <Route path="/warranty" element={<GetWarranty />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#1f2937',
                fontSize: '18px',
                padding: '16px',
              },
            }}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

