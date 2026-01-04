import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { signUpWithEmail, verifySignupOtp, signInWithGoogle, signInWithGithub, supabase } from '@/lib/supabase';
import { Heart, Github, Loader2, Mail, AlertCircle } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const Signup = () => {
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Error States ---
  const [error, setError] = useState(''); // General submit error
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const ensureCleanSession = async () => {
      // Only clear if we are starting a fresh signup (not verifying OTP)
      if (step === 'form') {
        await supabase.auth.signOut(); // Wipes the client's memory
        localStorage.clear(); // Wipes the browser's storage
      }
    };
    ensureCleanSession();
  }, [step]);

  useEffect(() => {
    if (!authLoading && user && step !== 'otp') {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, step]);

  // --- Validation Helpers ---
  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setError(''); // Clear general error too
  };

  const handleEmailBlur = () => {
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
    }
  };

  const handlePasswordBlur = () => {
    if (!password) return;
    if (password.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: "Password must be at least 6 characters." }));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validation Logic
    let isValid = true;
    const newErrors = { fullName: '', email: '', password: '' };

    if (!fullName.trim()) { newErrors.fullName = "Full Name is required."; isValid = false; }
    if (!email.trim()) { newErrors.email = "Email is required."; isValid = false; }
    if (!password) { newErrors.password = "Password is required."; isValid = false; }
    if (password && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
      isValid = false;
    }

    if (!isValid) {
      setFieldErrors(newErrors);
      return; 
    }
    if (fieldErrors.email || fieldErrors.password) return;

    setLoading(true);

    try {
      // 2. Database Check (Pre-check for duplicate email)
      const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', { 
        email_to_check: email 
      });

      // If the RPC check fails (system error), we throw a generic system error
      if (rpcError) {
         console.error("RPC Error:", rpcError);
         throw new Error("system_error");
      }

      if (emailExists) {
        // Specific User Error: Duplicate Email
        setFieldErrors(prev => ({ ...prev, email: "This email is already registered." }));
        setLoading(false);
        return; // STOP here
      }

      // 3. Perform Signup
      const { error } = await signUpWithEmail(email, password, fullName);

      if (error) throw error;
      
      setStep('otp');
      toast({
        title: 'Verification code sent',
        description: 'Please check your email.',
      });

    } catch (error) {
      console.error("Signup Error:", error);
      
      const msg = error.message?.toLowerCase() || "";

      // --- SMART ERROR HANDLING ---
      
      // Case A: System Errors (User can't fix these)
      if (
        msg.includes("fetch") || 
        msg.includes("network") || 
        msg.includes("upstream") ||
        msg.includes("connection") ||
        msg.includes("system_error") ||
        msg.includes("body stream") || // Supabase client glitch
        msg.includes("json") || // Supabase client glitch
        msg.includes("failed to execute")
      ) {
        setError("An error occurred. Please try again later.");
      } 
      
      // Case B: Specific User Errors (User CAN fix these)
      else if (msg.includes("password")) {
        setFieldErrors(prev => ({ ...prev, password: "Please choose a stronger password." }));
      }
      else if (msg.includes("valid email")) {
        setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
      }
      // Just in case the RPC check missed it (race condition)
      else if (msg.includes("already registered") || msg.includes("unique constraint")) {
         setFieldErrors(prev => ({ ...prev, email: "This email is already registered." }));
      }
      
      // Case C: The "Catch-All" Fallback
      else {
        setError("An error occurred. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await verifySignupOtp(email, otp);
      if (error) throw error;

      toast({
        title: 'Account verified!',
        description: 'Welcome to TrustFlow.',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: 'Invalid code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleGithubSignup = async () => {
    try {
      const { error } = await signInWithGithub();
      if (error) throw error;
    } catch (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    }
  };

  if (user && step !== 'otp') return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
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
            <CardTitle className="text-2xl">
              {step === 'otp' ? 'Verify your email' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {step === 'otp' 
                ? `We sent a code to ${email}` 
                : 'Start collecting testimonials in minutes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'otp' ? (
              /* OTP FORM VIEW */
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-center py-4">
                    <div className="bg-violet-100 dark:bg-violet-900/30 p-4 rounded-full">
                      <Mail className="w-8 h-8 text-violet-600" />
                    </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-11"
                    disabled={loading || otp.length < 6}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Verify Account
                  </Button>

                  <div className="text-center">
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={() => setStep('form')}
                      className="text-sm text-muted-foreground"
                    >
                      Wrong email? Go back
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* SIGNUP FORM VIEW */
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="space-y-3">
                  <Button variant="outline" className="w-full h-11" onClick={handleGoogleSignup}>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button variant="outline" className="w-full h-11" onClick={handleGithubSignup}>
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

                <form onSubmit={handleSignup} className="space-y-4" noValidate>
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className={fieldErrors.fullName ? "text-red-500" : ""}>Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => {
                          setFullName(e.target.value);
                          setError('');
                      }}
                      onFocus={() => clearFieldError('fullName')}
                      className={fieldErrors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-xs text-red-500 font-small mt-1 animate-in slide-in-from-top-1">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className={fieldErrors.email ? "text-red-500" : ""}>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                      }}
                      onBlur={handleEmailBlur}
                      onFocus={() => clearFieldError('email')}
                      className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 font-small mt-1 animate-in slide-in-from-top-1">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className={fieldErrors.password ? "text-red-500" : ""}>Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                      }}
                      onBlur={handlePasswordBlur}
                      onFocus={() => clearFieldError('password')}
                      className={fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {fieldErrors.password && (
                      <p className="text-xs text-red-500 font-small mt-1 animate-in slide-in-from-top-1">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* General Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-11"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                </form>

                <p className="mt-4 text-xs text-center text-muted-foreground">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>

                <div className="mt-6 text-center text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-violet-600 hover:underline font-medium">
                    Sign in
                  </Link>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;