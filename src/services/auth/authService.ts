import { supabase } from '../database/supabase';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const authService = {
  // Sign up with email and password
  async signup(email: string, password: string, username?: string): Promise<{ error: Error | null; session: any }> {
    try {
      // Validate email format
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username || email.split('@')[0],
            app_name: 'Initra Home inventroymanagement app by issac',
          },
        },
      });

      if (error) throw error;

      // Store username in user_profiles table if provided
      if (data.user && username) {
        await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            username,
            email: data.user.email,
            updated_at: new Date().toISOString(),
          });
      }

      toast.success('Account created successfully!');
      return { error: null, session: data.session };
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.message || 'Failed to create account. Please try again.';
      if (errorMessage.includes('email')) {
        toast.error('Please enter a valid email address');
      } else if (errorMessage.includes('password')) {
        toast.error('Password must be at least 6 characters');
      } else {
        toast.error(errorMessage);
      }
      return { error: error as Error, session: null };
    }
  },

  // Resend confirmation email
  async resendConfirmationEmail(email: string): Promise<{ error: Error | null }> {
    try {
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success('Confirmation email sent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      toast.error('Failed to send confirmation email. Please try again.');
      return { error: error as Error };
    }
  },

  // Login with email and password
  async login(email: string, password: string): Promise<{ error: Error | null; session: any; needsConfirmation?: boolean }> {
    try {
      // Validate email format
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      toast.success('Logged in successfully!');
      return { error: null, session: data.session };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Invalid email or password.';
      
      // Check if email needs confirmation
      if (errorMessage.includes('not confirmed') || errorMessage.includes('Email not confirmed')) {
        return { 
          error: error as Error, 
          session: null,
          needsConfirmation: true 
        };
      }
      
      if (errorMessage.includes('email') || errorMessage.includes('format')) {
        toast.error('Please enter a valid email address');
      } else if (errorMessage.includes('credentials') || errorMessage.includes('Invalid')) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else {
        toast.error(errorMessage);
      }
      return { error: error as Error, session: null };
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get username from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email!,
        username: profile?.username || user.user_metadata?.username,
        created_at: user.created_at,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Logout
  async logout(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully!');
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: error as Error };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  },
};

