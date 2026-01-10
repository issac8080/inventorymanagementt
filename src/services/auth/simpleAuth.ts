import { supabase } from '../database/supabase';
import toast from 'react-hot-toast';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && !url.includes('placeholder') && !key.includes('placeholder');
};

export interface User {
  id: string;
  mobile: string;
  password: string; // Plaintext - as requested
  username?: string;
  created_at: string;
}

// Hardcoded admin credentials
const ADMIN_USERNAME = 'issac';
const ADMIN_PASSWORD = 'antonio';

export const simpleAuth = {
  // Check if user is admin
  isAdmin(username: string, password: string): boolean {
    return username.toLowerCase() === ADMIN_USERNAME.toLowerCase() && password === ADMIN_PASSWORD;
  },

  // Sign up with mobile and password
  async signup(mobile: string, password: string, username?: string): Promise<{ error: Error | null; user: User | null }> {
    try {
      if (!mobile || mobile.trim().length < 10) {
        throw new Error('Please enter a valid mobile number (at least 10 digits)');
      }

      if (!password || password.length < 4) {
        throw new Error('Password must be at least 4 characters');
      }

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Database connection not configured. Please contact administrator.');
      }

      const trimmedMobile = mobile.trim();

      // Check if mobile already exists - use maybeSingle() to handle no results gracefully
      const { data: existing, error: checkError } = await supabase
        .from('app_users')
        .select('mobile')
        .eq('mobile', trimmedMobile)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors are real issues
        throw checkError;
      }

      if (existing) {
        throw new Error(`This mobile number (${trimmedMobile}) is already registered. Please use login instead.`);
      }

      // Create new user
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          mobile: trimmedMobile,
          password: password, // Plaintext storage as requested
          username: username || trimmedMobile,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error(`This mobile number (${trimmedMobile}) is already registered. Please use login instead.`);
        }
        // Network or connection errors
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
      }

      toast.success('Account created successfully!');
      return { error: null, user: data };
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.message || 'Failed to create account. Please try again.';
      toast.error(errorMessage);
      return { error: error as Error, user: null };
    }
  },

  // Login with mobile and password
  async login(mobile: string, password: string): Promise<{ error: Error | null; user: User | null; isAdmin: boolean }> {
    try {
      if (!mobile || !password) {
        throw new Error('Please enter mobile number and password');
      }

      // Check if admin login (allow both mobile field and username)
      const mobileOrUsername = mobile.trim().toLowerCase();
      if (this.isAdmin(mobileOrUsername, password)) {
        const adminUser: User = { 
          id: 'admin', 
          mobile: 'admin', 
          password: '', 
          username: 'Admin', 
          created_at: new Date().toISOString() 
        };
        toast.success('Admin login successful!');
        return { error: null, user: adminUser, isAdmin: true };
      }

      // Regular user login - validate mobile format
      const trimmedMobile = mobile.trim();
      if (!/^\d{10,15}$/.test(trimmedMobile)) {
        throw new Error('Please enter a valid mobile number (10-15 digits)');
      }

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Database connection not configured. Please contact administrator.');
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('mobile', trimmedMobile)
        .eq('password', password) // Direct comparison - plaintext
        .maybeSingle();

      // Handle Supabase errors
      if (error) {
        // PGRST116 is "not found" - user doesn't exist
        if (error.code === 'PGRST116') {
          throw new Error('Invalid mobile number or password');
        }
        // Network or connection errors
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
      }

      // No data means user not found
      if (!data) {
        throw new Error('Invalid mobile number or password');
      }

      toast.success('Logged in successfully!');
      return { error: null, user: data, isAdmin: false };
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid mobile number or password.');
      return { error: error as Error, user: null, isAdmin: false };
    }
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      // Check if user is admin before fetching
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Database connection not configured. Please contact administrator.');
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to load users: ${error.message}`);
        throw error;
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Get all users error:', error);
      if (error.message && !error.message.includes('Unauthorized')) {
        toast.error(error.message || 'Failed to load users');
      }
      return [];
    }
  },

  // Logout
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    toast.success('Logged out successfully!');
  },

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Check if current user is admin
  isCurrentUserAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  },

  // Save user to localStorage
  saveUser(user: User, isAdmin: boolean = false): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('isAdmin', isAdmin.toString());
  },

  // Create user (admin only)
  async createUser(mobile: string, password: string, username?: string): Promise<{ error: Error | null; user: User | null }> {
    try {
      // Check if user is admin before creating
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      if (!mobile || mobile.trim().length < 10) {
        throw new Error('Please enter a valid mobile number (at least 10 digits)');
      }

      if (!password || password.length < 4) {
        throw new Error('Password must be at least 4 characters');
      }

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Database connection not configured. Please contact administrator.');
      }

      const trimmedMobile = mobile.trim();

      // Check if mobile already exists - use maybeSingle() to handle no results gracefully
      const { data: existing, error: checkError } = await supabase
        .from('app_users')
        .select('mobile')
        .eq('mobile', trimmedMobile)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors are real issues
        throw checkError;
      }

      if (existing) {
        throw new Error(`This mobile number (${trimmedMobile}) already exists. Please choose a different number.`);
      }

      // Create new user
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          mobile: trimmedMobile,
          password: password, // Plaintext storage as requested
          username: username || trimmedMobile,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error(`This mobile number (${trimmedMobile}) already exists. Please choose a different number.`);
        }
        throw error;
      }

      toast.success('User created successfully!');
      return { error: null, user: data };
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(error.message || 'Failed to create user. Please try again.');
      return { error: error as Error, user: null };
    }
  },

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<{ error: Error | null; success: boolean }> {
    try {
      // Check if user is admin before deleting
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deleted successfully!');
      return { error: null, success: true };
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to delete user. Please try again.');
      return { error: error as Error, success: false };
    }
  },
};

