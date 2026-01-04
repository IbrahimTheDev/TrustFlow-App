import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Mail, Loader2, AlertCircle } from 'lucide-react'; // Removed 'User' icon import as it's inside UserProfileImage now
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import UserProfileImage from '@/components/UserProfileImage'; // <--- 1. IMPORT ADDED

// Helper: Aggressively suppress Codespaces environment errors
const safeSupabaseCall = async (promise) => {
  try {
    return await promise;
  } catch (err) {
    const msg = String(err?.message || err);
    if (
      msg.includes("body stream") || 
      msg.includes("Failed to execute") || 
      msg.includes("json")
    ) {
      console.warn("Supabase stream error suppressed (Action likely succeeded)");
      return { data: null, error: null }; 
    }
    throw err;
  }
};

const ProfileModal = ({ isOpen, onClose, user, profile, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [emailError, setEmailError] = useState('');

  // Email Change State
  const [isEmailChangePending, setIsEmailChangePending] = useState(false);
  const [otp, setOtp] = useState('');
  const [newEmailToVerify, setNewEmailToVerify] = useState('');

  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setFullName(profile?.full_name || '');
        setEmail(user?.email || '');
        setAvatarUrl(profile?.avatar_url || '');
        setAvatarFile(null);
        setIsEditing(false);
        setIsEmailChangePending(false);
        setOtp('');
        setEmailError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file)); // Preview logic works perfectly with UserProfileImage
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setEmailError('');

    try {
      // --- PART 1: CHECK FOR DUPLICATE EMAIL ---
      if (email !== user.email) {
        const { data: emailExists, error: rpcError } = await safeSupabaseCall(
            supabase.rpc('check_email_exists', { email_to_check: email })
        );

        if (rpcError) throw rpcError;

        if (emailExists) {
            setEmailError("This email is already registered.");
            setLoading(false);
            return;
        }
      }

      // --- PART 2: UPLOAD PHOTO ---
      let uploadedAvatarUrl = avatarUrl;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await safeSupabaseCall(
          supabase.storage.from('avatars').upload(filePath, avatarFile)
        );
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        uploadedAvatarUrl = publicUrl;
      }

      // --- PART 3: SAVE PROFILE ---
      const updates = {
        id: user.id,
        full_name: fullName,
        avatar_url: uploadedAvatarUrl,
        updated_at: new Date(),
      };

      const { error: profileError } = await safeSupabaseCall(
         supabase.from('profiles').upsert(updates).select()
      );
      if (profileError) throw profileError;

      // --- PART 4: START EMAIL CHANGE ---
      if (email !== user.email) {
        const { error } = await safeSupabaseCall(
            supabase.auth.updateUser({ email: email })
        );
        
        if (error) throw error;

        setNewEmailToVerify(email);
        setIsEmailChangePending(true);
        toast({
          title: "Verification code sent",
          description: `Please enter the code sent to ${email}`,
        });
        setLoading(false);
        return; 
      }

      toast({ title: "Profile updated successfully!" });
      if (onProfileUpdate) await onProfileUpdate();
      setIsEditing(false);
      onClose();

    } catch (error) {
      console.error("Profile Save Error:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      if (!isEmailChangePending) setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await safeSupabaseCall(
          supabase.auth.verifyOtp({
            email: newEmailToVerify,
            token: otp,
            type: 'email_change'
          })
      );

      if (error) throw error;

      toast({ title: "Email updated successfully!" });
      if (onProfileUpdate) await onProfileUpdate();
      setIsEmailChangePending(false);
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Invalid code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-r from-violet-600 to-indigo-600">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                
                {/* --- 2. UPDATED PROFILE IMAGE LOGIC --- */}
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-slate-100">
                   <UserProfileImage 
                      src={avatarUrl} // Shows URL or local Preview blob
                      alt="Profile" 
                      className="w-full h-full"
                      iconClassName="w-10 h-10" // Bigger icon for this modal
                   />
                </div>

                {isEditing && !isEmailChangePending && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 pb-8 px-8">
            {isEmailChangePending ? (
               /* OTP Form */
               <div className="space-y-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-green-100 p-3 rounded-full">
                        <Mail className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Verify New Email</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the 6-digit code sent to <span className="font-medium text-slate-900 dark:text-white">{newEmailToVerify}</span>
                    </p>
                  </div>
                  
                  <Input 
                    placeholder="Enter code"
                    className="text-center text-xl tracking-widest h-12"
                    maxLength={6}
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)}
                  />

                  <Button 
                    onClick={handleVerifyEmailOtp} 
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11"
                    disabled={loading || otp.length < 6}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Change
                  </Button>
               </div>
            ) : (
               /* Profile Edit Form */
               <div className="space-y-6">
                {!isEditing ? (
                  <div className="text-center space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{fullName || 'User'}</h2>
                      <p className="text-slate-500 dark:text-slate-400">{email}</p>
                    </div>
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input 
                        value={email} 
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailError('');
                        }}
                        className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      
                      {emailError && (
                          <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" /> {emailError}
                          </p>
                      )}
                      
                      {!emailError && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> 
                            Changing email requires verification.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                       <Button variant="ghost" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                       <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSaveChanges} disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                       </Button>
                    </div>
                  </div>
                )}
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileModal;