import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, Trash2, Globe, Mail, Download, AlertTriangle, 
  CheckCircle, AlertCircle, Save, Loader2, Lock, ShieldAlert,
  X, Check, Crown, Link2, ExternalLink, Copy, RefreshCw, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';

// --- SHARED COMPONENTS ---

// 1. Premium Notification Toast (Center Position)
const NotificationToast = ({ message, type, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-10 left-1/2 z-[10000] flex items-center justify-center gap-3 px-6 py-3.5 rounded-full shadow-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 w-auto max-w-[90vw] whitespace-nowrap"
        >
          {type === 'success' ? (
            <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="bg-red-100 dark:bg-red-900/30 p-1 rounded-full shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          )}
          <span className={`text-sm font-medium truncate ${type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 2. NEW: Smart Confirmation Modal (Works for Google/OAuth Users)
// PasswordModal ko hata kar ye lagaya hai.
const ConfirmationModal = ({ isOpen, onClose, onConfirm, isProcessing, actionType, expectedMatch }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (inputValue === expectedMatch) {
      onConfirm();
    } else {
      setError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 w-screen h-screen bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-950 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[9991] p-6"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {actionType === 'delete' ? 'Delete Space?' : 'Change Critical Settings?'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. To confirm, please type <span className="font-mono font-bold text-gray-900 dark:text-gray-200 select-all">{expectedMatch}</span> below.
            </p>
          </div>

          <div className="space-y-4">
            <Input 
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(false);
              }}
              placeholder={`Type ${expectedMatch}`}
              className={error ? "border-red-500 ring-red-500 focus-visible:ring-red-500" : ""}
            />
            {error && <p className="text-xs text-red-500">Value does not match.</p>}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isProcessing || inputValue !== expectedMatch}
                variant="destructive"
                className="flex-1"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "I understand, confirm"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const SettingsTab = ({ space, spaceId, navigate, deleteSpace, updateSpaceState, userEmail }) => {
  // State for editable fields
  const [spaceName, setSpaceName] = useState(space.space_name || '');
  
  // --- SLUG VALIDATION LOGIC ---
  const [spaceSlug, setSpaceSlug] = useState(space.slug || '');
  const [slugStatus, setSlugStatus] = useState('idle');
  const [slugError, setSlugError] = useState('');
  
  // State for toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'success' });
  
  // MODAL STATES (Updated for new logic)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'delete' or 'update_slug'
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // --- CUSTOM DOMAIN STATES (Pro Feature) ---
  const [customDomain, setCustomDomain] = useState(null); // Current domain from DB
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isDomainLoading, setIsDomainLoading] = useState(true);
  const [isDomainSaving, setIsDomainSaving] = useState(false);
  const [isDomainVerifying, setIsDomainVerifying] = useState(false);
  const [showDnsInstructions, setShowDnsInstructions] = useState(false);

  // API Base URL
  const API_BASE = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const showToast = (message, type = 'success') => {
    setNotification({ isVisible: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, isVisible: false })), 3000);
  };

  // --- FETCH CUSTOM DOMAIN ON MOUNT ---
  useEffect(() => {
    const fetchCustomDomain = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/custom-domains/${spaceId}`);
        const data = await res.json();
        if (data.status === 'success' && data.domain) {
          setCustomDomain(data.domain);
        }
      } catch (err) {
        console.error('Failed to fetch custom domain:', err);
      } finally {
        setIsDomainLoading(false);
      }
    };
    fetchCustomDomain();
  }, [spaceId, API_BASE]);

  // --- CUSTOM DOMAIN HANDLERS ---
  const handleAddDomain = async () => {
    if (!newDomainInput.trim()) return;
    
    // Basic validation
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomainInput.trim())) {
      showToast('Please enter a valid domain (e.g., testimonials.yourbrand.com)', 'error');
      return;
    }

    setIsDomainSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/custom-domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: spaceId, domain: newDomainInput.trim() })
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        setCustomDomain(data.domain);
        setNewDomainInput('');
        setShowDnsInstructions(true);
        showToast('Domain added! Configure DNS to complete setup.', 'success');
      } else {
        showToast(data.detail || 'Failed to add domain', 'error');
      }
    } catch (err) {
      showToast('Failed to add domain', 'error');
    } finally {
      setIsDomainSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) return;
    
    setIsDomainVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/custom-domains/verify/${customDomain.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.verified) {
        // DNS verified - now awaiting admin activation
        setCustomDomain(prev => ({ ...prev, status: data.dns_status || 'dns_verified' }));
        showToast('DNS Verified! Your domain will be activated within 24-48 hours.', 'success');
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
      } else {
        setCustomDomain(prev => ({ ...prev, status: 'failed' }));
        showToast(data.message || 'DNS not configured correctly', 'error');
      }
    } catch (err) {
      showToast('Verification failed', 'error');
    } finally {
      setIsDomainVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!customDomain) return;
    
    setIsDomainSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/custom-domains/${customDomain.id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setCustomDomain(null);
        setShowDnsInstructions(false);
        showToast('Domain removed', 'success');
      } else {
        showToast('Failed to remove domain', 'error');
      }
    } catch (err) {
      showToast('Failed to remove domain', 'error');
    } finally {
      setIsDomainSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  // --- LIVE SLUG CHECKER ---
  useEffect(() => {
    const originalSlug = space.slug;
    
    if (spaceSlug === originalSlug) {
      setSlugStatus('idle');
      setSlugError('');
      return;
    }

    if (!spaceSlug || spaceSlug.length < 3) {
      setSlugStatus('error');
      setSlugError('Slug must be at least 3 characters.');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(spaceSlug)) {
        setSlugStatus('error');
        setSlugError('Only lowercase letters, numbers, and dashes allowed.');
        return;
    }

    setSlugStatus('checking');
    setSlugError('');

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('spaces')
          .select('id')
          .eq('slug', spaceSlug)
          .neq('id', spaceId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSlugStatus('taken');
          setSlugError('Slug not available.');
        } else {
          setSlugStatus('available');
          setSlugError('');
        }
      } catch (err) {
        console.error("Slug check failed", err);
        setSlugStatus('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [spaceSlug, space.slug, spaceId]);


  // --- HANDLER: INITIATE SAVE ---
  const initiateGeneralSave = () => {
    if (slugStatus === 'taken' || slugStatus === 'checking' || slugStatus === 'error') return;
    
    // Agar Slug change ho raha hai, to Confirmation Modal kholo
    if (spaceSlug !== space.slug) {
      setConfirmAction('update_slug');
      setShowConfirmModal(true);
    } else {
      // Sirf naam change ho raha hai, seedha save karo
      handleGeneralSave();
    }
  };

  // --- CORE ACTIONS (Save/Delete) ---
  
  const handleGeneralSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from('spaces')
        .update({ space_name: spaceName, slug: spaceSlug })
        .eq('id', spaceId);

      if (error) throw error;
      
      updateSpaceState({ space_name: spaceName, slug: spaceSlug });
      setShowConfirmModal(false); // Close modal if open

      // Success Effect
      setSaveSuccess(true);
      const scalar = 2;
      confetti({
        particleCount: 100, spread: 70, origin: { y: 0.6 },
        colors: ['#8b5cf6', '#10b981', '#3b82f6'],
        disableForReducedMotion: true
      });
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      console.error(error);
      showToast("Something went wrong.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalDelete = async () => {
    setIsProcessingAction(true);
    try {
      await deleteSpace(); 
      navigate('/dashboard'); 
    } catch (error) {
      setShowConfirmModal(false);
      showToast("Delete failed. Please try again.", "error");
      setIsProcessingAction(false);
    }
  };

  // --- ROUTER FOR CONFIRMATION ---
  const onModalConfirm = () => {
    if (confirmAction === 'delete') {
      handleFinalDelete();
    } else if (confirmAction === 'update_slug') {
      handleGeneralSave();
    }
  };

  // --- EXPORT DATA ---
  const handleExportData = async (format = 'csv') => {
    try {
      const { data, error } = await supabase.from('testimonials').select('*').eq('space_id', spaceId);
      if (error) throw error;
      if (!data || data.length === 0) { showToast("No data to export", "error"); return; }

      const cleanedData = data.map(item => ({
        Date: new Date(item.created_at).toLocaleDateString(),
        Name: item.respondent_name || 'Anonymous',
        Email: item.respondent_email || '-',
        Rating: item.rating || '-',
        Message: item.content || '-',
        Type: item.type
      }));

      const headers = Object.keys(cleanedData[0]).join(",");
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + cleanedData.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${spaceSlug}_testimonials.${format === 'excel' ? 'xls' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported as ${format.toUpperCase()}`, "success");
    } catch (error) {
      showToast("Export failed.", "error");
    }
  };

  const getSlugInputClass = () => {
    if (slugStatus === 'checking') return 'border-blue-300 focus-visible:ring-blue-300';
    if (slugStatus === 'available') return 'border-green-500 focus-visible:ring-green-500';
    if (slugStatus === 'taken' || slugStatus === 'error') return 'border-red-500 focus-visible:ring-red-500';
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 px-2 sm:px-0">
      
      <NotificationToast message={notification.message} type={notification.type} isVisible={notification.isVisible} />

      {/* NEW SMART CONFIRMATION MODAL */}
      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => {
            setShowConfirmModal(false);
            setIsProcessingAction(false);
        }}
        onConfirm={onModalConfirm}
        isProcessing={isProcessingAction || isSaving}
        actionType={confirmAction}
        // Agar delete kar rahe hain toh CURRENT slug mangao, agar update kar rahe hain toh bhi CURRENT slug confirm karao
        expectedMatch={space.slug} 
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Space Settings</h2>
        <p className="text-muted-foreground">Manage your space preferences and advanced configurations.</p>
      </div>

      <div className="grid gap-6">
        
        {/* 1. GENERAL SETTINGS */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                <Globe className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">General Settings</CardTitle>
                <CardDescription>Update your space's public identity.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="spaceName">Space Name</Label>
              <Input 
                id="spaceName" value={spaceName} onChange={(e) => setSpaceName(e.target.value)}
                className="max-w-md bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="spaceSlug">Space URL (Slug)</Label>
              <div className="relative max-w-sm">
                <div className="flex items-center">
                  <Badge variant="outline" className="text-muted-foreground font-normal bg-gray-100 dark:bg-gray-800 h-10 px-3 rounded-r-none border-r-0 border-gray-200 dark:border-gray-700 hidden sm:flex">
                    trustflow.app/submit/
                  </Badge>
                  <div className="relative flex-1">
                    <Input 
                        id="spaceSlug" 
                        value={spaceSlug} 
                        onChange={(e) => setSpaceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        className={`sm:rounded-l-none pr-10 bg-white dark:bg-gray-950 transition-colors duration-200 ${getSlugInputClass()}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {slugStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-500 animate-in zoom-in" />}
                        {(slugStatus === 'taken' || slugStatus === 'error') && <X className="w-4 h-4 text-red-500 animate-in zoom-in" />}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 h-4 text-[11px] font-medium">
                    {slugStatus === 'available' && <span className="text-green-600 flex items-center gap-1">Slug is available</span>}
                    {slugStatus === 'taken' && <span className="text-red-600 flex items-center gap-1">Slug taken.</span>}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 py-3">
            <Button 
                onClick={initiateGeneralSave} 
                disabled={isSaving || slugStatus === 'taken' || slugStatus === 'checking' || slugStatus === 'error'} 
                className={`ml-auto transition-all duration-300 ${saveSuccess ? 'bg-green-600 w-32' : 'bg-violet-600 w-36'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saveSuccess ? <>Saved!</> : <>Save Changes</>}
            </Button>
          </CardFooter>
        </Card>

        {/* 1.5 CUSTOM DOMAIN (Pro Feature) */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                  <Link2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Custom Domain</CardTitle>
                    <Badge className="bg-violet-600 text-white text-[10px] px-2 py-0.5 font-semibold border-0">
                      <Crown className="w-3 h-3 mr-1" />
                      PRO
                    </Badge>
                  </div>
                  <CardDescription>Connect your own domain for a branded experience.</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDomainLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading domain settings...</span>
              </div>
            ) : customDomain ? (
              // Domain is configured - show status
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      customDomain.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : customDomain.status === 'dns_verified' 
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : customDomain.status === 'pending' 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                            : customDomain.status === 'disconnected'
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {customDomain.status === 'active' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : customDomain.status === 'dns_verified' ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : customDomain.status === 'pending' ? (
                        <Loader2 className="w-5 h-5 text-yellow-600" />
                      ) : customDomain.status === 'disconnected' ? (
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{customDomain.domain}</p>
                      <p className={`text-xs font-medium ${
                        customDomain.status === 'active' 
                          ? 'text-green-600' 
                          : customDomain.status === 'dns_verified'
                            ? 'text-blue-600'
                            : customDomain.status === 'pending' 
                              ? 'text-yellow-600' 
                              : customDomain.status === 'disconnected'
                                ? 'text-orange-600'
                                : 'text-red-600'
                      }`}>
                        {customDomain.status === 'active' ? '✓ Connected & Active' : 
                         customDomain.status === 'dns_verified' ? '⏳ DNS Verified - Awaiting Activation (24-48 hrs)' :
                         customDomain.status === 'pending' ? '⏳ Pending DNS Verification' : 
                         customDomain.status === 'disconnected' ? '⚠ Disconnected - DNS Issue Detected' :
                         '✗ DNS Configuration Failed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(customDomain.status !== 'active' && customDomain.status !== 'dns_verified') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleVerifyDomain}
                        disabled={isDomainVerifying}
                        className="text-xs"
                      >
                        {isDomainVerifying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Verify
                      </Button>
                    )}
                    {customDomain.status === 'disconnected' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleVerifyDomain}
                        disabled={isDomainVerifying}
                        className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        {isDomainVerifying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Re-verify
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveDomain}
                      disabled={isDomainSaving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                    >
                      {isDomainSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* DNS Instructions (Collapsible) - Show for pending, failed, disconnected */}
                {(customDomain.status === 'pending' || customDomain.status === 'failed' || customDomain.status === 'disconnected') && (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowDnsInstructions(!showDnsInstructions)}
                      className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-400 hover:underline"
                    >
                      📋 How to Setup DNS (Step-by-Step)
                      <motion.span animate={{ rotate: showDnsInstructions ? 180 : 0 }}>▼</motion.span>
                    </button>
                    
                    <AnimatePresence>
                      {showDnsInstructions && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-5">
                            
                            {/* Step 1 */}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-violet-700 dark:text-violet-400">1</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Login to your domain provider</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Go to where you purchased your domain (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.)
                                </p>
                              </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-violet-700 dark:text-violet-400">2</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Navigate to DNS Settings</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Look for "DNS Management", "DNS Records", or "DNS Zone" in your domain settings.
                                </p>
                              </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-violet-700 dark:text-violet-400">3</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">Add a new CNAME record</p>
                                <p className="text-sm text-muted-foreground mt-1 mb-3">
                                  Create a new DNS record with these exact values:
                                </p>
                                
                                {/* DNS Values Table */}
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                                  <div className="grid grid-cols-[100px_1fr_40px] items-center p-3 border-b border-gray-200 dark:border-gray-800">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Type</span>
                                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">CNAME</span>
                                    <span></span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr_40px] items-center p-3 border-b border-gray-200 dark:border-gray-800">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Name</span>
                                    <span className="font-mono text-sm font-semibold text-violet-600 dark:text-violet-400 break-all">
                                      {customDomain.domain.split('.')[0]}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(customDomain.domain.split('.')[0])}>
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr_40px] items-center p-3">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Target</span>
                                    <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400 break-all">
                                      cname.vercel-dns.com
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard('cname.vercel-dns.com')}>
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-violet-700 dark:text-violet-400">4</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Save & Wait for propagation</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Save your DNS record. It can take <strong>5 minutes to 48 hours</strong> for changes to propagate globally.
                                </p>
                              </div>
                            </div>

                            {/* Step 5 */}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">5</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Click "Verify" button above</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Once DNS is configured, click the Verify button to confirm your domain is connected.
                                </p>
                              </div>
                            </div>

                            {/* Help Links */}
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                              <p className="text-xs text-muted-foreground mb-2">📚 DNS Setup Guides:</p>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { name: 'Cloudflare', url: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/' },
                                  { name: 'GoDaddy', url: 'https://www.godaddy.com/help/add-a-cname-record-19236' },
                                  { name: 'Namecheap', url: 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/' },
                                  { name: 'Google Domains', url: 'https://support.google.com/domains/answer/9211383' },
                                ].map((provider) => (
                                  <a 
                                    key={provider.name}
                                    href={provider.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    {provider.name}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* Note */}
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                <strong>Tip:</strong> If you're using Cloudflare, make sure to set the proxy status to "DNS Only" (gray cloud) for the CNAME record.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              // No domain configured - show input
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="customDomain">Your Domain</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="customDomain"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value.toLowerCase().trim())}
                      placeholder="testimonials.yourbrand.com"
                      className="flex-1 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                    />
                    <Button 
                      onClick={handleAddDomain}
                      disabled={isDomainSaving || !newDomainInput.trim()}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {isDomainSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a subdomain you own (e.g., testimonials.yourbrand.com or reviews.mysite.com)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. NOTIFICATIONS & EXPORT (Same as before) */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
                <CardTitle className="text-lg">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-notif">Email Alerts</Label>
                <Switch id="email-notif" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="browser-notif">Browser Notifications</Label>
                <Switch id="browser-notif" checked={browserNotifications} onCheckedChange={setBrowserNotifications} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg"><Download className="w-5 h-5 text-green-600" /></div>
                <CardTitle className="text-lg">Export Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">Download a clean report of your testimonials.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleExportData('csv')}>CSV</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleExportData('excel')}>Excel</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. DANGER ZONE (Updated to use Confirm Action) */}
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div>
                <CardTitle className="text-lg text-red-700 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for this space.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white dark:bg-gray-950 rounded-lg border border-red-100 dark:border-red-900/30 gap-4">
              <div className="text-center sm:text-left">
                <h4 className="font-medium text-red-900 dark:text-red-300">Delete this Space</h4>
                <p className="text-sm text-muted-foreground">Permanently remove this space and all of its data.</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setConfirmAction('delete');
                  setShowConfirmModal(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Space
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default SettingsTab;