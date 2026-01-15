import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings, Trash2, Globe, Mail, Download, AlertTriangle, 
  CheckCircle, AlertCircle, Save, Loader2, Lock, ShieldAlert,
  X, Check, Crown, Link2, ExternalLink, Copy, RefreshCw, Clock,
  Webhook, Plus, Zap, Play, Pause, MoreVertical, TestTube2,
  ChevronDown, Shield, Info, Sparkles, ChevronUp, Code, Terminal,
  Wifi, WifiOff, Timer, Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';

// --- INTELLIGENT ERROR MESSAGES MAPPING ---
const getHumanReadableError = (statusCode, errorType) => {
  // Handle specific error types first
  if (errorType === 'timeout') {
    return {
      title: "Connection Timed Out",
      message: "The server took too long to respond (>5 seconds).",
      advice: "Check if the external service is online and responsive.",
      icon: Timer,
      color: "orange"
    };
  }
  
  if (errorType === 'connection') {
    return {
      title: "Connection Failed",
      message: "Unable to establish a connection to the server.",
      advice: "Verify the URL is correct and the service is reachable.",
      icon: WifiOff,
      color: "red"
    };
  }

  // Map status codes to human-readable messages
  if (statusCode >= 200 && statusCode < 300) {
    return {
      title: "Connection Successful!",
      message: "Your webhook endpoint is working perfectly.",
      advice: "Real testimonials will now be delivered to this endpoint.",
      icon: CheckCircle,
      color: "green"
    };
  }
  
  if (statusCode === 400) {
    return {
      title: "Format Rejected",
      message: "The external app didn't accept the data format.",
      advice: "Check the webhook documentation for expected payload structure.",
      icon: AlertCircle,
      color: "orange"
    };
  }
  
  if (statusCode === 401 || statusCode === 403) {
    return {
      title: "Permission Denied",
      message: "Authentication failed or access is restricted.",
      advice: "Verify your API keys, tokens, or webhook secrets are correct.",
      icon: Lock,
      color: "red"
    };
  }
  
  if (statusCode === 404) {
    return {
      title: "URL Not Found",
      message: "This webhook endpoint doesn't exist.",
      advice: "Double-check the URL or regenerate it from the external service.",
      icon: AlertTriangle,
      color: "red"
    };
  }
  
  if (statusCode === 408) {
    return {
      title: "Request Timeout",
      message: "The server didn't respond in time.",
      advice: "The external service might be overloaded. Try again later.",
      icon: Timer,
      color: "orange"
    };
  }
  
  if (statusCode === 429) {
    return {
      title: "Rate Limited",
      message: "Too many requests sent to this endpoint.",
      advice: "Wait a few minutes before testing again.",
      icon: Clock,
      color: "orange"
    };
  }
  
  if (statusCode >= 500) {
    return {
      title: "External Server Error",
      message: "The receiving server is experiencing issues.",
      advice: "This is not your fault. The external service needs to fix their server.",
      icon: ShieldAlert,
      color: "red"
    };
  }
  
  // Default fallback
  return {
    title: "Request Failed",
    message: `Received unexpected status: ${statusCode || 'Unknown'}`,
    advice: "Check the technical details below for more information.",
    icon: AlertCircle,
    color: "red"
  };
};

// --- PRETTY RESPONSE VIEWER COMPONENT ---
const PrettyResponseViewer = ({ result, onClose, webhookUrl }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  if (!result) return null;
  
  const errorInfo = getHumanReadableError(result.status_code, result.error_type);
  const StatusIcon = errorInfo.icon;
  
  const colorClasses = {
    green: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-900/50",
      badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-200 dark:border-orange-800",
      icon: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/50",
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
    },
    red: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
    }
  };
  
  const colors = colorClasses[errorInfo.color] || colorClasses.red;
  
  // Platform badge
  const getPlatformBadge = (platform) => {
    const platforms = {
      slack: { name: 'Slack', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
      discord: { name: 'Discord', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
      generic: { name: 'Generic', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    };
    return platforms[platform] || platforms.generic;
  };
  
  const platformInfo = getPlatformBadge(result.platform);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      className={`mt-4 rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden`}
    >
      {/* Main Status Banner */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
            className={`w-14 h-14 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}
          >
            <StatusIcon className={`w-7 h-7 ${colors.icon}`} />
          </motion.div>
          
          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {errorInfo.title}
              </h4>
              {result.success && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </motion.div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {errorInfo.message}
            </p>
            
            {/* Info Badges Row */}
            <div className="flex flex-wrap gap-2">
              {/* Status Code Badge */}
              {result.status_code && (
                <Badge className={colors.badge}>
                  <Wifi className="w-3 h-3 mr-1" />
                  Status: {result.status_code}
                </Badge>
              )}
              
              {/* Latency Badge */}
              {result.latency_ms !== null && result.latency_ms !== undefined && (
                <Badge variant="outline" className="bg-white/50 dark:bg-gray-900/50">
                  <Timer className="w-3 h-3 mr-1" />
                  {result.latency_ms}ms
                </Badge>
              )}
              
              {/* Platform Badge */}
              <Badge className={platformInfo.color}>
                <Send className="w-3 h-3 mr-1" />
                {platformInfo.name}
              </Badge>
              
              {/* Time Badge */}
              {result.timestamp && (
                <Badge variant="outline" className="bg-white/50 dark:bg-gray-900/50">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(result.timestamp).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Advice Section */}
        {!result.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-3 rounded-lg bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  💡 Suggestion
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {errorInfo.advice}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Technical Details Collapsible */}
      <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-5 py-3 flex items-center justify-between bg-gray-100/80 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-200/80 dark:hover:bg-gray-800/80 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Code className="w-4 h-4" />
              Developer Details
            </div>
            <motion.div
              animate={{ rotate: showTechnicalDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-900 dark:bg-gray-950 space-y-4"
          >
            {/* Webhook URL */}
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Webhook URL</p>
              <code className="text-xs text-green-400 break-all">{webhookUrl}</code>
            </div>
            
            {/* Request Payload */}
            {result.request_payload && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Request Payload</p>
                <pre className="text-xs text-cyan-400 bg-gray-950 dark:bg-black p-3 rounded-lg overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(result.request_payload, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Response Body */}
            {result.response_body && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Response Body</p>
                <pre className="text-xs text-yellow-400 bg-gray-950 dark:bg-black p-3 rounded-lg overflow-x-auto max-h-32 overflow-y-auto">
                  {result.response_body}
                </pre>
              </div>
            )}
            
            {/* Error Details */}
            {result.error && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Error Message</p>
                <code className="text-xs text-red-400">{result.error}</code>
              </div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

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

// --- WEBHOOK SECURITY VALIDATION UTILITIES ---
const WebhookValidator = {
  // Strict HTTPS URL validation with SSRF prevention
  validateUrl: (url) => {
    const errors = [];
    
    if (!url || typeof url !== 'string') {
      return { isValid: false, errors: ['URL is required'] };
    }

    const trimmedUrl = url.trim();

    // 1. Must start with https://
    if (!trimmedUrl.startsWith('https://')) {
      errors.push('Only secure HTTPS URLs are allowed');
      return { isValid: false, errors };
    }

    // 2. Basic URL format validation
    try {
      const urlObj = new URL(trimmedUrl);
      
      // 3. Block localhost variations
      const hostname = urlObj.hostname.toLowerCase();
      const localhostPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '[::1]'
      ];
      
      if (localhostPatterns.some(pattern => hostname === pattern || hostname.includes(pattern))) {
        errors.push('Localhost URLs are not allowed for security reasons');
        return { isValid: false, errors };
      }

      // 4. Block private/internal IP ranges (SSRF Prevention)
      const privateIpPatterns = [
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,          // 10.x.x.x
        /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.x.x - 172.31.x.x
        /^192\.168\.\d{1,3}\.\d{1,3}$/,             // 192.168.x.x
        /^169\.254\.\d{1,3}\.\d{1,3}$/,             // Link-local
        /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // Shared Address Space
      ];

      if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
        errors.push('Private/internal IP addresses are not allowed');
        return { isValid: false, errors };
      }

      // 5. Block file:// and other dangerous protocols
      if (urlObj.protocol !== 'https:') {
        errors.push('Only HTTPS protocol is supported');
        return { isValid: false, errors };
      }

      // 6. Basic domain validation (must have at least one dot)
      if (!hostname.includes('.') || hostname.endsWith('.')) {
        errors.push('Please enter a valid domain');
        return { isValid: false, errors };
      }

      // 7. Max URL length check
      if (trimmedUrl.length > 2048) {
        errors.push('URL is too long (max 2048 characters)');
        return { isValid: false, errors };
      }

      return { isValid: true, errors: [], sanitizedUrl: trimmedUrl };

    } catch (e) {
      errors.push('Invalid URL format');
      return { isValid: false, errors };
    }
  },

  // Generate secure random string for webhook secrets
  generateSecret: () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
};

// --- WEBHOOK ITEM COMPONENT (Isolated for AnimatePresence) ---
const WebhookItem = ({ 
  webhook, 
  onToggle, 
  onDelete, 
  onTest,
  onClearTestResult,
  isToggling, 
  isDeleting,
  testingId,
  testResults
}) => {
  const isTestingThis = testingId === webhook.id;
  const testResult = testResults[webhook.id];

  // Check if we have a detailed result (new format) vs simple result (old format)
  const hasDetailedResult = testResult && (testResult.status_code !== undefined || testResult.latency_ms !== undefined);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
      className={`group relative p-4 rounded-xl border transition-all duration-200 ${
        webhook.is_active 
          ? 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md' 
          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Status indicator */}
        <div className={`hidden sm:flex w-2 h-2 rounded-full flex-shrink-0 ${webhook.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        
        {/* URL & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
              {webhook.url}
            </p>
            {!webhook.is_active && (
              <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-300">
                Paused
              </Badge>
            )}
          </div>
          {webhook.description && (
            <p className="text-xs text-muted-foreground truncate">{webhook.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Added {new Date(webhook.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Simple Test Result Badge (for backward compatibility or quick glance) */}
        <AnimatePresence mode="wait">
          {testResult && !hasDetailedResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex-shrink-0"
            >
              <Badge 
                className={`text-[10px] ${
                  testResult.success 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> {testResult.status}</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> {testResult.status || 'Failed'}</>
                )}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTest(webhook)}
                  disabled={isTestingThis || !webhook.is_active}
                  className="h-8 w-8 p-0 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                >
                  {isTestingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send test webhook</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={webhook.is_active}
                    onCheckedChange={() => onToggle(webhook)}
                    disabled={isToggling === webhook.id}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{webhook.is_active ? 'Pause webhook' : 'Activate webhook'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(webhook)}
                  disabled={isDeleting === webhook.id}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  {isDeleting === webhook.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete webhook</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Premium Test Result Viewer */}
      <AnimatePresence>
        {hasDetailedResult && (
          <PrettyResponseViewer 
            result={testResult}
            webhookUrl={webhook.url}
            onClose={() => onClearTestResult(webhook.id)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- WEBHOOK EMPTY STATE ---
const WebhookEmptyState = ({ onAddClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-12 px-4"
  >
    <motion.div 
      className="w-20 h-20 bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center mb-5"
      animate={{ 
        rotate: [0, 5, -5, 0],
        scale: [1, 1.02, 1]
      }}
      transition={{ 
        duration: 4, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <Webhook className="w-10 h-10 text-violet-600 dark:text-violet-400" />
    </motion.div>
    
    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      No Webhooks Configured
    </h4>
    <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
      Connect your space to Zapier, Slack, Make, or any webhook-enabled tool to get 
      <span className="text-violet-600 font-medium"> real-time notifications</span> when new testimonials arrive.
    </p>
    
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {['Zapier', 'Slack', 'Make', 'Discord', 'n8n'].map((tool, i) => (
        <motion.div
          key={tool}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Badge variant="outline" className="text-xs px-3 py-1 bg-white dark:bg-gray-950">
            {tool}
          </Badge>
        </motion.div>
      ))}
    </div>

    <Button onClick={onAddClick} className="bg-violet-600 hover:bg-violet-700 text-white">
      <Plus className="w-4 h-4 mr-2" />
      Add Your First Webhook
    </Button>
  </motion.div>
);

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

  // --- WEBHOOK INTEGRATION STATES ---
  const [webhooks, setWebhooks] = useState([]);
  const [isWebhooksLoading, setIsWebhooksLoading] = useState(true);
  const [showAddWebhookForm, setShowAddWebhookForm] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [webhookUrlError, setWebhookUrlError] = useState('');
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [togglingWebhookId, setTogglingWebhookId] = useState(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState(null);
  const [testingWebhookId, setTestingWebhookId] = useState(null);
  const [webhookTestResults, setWebhookTestResults] = useState({});
  const [webhookToDelete, setWebhookToDelete] = useState(null);
  const [showDeleteWebhookModal, setShowDeleteWebhookModal] = useState(false);

  // API Base URL
  const API_BASE = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL ||'https://trust-flow-app.vercel.app';

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

  // --- FETCH WEBHOOKS ON MOUNT ---
  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const { data, error } = await supabase
          .from('webhook_endpoints')
          .select('*')
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWebhooks(data || []);
      } catch (err) {
        console.error('Failed to fetch webhooks:', err);
        showToast('Failed to load webhooks', 'error');
      } finally {
        setIsWebhooksLoading(false);
      }
    };
    fetchWebhooks();
  }, [spaceId]);

  // --- WEBHOOK URL VALIDATION (Real-time) ---
  const validateWebhookUrl = useCallback((url) => {
    if (!url.trim()) {
      setWebhookUrlError('');
      return false;
    }
    
    const validation = WebhookValidator.validateUrl(url);
    if (!validation.isValid) {
      setWebhookUrlError(validation.errors[0]);
      return false;
    }
    
    setWebhookUrlError('');
    return true;
  }, []);

  // --- WEBHOOK HANDLERS ---
  const handleAddWebhook = async () => {
    // Validate URL
    const validation = WebhookValidator.validateUrl(newWebhookUrl);
    if (!validation.isValid) {
      setWebhookUrlError(validation.errors[0]);
      return;
    }

    setIsAddingWebhook(true);
    try {
      const secretKey = WebhookValidator.generateSecret();
      
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          space_id: spaceId,
          url: validation.sanitizedUrl,
          description: newWebhookDescription.trim() || null,
          secret_key: secretKey,
          is_active: true,
          event_types: ['testimonial.created']
        })
        .select()
        .single();

      if (error) {
        // Handle webhook limit error
        if (error.message?.includes('Webhook limit reached')) {
          showToast('Webhook limit reached! Upgrade your plan to add more.', 'error');
        } else {
          throw error;
        }
        return;
      }

      // Success - add to list with animation
      setWebhooks(prev => [data, ...prev]);
      setNewWebhookUrl('');
      setNewWebhookDescription('');
      setShowAddWebhookForm(false);
      showToast('Webhook added successfully!', 'success');
      
      // Celebrate!
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#8b5cf6', '#10b981']
      });

    } catch (err) {
      console.error('Failed to add webhook:', err);
      showToast('Failed to add webhook. Please try again.', 'error');
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const handleToggleWebhook = async (webhook) => {
    setTogglingWebhookId(webhook.id);
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;

      setWebhooks(prev => prev.map(w => 
        w.id === webhook.id ? { ...w, is_active: !w.is_active } : w
      ));
      
      showToast(
        webhook.is_active ? 'Webhook paused' : 'Webhook activated',
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle webhook:', err);
      showToast('Failed to update webhook', 'error');
    } finally {
      setTogglingWebhookId(null);
    }
  };

  const handleDeleteWebhook = async (webhook) => {
    setWebhookToDelete(webhook);
    setShowDeleteWebhookModal(true);
  };

  const confirmDeleteWebhook = async () => {
    if (!webhookToDelete) return;
    
    setDeletingWebhookId(webhookToDelete.id);
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookToDelete.id);

      if (error) throw error;

      setWebhooks(prev => prev.filter(w => w.id !== webhookToDelete.id));
      showToast('Webhook deleted', 'success');
    } catch (err) {
      console.error('Failed to delete webhook:', err);
      showToast('Failed to delete webhook', 'error');
    } finally {
      setDeletingWebhookId(null);
      setShowDeleteWebhookModal(false);
      setWebhookToDelete(null);
    }
  };

  // Handler to clear test result (for PrettyResponseViewer close button)
  const handleClearTestResult = (webhookId) => {
    setWebhookTestResults(prev => ({ ...prev, [webhookId]: null }));
  };

  const handleTestWebhook = async (webhook) => {
    setTestingWebhookId(webhook.id);
    // Clear previous result for this webhook
    setWebhookTestResults(prev => ({ ...prev, [webhook.id]: null }));

    try {
      // Create a test payload mimicking a real testimonial
      const testPayload = {
        event: 'testimonial.created',
        timestamp: new Date().toISOString(),
        test: true,
        data: {
          id: 'test-' + Date.now(),
          space_id: spaceId,
          respondent_name: 'Test User',
          respondent_email: 'test@example.com',
          content: 'This is a test testimonial from TrustFlow to verify your webhook connection. 🎉 Your integration is working perfectly!',
          rating: 5,
          type: 'text',
          created_at: new Date().toISOString()
        }
      };

      // Use a proxy/edge function to avoid CORS issues
      const response = await fetch(`${API_BASE}/api/webhooks/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhook.url,
          payload: testPayload
        })
      });

      const result = await response.json();

      // Store the full detailed result for PrettyResponseViewer
      setWebhookTestResults(prev => ({
        ...prev,
        [webhook.id]: {
          success: result.success,
          status_code: result.status_code,
          latency_ms: result.latency_ms,
          platform: result.platform,
          timestamp: result.timestamp,
          request_payload: result.request_payload,
          response_body: result.response_body,
          error: result.error,
          error_type: result.error_type
        }
      }));

      if (result.success) {
        showToast('Test webhook sent successfully!', 'success');
        // Celebrate successful test!
        confetti({
          particleCount: 30,
          spread: 30,
          origin: { y: 0.6 },
          colors: ['#10b981', '#8b5cf6']
        });
      } else {
        showToast(result.error || 'Webhook test failed', 'error');
      }
    } catch (err) {
      console.error('Webhook test failed:', err);
      setWebhookTestResults(prev => ({
        ...prev,
        [webhook.id]: { 
          success: false, 
          status_code: null,
          error: 'Network error: Unable to reach the server',
          error_type: 'connection',
          timestamp: new Date().toISOString()
        }
      }));
      showToast('Failed to test webhook', 'error');
    } finally {
      setTestingWebhookId(null);
      // Don't auto-clear - let user dismiss via the close button
      // But still auto-clear after 60 seconds as a fallback
      setTimeout(() => {
        setWebhookTestResults(prev => ({ ...prev, [webhook.id]: null }));
      }, 60000);
    }
  };

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

        {/* 2.5 WEBHOOKS & AUTOMATION */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 rounded-lg">
                  <Webhook className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Webhooks & Automation</CardTitle>
                    <Badge className="bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[10px] px-2 py-0.5 font-semibold border-0">
                      <Zap className="w-3 h-3 mr-1" />
                      NEW
                    </Badge>
                  </div>
                  <CardDescription>Send real-time notifications to Zapier, Slack, or any webhook endpoint.</CardDescription>
                </div>
              </div>
              
              {/* Add Button (visible when webhooks exist) */}
              {webhooks.length > 0 && !showAddWebhookForm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button
                    onClick={() => setShowAddWebhookForm(true)}
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </motion.div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Add Webhook Form (Collapsible) */}
            <AnimatePresence mode="wait">
              {showAddWebhookForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                    {/* Security Notice */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Security:</strong> Only HTTPS URLs are allowed. Localhost and private IPs are blocked to prevent SSRF attacks.
                      </p>
                    </div>

                    {/* URL Input */}
                    <div className="grid gap-2">
                      <Label htmlFor="webhookUrl" className="text-sm font-medium">
                        Webhook URL <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="webhookUrl"
                          value={newWebhookUrl}
                          onChange={(e) => {
                            setNewWebhookUrl(e.target.value);
                            validateWebhookUrl(e.target.value);
                          }}
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          className={`bg-white dark:bg-gray-950 font-mono text-sm pr-10 ${
                            webhookUrlError 
                              ? 'border-red-500 focus-visible:ring-red-500' 
                              : newWebhookUrl && !webhookUrlError 
                                ? 'border-green-500 focus-visible:ring-green-500'
                                : ''
                          }`}
                        />
                        {newWebhookUrl && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {webhookUrlError ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <AnimatePresence mode="wait">
                        {webhookUrlError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xs text-red-500 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {webhookUrlError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Description Input */}
                    <div className="grid gap-2">
                      <Label htmlFor="webhookDesc" className="text-sm font-medium">
                        Description <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input
                        id="webhookDesc"
                        value={newWebhookDescription}
                        onChange={(e) => setNewWebhookDescription(e.target.value)}
                        placeholder="e.g., Send to Slack #testimonials channel"
                        maxLength={100}
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowAddWebhookForm(false);
                          setNewWebhookUrl('');
                          setNewWebhookDescription('');
                          setWebhookUrlError('');
                        }}
                        disabled={isAddingWebhook}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddWebhook}
                        disabled={isAddingWebhook || !newWebhookUrl || !!webhookUrlError}
                        className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                      >
                        {isAddingWebhook ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Add Webhook
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Webhooks List */}
            {isWebhooksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            ) : webhooks.length === 0 && !showAddWebhookForm ? (
              <WebhookEmptyState onAddClick={() => setShowAddWebhookForm(true)} />
            ) : (
              <LayoutGroup>
                <motion.div layout className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {webhooks.map((webhook) => (
                      <WebhookItem
                        key={webhook.id}
                        webhook={webhook}
                        onToggle={handleToggleWebhook}
                        onDelete={handleDeleteWebhook}
                        onTest={handleTestWebhook}
                        onClearTestResult={handleClearTestResult}
                        isToggling={togglingWebhookId}
                        isDeleting={deletingWebhookId}
                        testingId={testingWebhookId}
                        testResults={webhookTestResults}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}

            {/* Webhook Count & Tip */}
            {webhooks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800"
              >
                <p className="text-xs text-muted-foreground">
                  {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured • {webhooks.filter(w => w.is_active).length} active
                </p>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        How it works
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs">
                        When a new testimonial is submitted, we'll send a POST request to each active webhook URL with the testimonial data (name, email, rating, content).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Delete Webhook Confirmation Modal */}
        <AnimatePresence>
          {showDeleteWebhookModal && webhookToDelete && (
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 w-screen h-screen bg-black/40 backdrop-blur-sm"
                onClick={() => setShowDeleteWebhookModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm bg-white dark:bg-gray-950 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[9991] p-6"
              >
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Delete Webhook?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will permanently remove this webhook endpoint. New testimonials will no longer be sent to this URL.
                  </p>
                  <p className="font-mono text-xs text-gray-500 mt-2 truncate px-4">
                    {webhookToDelete.url}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteWebhookModal(false)} 
                    className="flex-1"
                    disabled={deletingWebhookId === webhookToDelete.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteWebhook}
                    disabled={deletingWebhookId === webhookToDelete.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    {deletingWebhookId === webhookToDelete.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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