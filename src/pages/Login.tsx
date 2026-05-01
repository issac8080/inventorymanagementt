import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { simpleAuth } from '@/services/auth/simpleAuth';
import { isCloudDatabaseConfigured } from '@/services/database/cloudBackend';

type AuthMode = 'signin' | 'signup';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const goLocalOnly = () => {
    simpleAuth.continueAsLocalDevice();
    window.dispatchEvent(new Event('userLogin'));
    setTimeout(() => navigate('/'), 100);
  };

  const finishSession = (isAdmin: boolean) => {
    window.dispatchEvent(new Event('userLogin'));
    setTimeout(() => {
      navigate(isAdmin ? '/admin' : '/');
    }, 100);
  };

  const handleSignIn = async () => {
    if (!contact.trim() || !password) return;
    setLoading(true);
    try {
      const { error, user, isAdmin } = await simpleAuth.login(contact, password);
      if (error || !user) {
        setLoading(false);
        return;
      }
      simpleAuth.saveUser(user, isAdmin);
      finishSession(isAdmin);
    } catch (error) {
      console.error('Login handler error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!contact.trim() || !password || !confirmPassword) return;
    setLoading(true);
    try {
      const { error, user, isAdmin } = await simpleAuth.signup(
        contact,
        password,
        confirmPassword,
        displayName.trim() || undefined
      );
      if (error || !user) {
        setLoading(false);
        return;
      }
      simpleAuth.saveUser(user, isAdmin);
      finishSession(isAdmin);
    } catch (error) {
      console.error('Signup handler error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cloud = isCloudDatabaseConfigured();

  const signInDisabled = loading || !contact.trim() || !password;
  const signUpDisabled =
    loading ||
    !contact.trim() ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-4">
            <img src="/initr.png" alt="Initra Logo" className="h-24 sm:h-32 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Initra – Home Inventory Management App
            <br />
            <span className="text-lg text-gray-600">by Issac</span>
          </h1>
          <p className="text-gray-600">
            {mode === 'signin' ? 'Sign in with email or phone' : 'Create an account with email or phone'}
          </p>
        </div>

        <div
          className="flex rounded-xl border border-gray-200 bg-gray-50/80 p-1 mb-5"
          role="tablist"
          aria-label="Sign in or create account"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="login-contact" className="block text-sm font-medium text-gray-700 mb-2">
              Email or phone number
            </label>
            <input
              id="login-contact"
              type="text"
              inputMode="email"
              autoComplete={mode === 'signup' ? 'email' : 'username'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  document.getElementById('login-password')?.focus();
                }
              }}
              placeholder="you@email.com or +91 98765 43210"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-lg transition-shadow"
              autoFocus
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="login-display-name" className="block text-sm font-medium text-gray-700 mb-2">
                Your name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="login-display-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How we should greet you"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-lg transition-shadow"
              />
            </div>
          )}

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  if (mode === 'signin' && contact.trim() && password) {
                    void handleSignIn();
                  } else {
                    document.getElementById('login-confirm-password')?.focus();
                  }
                }
              }}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-lg transition-shadow"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="login-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm password
              </label>
              <input
                id="login-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && !signUpDisabled) {
                    void handleSignUp();
                  }
                }}
                placeholder="Repeat password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-lg transition-shadow"
              />
            </div>
          )}

          {mode === 'signin' ? (
            <Button type="button" onClick={() => void handleSignIn()} fullWidth size="lg" disabled={signInDisabled}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSignUp()} fullWidth size="lg" disabled={signUpDisabled}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          )}

          {!cloud && (
            <div className="pt-2 space-y-3">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="lg"
                disabled={loading}
                onClick={() => goLocalOnly()}
              >
                Use app on this device only (no sign-in)
              </Button>
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Cloud is off — data stays in this browser. Add Firebase env vars on your host to sync online.
              </p>
            </div>
          )}

          {cloud && (
            <Button type="button" variant="outline" fullWidth size="lg" disabled={loading} onClick={() => goLocalOnly()}>
              Or use this device only (no cloud)
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
