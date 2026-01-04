import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
// Direct import to bypass helpers
import { signInWithGoogle, signInWithGithub, supabase } from '@/lib/supabase';
import { Heart, Mail, Github, Loader2, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const Login = () => {
  const [authMode, setAuthMode] = useState('password'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', otp: '' });

  const [isFlipped, setIsFlipped] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user && !isFlipped) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, isFlipped]);

  const clearFieldError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setError('');
  };

  const handleEmailBlur = () => {
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
    }
  };

  // --- NUCLEAR ERROR PARSER ---
  // This function is crash-proof. It safely extracts a string message 
  // without triggering "body stream" errors.
  const extractSafeErrorMessage = (err) => {
    console.log("RAW LOGIN ERROR:", err); // Check your console to see what this actually is!

    let msg = "An unexpected error occurred.";

    // 1. Safe extraction logic
    if (typeof err === 'string') {
      msg = err;
    } else if (err?.message && typeof err.message === 'string') {
      msg = err.message;
    } else if (err?.error_description && typeof err.error_description === 'string') {
      msg = err.error_description;
    }

    // 2. Sanitize the message
    const lowerMsg = msg.toLowerCase();

    // Map specific Supabase errors to user-friendly text
    if (lowerMsg.includes("invalid login credentials")) return "Incorrect email or password.";
    if (lowerMsg.includes("email not confirmed")) return "Please verify your email first.";
    if (lowerMsg.includes("user not found")) return "No account found with this email.";
    
    // Catch technical crashes and return a generic "Check credentials"
    if (
        lowerMsg.includes("body stream") || 
        lowerMsg.includes("json") || 
        lowerMsg.includes("unexpected token") ||
        lowerMsg.includes("fetch")
    ) {
        // If the code crashed while reading the error, it's almost certainly a 400 Bad Request (Wrong Password)
        return "Incorrect email or password.";
    }

    return msg;
  };

  const handleLoginSuccess = async (userId) => {
    setIsFlipped(true); 

    try {
      let name = "User";
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        name = user.user_metadata.full_name;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        if (profile?.full_name) name = profile.full_name;
      }
      setWelcomeName(name);
    } catch (err) {
      console.error("Error fetching name:", err);
    }

    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  // --- 1. PASSWORD LOGIN ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!email) { newErrors.email = "Email is required."; isValid = false; }
    if (!password) { newErrors.password = "Password is required."; isValid = false; }

    if (!isValid) {
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    if (fieldErrors.email) return;

    setLoading(true);

    try {
      // Direct Supabase Call
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      await handleLoginSuccess(data.user.id);

    } catch (error) {
      // Use the crash-proof parser
      setError(extractSafeErrorMessage(error));
      setLoading(false);
    }
  };

  // --- 2. SEND OTP ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setFieldErrors(prev => ({ ...prev, email: "Email is required." }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email." }));
      return;
    }

    setLoading(true);

    try {
      const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', { 
        email_to_check: email 
      });

      if (rpcError) throw rpcError;

      if (!emailExists) {
        setFieldErrors(prev => ({ ...prev, email: "This email is not registered." }));
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: false } 
      });

      if (error) throw error;

      setAuthMode('otp-verify');
      toast({ title: 'Login code sent', description: `Check ${email} for your code.` });

    } catch (error) {
      setError(extractSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- 3. VERIFY OTP ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length < 6) {
      setFieldErrors(prev => ({ ...prev, otp: "Please enter the 6-digit code." }));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email', 
      });

      if (error) throw error;

      await handleLoginSuccess(data.user.id);

    } catch (error) {
      const msg = extractSafeErrorMessage(error);
      
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
         setFieldErrors(prev => ({ ...prev, otp: "Invalid or expired code." }));
         setError("Invalid code. Please try again.");
      } else {
         setError(msg);
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      toast({ title: 'Login failed', description: extractSafeErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { error } = await signInWithGithub();
      if (error) throw error;
    } catch (error) {
      toast({ title: 'Login failed', description: extractSafeErrorMessage(error), variant: 'destructive' });
    }
  };
  
  if (user && !isFlipped) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 p-4 perspective-1000">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
        style={{ perspective: 1000 }}
      >
        <Link to="/" className={`flex items-center justify-center gap-2 mb-8 transition-opacity duration-500 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            TrustFlow
          </span>
        </Link>

        {/* 3D FLIP CONTAINER */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* ================= FRONT SIDE (LOGIN FORM) ================= */}
          <Card 
            className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 shadow-xl border-violet-100 dark:border-violet-900/50"
            style={{ backfaceVisibility: "hidden" }} 
          >
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {authMode === 'otp-verify' ? 'Verify Login' : 'Welcome back'}
              </CardTitle>
              <CardDescription>
                {authMode === 'otp-verify' 
                  ? `Enter the code sent to ${email}`
                  : 'Sign in to your account to continue'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              
              {/* --- MODE 1: PASSWORD LOGIN --- */}
              {authMode === 'password' && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full h-11" onClick={handleGoogleLogin}>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Continue with Google
                    </Button>
                    <Button variant="outline" className="w-full h-11" onClick={handleGithubLogin}>
                      <Github className="w-5 h-5 mr-2" />
                      Continue with GitHub
                    </Button>
                  </div>

                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 px-2 text-xs text-muted-foreground">OR</span>
                  </div>

                  <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="email" className={fieldErrors.email ? "text-red-500" : ""}>Email</Label>
                      <Input
                        id="email" type="email" placeholder="you@example.com" value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        onBlur={handleEmailBlur}
                        onFocus={() => clearFieldError('email')}
                        required
                        className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {fieldErrors.email && <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1">{fieldErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className={fieldErrors.password ? "text-red-500" : ""}>Password</Label>
                      <Input
                        id="password" type="password" placeholder="••••••••" value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        onFocus={() => clearFieldError('password')}
                        className={fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {fieldErrors.password && <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1">{fieldErrors.password}</p>}
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 mb-4 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="h-4 w-4" />{error}
                      </div>
                    )}

                    <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Sign In
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('otp-email')} 
                      className="text-sm text-violet-600 hover:underline font-medium inline-flex items-center"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Log in with OTP instead
                    </button>
                  </div>
                </motion.div>
              )}

              {/* --- MODE 2: OTP - ENTER EMAIL --- */}
              {authMode === 'otp-email' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-email" className={fieldErrors.email ? "text-red-500" : ""}>Email</Label>
                      <Input 
                        id="otp-email" type="email" placeholder="Enter your email" value={email} 
                        onChange={(e) => { setEmail(e.target.value); setError(''); }} 
                        onFocus={() => clearFieldError('email')} 
                        className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""} 
                      />
                      {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                    </div>

                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                    <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 h-11" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Login Code
                    </Button>
                  </form>

                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('password')} 
                      className="text-sm text-muted-foreground hover:text-violet-500 hover:text-foreground hover:underline inline-flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      Back to Password Login
                    </button>
                  </div>
                </motion.div>
              )}

              {/* --- MODE 3: OTP - VERIFY CODE --- */}
              {authMode === 'otp-verify' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="flex justify-center py-2">
                     <div className="bg-violet-100 dark:bg-violet-900/30 p-4 rounded-full">
                        <Mail className="w-8 h-8 text-violet-600" />
                     </div>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={otp} 
                        onChange={(val) => { setOtp(val); setError(''); clearFieldError('otp'); }}
                      >
                        <InputOTPGroup className={fieldErrors.otp ? "border-red-500" : ""}>
                          <InputOTPSlot index={0} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                          <InputOTPSlot index={1} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                          <InputOTPSlot index={2} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                          <InputOTPSlot index={3} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                          <InputOTPSlot index={4} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                          <InputOTPSlot index={5} className={fieldErrors.otp ? "border-red-500 text-red-500" : ""} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {fieldErrors.otp && <p className="text-xs text-red-500 text-center font-medium">{fieldErrors.otp}</p>}
                    {error && <p className="text-sm text-red-600 text-center font-medium">{error}</p>}

                    <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 h-11" disabled={loading || otp.length < 6}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Verify & Login
                    </Button>
                  </form>

                  <div className="text-center space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Didn't receive code?{' '}
                      <button type="button" onClick={handleSendOtp} className="text-violet-600 hover:underline">Resend</button>
                    </div>
                    <div>
                      <button type="button" onClick={() => { setAuthMode('otp-email'); setOtp(''); }} className="text-xs text-muted-foreground hover:text-violet-500 hover:underline hover:text-foreground">
                        Change email
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Footer Link */}
              <div className="mt-6 text-center text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-violet-600 hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* ================= BACK SIDE (SUCCESS MESSAGE) ================= */}
          <Card 
            className="absolute inset-0 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-xl border-violet-100 dark:border-violet-900/50 flex flex-col items-center justify-center text-center p-8"
            style={{ 
              backfaceVisibility: "hidden", 
              transform: "rotateY(180deg)" 
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: isFlipped ? 1 : 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isFlipped ? 1 : 0, y: isFlipped ? 0 : 10 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold mb-3 text-slate-800 dark:text-slate-100">Welcome Back!</h2>
              <p className="text-xl text-violet-600 font-medium mb-6">
                {welcomeName || "Member"}
              </p>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 py-2 px-4 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Redirecting to dashboard...
              </div>
            </motion.div>
          </Card>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;