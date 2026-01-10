import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Package, Search, FileText, Shield, Menu, X, Settings } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/warranty', label: 'Get Warranty', icon: Shield },
    { path: '/add', label: 'Add Product', icon: Plus },
    { path: '/inventory', label: 'My Products', icon: Package },
    { path: '/audit', label: 'Audit', icon: Search },
    { path: '/print', label: 'Print QR', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getNavItemColor = (index: number, isActive: boolean) => {
    const colors = [
      'from-red-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl sticky top-0 z-40 border-b-4 border-yellow-400">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-1 sm:gap-2 font-bold text-lg sm:text-xl hover:scale-105 transition-transform">
            <div className="bg-white bg-opacity-20 rounded-full p-1.5 sm:p-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
              Home Inventory
            </span>
            <span className="sm:hidden text-yellow-200">Inventory</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const gradient = getNavItemColor(index, active);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-r ${gradient} shadow-lg scale-105 font-semibold border-2 border-white border-opacity-30`
                      : 'hover:bg-white hover:bg-opacity-15 hover:scale-105'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-in slide-in-from-top">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const gradient = getNavItemColor(index, active);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-r ${gradient} shadow-lg font-bold border-2 border-white border-opacity-40`
                      : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${active ? 'bg-white bg-opacity-20' : 'bg-white bg-opacity-10'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

