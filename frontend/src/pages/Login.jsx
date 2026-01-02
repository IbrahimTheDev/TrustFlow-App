import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmail, signInWithMagicLink, signInWithGoogle, signInWithGithub } from '@/lib/supabase';
import { Heart, Mail, Github, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authMode, setAuthMode] = useState('password'); // 'password' or 'magic'
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'magic') {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        setMagicLinkSent(true);
        toast({
          title: 'Magic link sent!',
          description: 'Check your email for the login link.',
        });
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { error } = await signInWithGithub();
      if (error) throw error;
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Redirect if already logged in
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            TrustFlow
          </span>
        </Link>

        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 shadow-xl border-violet-100 dark:border-violet-900/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {magicLinkSent ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto text-violet-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                <p className="text-muted-foreground mb-4">
                  We sent a magic link to <strong>{email}</strong>
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setMagicLinkSent(false)}
                >
                  Try another method
                </Button>
              </div>
            ) : (
              <>
                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleGoogleLogin}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleGithubLogin}
                  >
                    <Github className="w-5 h-5 mr-2" />
                    Continue with GitHub
                  </Button>
                </div>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {authMode === 'password' && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {authMode === 'magic' ? 'Send Magic Link' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => setAuthMode(authMode === 'password' ? 'magic' : 'password')}
                  >
                    {authMode === 'password' 
                      ? 'Use magic link instead' 
                      : 'Use password instead'
                    }
                  </Button>
                </div>
              </>
            )}

            <div className="mt-6 text-center text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-violet-600 hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
