import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            // Save user and session to Chrome storage for content script
            if (chrome?.storage?.local) {
              chrome.storage.local.set({ 
                user: session.user,
                session: session 
              });
            }
          } else {
            setUser(null);
            // Clear user and session from Chrome storage
            if (chrome?.storage?.local) {
              chrome.storage.local.remove(['user', 'session']);
            }
          }
        }
      );

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, []);

  const checkUser = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        setUser(session.user);
        // Save user and session to Chrome storage for content script
        if (chrome?.storage?.local) {
          chrome.storage.local.set({ 
            user: session.user,
            session: session 
          });
        }
      } else {
        setUser(null);
        // Clear user and session from Chrome storage
        if (chrome?.storage?.local) {
          chrome.storage.local.remove(['user', 'session']);
        }
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setUser(data.user);
      // Save user and session to Chrome storage for content script
      if (chrome?.storage?.local && data.user) {
        chrome.storage.local.set({ 
          user: data.user,
          session: data.session 
        });
      }
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error.message);
      return { user: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      // Clear user and session from Chrome storage
      if (chrome?.storage?.local) {
        chrome.storage.local.remove(['user', 'session']);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};