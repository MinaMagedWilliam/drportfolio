import React, { createContext, useContext, useState, useEffect } from 'react';
import supabaseService from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    // Keep React in sync with Supabase auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabaseService.client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await supabaseService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const session = await supabaseService.login(email, password);
    const userData = await supabaseService.getCurrentUser();
    setUser(userData);
    return session;
  };

  const logout = async () => {
    await supabaseService.logout();
    setUser(null);
  };

  const register = async (email, password, name) => {
    const session = await supabaseService.createAccount(email, password, name);
    const userData = await supabaseService.getCurrentUser();
    setUser(userData);
    return session;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
