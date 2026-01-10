import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { simpleAuth } from '@/services/auth/simpleAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobile || !password) {
      toast.error('Please enter mobile number and password');
      return;
    }

    setLoading(true);
    const { error, user, isAdmin } = await simpleAuth.login(mobile, password);
    setLoading(false);

    if (!error && user) {
      simpleAuth.saveUser(user, isAdmin);
      
      // Trigger event to notify App component
      window.dispatchEvent(new Event('userLogin'));
      
      // Small delay to ensure state updates
      setTimeout(() => {
        if (isAdmin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 100);
    }
  };

  const handleSignup = async () => {
    if (!mobile || !password) {
      toast.error('Please enter mobile number and password');
      return;
    }

    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    const { error, user } = await simpleAuth.signup(mobile, password, username || undefined);
    setLoading(false);

    if (!error && user) {
      simpleAuth.saveUser(user, false);
      
      // Trigger event to notify App component
      window.dispatchEvent(new Event('userLogin'));
      
      // Small delay to ensure state updates
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/initr.png" alt="Initra Logo" className="h-24 sm:h-32 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Initra – Home Inventory Management App
            <br />
            <span className="text-lg text-gray-600">by Issac</span>
          </h1>
          <p className="text-gray-600">
            {isSignup ? 'Create your account' : 'Sign in to access your inventory'}
          </p>
        </div>

        <div className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username (Optional)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && mobile && password.length >= 4) {
                    handleSignup();
                  }
                }}
                placeholder="Choose a username"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                autoFocus={isSignup}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                  passwordInput?.focus();
                }
              }}
              placeholder="Enter your mobile number"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              autoFocus={!isSignup}
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading && mobile && password) {
                  if (isSignup) {
                    handleSignup();
                  } else {
                    handleLogin();
                  }
                }
              }}
              placeholder={isSignup ? "Choose a password (min 4 characters)" : "Enter your password"}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>

          <Button
            onClick={isSignup ? handleSignup : handleLogin}
            fullWidth
            size="lg"
            disabled={loading || !mobile || !password || (isSignup && password.length < 4)}
          >
            {loading 
              ? (isSignup ? 'Creating account...' : 'Logging in...') 
              : (isSignup ? 'Sign Up' : 'Login')
            }
          </Button>

          <div className="text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setMobile('');
                setPassword('');
                setUsername('');
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {isSignup 
                ? 'Already have an account? Login here' 
                : "Don't have an account? Sign up here"
              }
            </button>
          </div>

          <div className="text-center pt-2 border-t">
            <p className="text-xs text-gray-500">
              Admin? Login with username: <strong>issac</strong> and password: <strong>antonio</strong>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
