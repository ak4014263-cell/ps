import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  vendor?: any;
  vendor_id?: string;
  permissions?: string[];
}

interface Session {
  user: User;
  token?: string;
  expiresAt?: string;
}

const API_URL = 'http://localhost:3001/api/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage for existing session
    const savedSession = localStorage.getItem('session');
    const savedToken = localStorage.getItem('auth_token');

    if (savedSession && savedToken) {
      try {
        const parsedSession = JSON.parse(savedSession);
        // Verify token is still valid
        verifyToken(savedToken);
        setUser(parsedSession.user);
        setSession(parsedSession);
      } catch (e) {
        console.error('Failed to parse saved session');
        localStorage.removeItem('session');
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        localStorage.removeItem('session');
        localStorage.removeItem('auth_token');
        return null;
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const newSession: Session = {
        user: data.data.user,
        token: data.data.token,
        expiresAt: data.data.expiresAt
      };

      setUser(data.data.user);
      setSession(newSession);
      localStorage.setItem('session', JSON.stringify(newSession));
      localStorage.setItem('auth_token', data.data.token);

      return newSession;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      const newSession: Session = {
        user: data.data.user,
        token: data.data.token,
        expiresAt: data.data.expiresAt
      };

      setUser(data.data.user);
      setSession(newSession);
      localStorage.setItem('session', JSON.stringify(newSession));
      localStorage.setItem('auth_token', data.data.token);

      return newSession;
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const signOut = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('session');
      localStorage.removeItem('auth_token');
      navigate('/auth');
    }
  };

  return { user, session, loading, login, signup, signOut };
};