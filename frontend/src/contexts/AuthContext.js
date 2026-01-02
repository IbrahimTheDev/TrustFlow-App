import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, signOut as supabaseSignOut } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      setProfile(data || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session - use getSession which is faster
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
        }
        
        if (mounted) {
          const currentUser = session?.user || null;
          setUser(currentUser);
          setLoading(false);
          setInitialized(true);
          
          // Fetch profile in background (non-blocking)
          if (currentUser) {
            fetchProfile(currentUser.id);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        
        if (!initialized) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, initialized]);

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile: useCallback(() => user && fetchProfile(user.id), [user, fetchProfile]),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
