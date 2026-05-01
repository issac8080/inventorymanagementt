import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, Package, Search, FileText, Shield, Menu, X, Settings, LogOut, UserCog } from 'lucide-react';
import { simpleAuth } from '@/services/auth/simpleAuth';
import { isUsingFirebase, isUsingLocalDatabase, isUsingSupabase } from '@/services/database/db';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    simpleAuth.logout();
    navigate('/login');
  };

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

  const getNavItemColor = (index: number) => {
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
    <nav
      className="sticky top-0 z-40 border-b border-white/20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-blue-600/90"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-[4.25rem]">
          <Link
            to="/"
            aria-label="Initra, go to home"
            className="flex items-center gap-1 sm:gap-2 font-bold rounded-lg min-h-0 min-w-0 px-1 py-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 transition-colors"
          >
            <img src="/initr.png" alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <div className="hidden xl:flex flex-col leading-tight">
              <span className="text-xs bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                Initra – Home Inventory Management App
              </span>
              <span className="text-xs bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                by Issac
              </span>
            </div>
            <span className="hidden md:inline xl:hidden bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent text-xs sm:text-sm">
              Initra – Home Inventory Management App by Issac
            </span>
            <span className="hidden sm:inline md:hidden bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent text-xs">
              Initra by Issac
            </span>
            <span className="sm:hidden text-yellow-200 text-xs">Initra</span>
            {isUsingLocalDatabase() && (
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide bg-yellow-300 text-gray-900 px-2 py-0.5 rounded-full whitespace-nowrap">
                This device
              </span>
            )}
            {isUsingFirebase() && (
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide bg-emerald-200 text-gray-900 px-2 py-0.5 rounded-full whitespace-nowrap">
                Firebase
              </span>
            )}
            {isUsingSupabase() && (
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide bg-cyan-200 text-gray-900 px-2 py-0.5 rounded-full whitespace-nowrap">
                Supabase
              </span>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const gradient = getNavItemColor(index);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg min-h-0 min-w-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 ${
                    active
                      ? `bg-gradient-to-r ${gradient} shadow-md font-semibold ring-1 ring-white/40`
                      : 'hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
                  <span className="text-sm sm:text-base">{item.label}</span>
                </Link>
              );
            })}
            {simpleAuth.isCurrentUserAdmin() && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg min-h-0 min-w-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 ${
                  isActive('/admin')
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md font-semibold ring-1 ring-white/40'
                    : 'hover:bg-white/15'
                }`}
              >
                <UserCog className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
                <span className="text-sm sm:text-base">Admin</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg min-h-0 min-w-0 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-pink-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
              <span className="text-sm sm:text-base">Logout</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg min-h-[44px] min-w-[44px] hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600"
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileMenuId}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden /> : <Menu className="w-6 h-6" aria-hidden />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              id={mobileMenuId}
              className="md:hidden relative z-40 pb-4 pt-1 space-y-1.5 border-t border-white/15"
              role="navigation"
              aria-label="Mobile sections"
            >
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const gradient = getNavItemColor(index);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset ${
                      active
                        ? `bg-gradient-to-r ${gradient} shadow-md font-bold ring-1 ring-white/30`
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${active ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Icon className="w-5 h-5" aria-hidden />
                    </div>
                    <span className="text-base font-semibold">{item.label}</span>
                  </Link>
                );
              })}
              {simpleAuth.isCurrentUserAdmin() && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset ${
                    isActive('/admin')
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md font-bold ring-1 ring-white/30'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isActive('/admin') ? 'bg-white/20' : 'bg-white/10'}`}>
                    <UserCog className="w-5 h-5" aria-hidden />
                  </div>
                  <span className="text-base font-semibold">Admin</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors bg-white/10 hover:bg-white/20 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
              >
                <div className="p-2 rounded-lg bg-white/10 shrink-0">
                  <LogOut className="w-5 h-5" aria-hidden />
                </div>
                <span className="text-base font-semibold">Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
