import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Star, Video, FileText, Loader2, Smartphone, Tablet, Laptop, 
  Palette, Type, Layout, ArrowLeft, User, CheckCircle, Camera, Upload, RotateCcw,
  Image as ImageIcon, Link as LinkIcon, Plus, Heart, Monitor, Crown, X, Aperture, Check, AlertCircle, Trash2
} from 'lucide-react';
import { PremiumToggle, SectionHeader } from './SharedComponents';
import confetti from 'canvas-confetti';

const EditFormTab = ({ 
  formSettings, 
  setFormSettings, 
  saveFormSettings, 
  saving 
}) => {
  // --- Constants ---
  const DEFAULT_THEME_CONFIG = {
    theme: 'light', 
    accentColor: 'violet', 
    customColor: '#8b5cf6',
    pageBackground: 'gradient-violet', 
    viewMode: 'mobile'
  };

  const accentColors = {
    violet: 'from-violet-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    rose: 'from-rose-600 to-pink-600',
    emerald: 'from-emerald-600 to-teal-600',
    custom: 'custom' 
  };

  const pageBackgrounds = {
    white: 'bg-white',
    dark: 'bg-slate-950',
    'gradient-violet': 'bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20',
    'gradient-blue': 'bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20',
  };

  // --- Derived State (Single Source of Truth) ---
  const themeConfig = formSettings.theme_config || DEFAULT_THEME_CONFIG;

  // Helper to update theme config safely
  const updateThemeConfig = (updates) => {
    setFormSettings(prev => ({
      ...prev,
      theme_config: {
        ...(prev.theme_config || DEFAULT_THEME_CONFIG),
        ...updates
      }
    }));
  };

  // --- LOGO STATE MANAGEMENT ---
  const [logoMode, setLogoMode] = useState(formSettings.logo_url ? 'upload' : 'upload'); 
  const [logoPreview, setLogoPreview] = useState(formSettings.logo_url || null);
  const [logoFile, setLogoFile] = useState(null);
  const [imageError, setImageError] = useState(false); // To track broken links

  // Sync logoPreview if DB changes
  useEffect(() => {
    setLogoPreview(formSettings.logo_url || null);
    setImageError(false); // Reset error state on new logo
  }, [formSettings.logo_url]);

  // Helper to check if URL is internal/blob (to hide it in input)
  const isInternalUrl = (url) => {
    if (!url) return false;
    return url.includes('blob:') || url.includes('supabase') || url.includes('space_logos');
  };

  // --- Interaction State for Preview ---
  const [previewStep, setPreviewStep] = useState('welcome'); 
  const [flowMode, setFlowMode] = useState('text'); 
  const [mockRating, setMockRating] = useState(5);
  const [mockText, setMockText] = useState('');
  const [mockPhoto, setMockPhoto] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [saveStatus, setSaveStatus] = useState('idle');

  // --- Helpers ---

  const getThemeClasses = () => {
    const isDark = themeConfig.theme === 'dark';
    return {
      card: isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-white text-slate-900',
      input: isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      textHeader: isDark ? 'text-white' : 'text-slate-900',
      iconBg: isDark ? 'bg-slate-800' : 'bg-slate-100',
    };
  };

  const getButtonStyle = () => {
    if (themeConfig.accentColor === 'custom') return { background: themeConfig.customColor, color: '#fff' };
    return {}; 
  };
  
  const getButtonClass = () => {
    if (themeConfig.accentColor === 'custom') return `w-full shadow-md hover:opacity-90 transition-opacity text-white`;
    return `w-full shadow-md bg-gradient-to-r ${accentColors[themeConfig.accentColor]} hover:opacity-90 transition-opacity text-white`;
  };

  // 1. FULL RESET (Used by "Reset Default" button) - Resets Theme AND Preview
  const handleReset = () => {
    setPreviewStep('welcome');
    setMockText('');
    setMockRating(5);
    setMockPhoto(null);
    setIsCameraOpen(false);
    setFlowMode('text');

    updateThemeConfig({
        ...DEFAULT_THEME_CONFIG,
        viewMode: themeConfig.viewMode 
    });
  };

  // 2. PREVIEW RESTART (Used by "Submit Another") - Resets ONLY Preview, KEEPS Theme
  const restartPreview = () => {
    setPreviewStep('welcome');
    setMockText('');
    setMockRating(5);
    setMockPhoto(null);
    setIsCameraOpen(false);
    setFlowMode('text');
    // NOTE: We do NOT touch themeConfig here.
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const newUrl = URL.createObjectURL(file);
      setLogoPreview(newUrl);
      setImageError(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormSettings({ ...formSettings, logo_url: null });
    setImageError(false);
  };

  // --- SAVE HANDLER ---
  const handleSave = async () => {
    setSaveStatus('loading');
    
    try {
      const finalSettings = {
        ...formSettings,
        theme_config: themeConfig,
        logo_url: logoPreview 
      };
      
      await saveFormSettings(finalSettings, logoFile);
      
      setSaveStatus('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#8b5cf6', '#a78bfa', '#ffffff']
      });

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);

    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  // --- Flow Navigation ---
  const startVideoFlow = () => { setFlowMode('video'); setPreviewStep('video'); };
  const startPhotoFlow = () => { setFlowMode('photo'); setPreviewStep('photo'); };
  const startTextFlow = () => { setFlowMode('text'); setPreviewStep('text'); };

  const handleBackFromText = () => {
    if (flowMode === 'video') setPreviewStep('video');
    else if (flowMode === 'photo') setPreviewStep('photo');
    else setPreviewStep('welcome');
  };

  const takeMockPhoto = () => {
    setMockPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'); 
    setIsCameraOpen(false);
  };
  const closeCamera = () => setIsCameraOpen(false);
  const removeMockPhoto = () => setMockPhoto(null);

  const themeClasses = getThemeClasses();

  // --- Reusable Logo Component with Fallback & Fixed Color ---
  const FormLogo = () => (
    <div className="flex justify-center mb-6">
      {logoPreview && !imageError ? (
          <img 
            src={logoPreview} 
            alt="Logo" 
            className="w-16 h-16 object-contain" 
            onError={() => setImageError(true)} // Fallback if broken
          />
      ) : (
          // STATIC COLOR for Default Star (Ignore Accent Color)
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white bg-gradient-to-br from-violet-600 to-indigo-600">
            <Star className="w-8 h-8" />
          </div>
      )}
    </div>
  );

  const PremiumHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className={`p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30`}>
        <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {title}
        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
      </h3>
    </div>
  );

  return (
    // UPDATED: Main Container with Mobile-First Order Logic and Responsive Heights
    <div className="flex flex-col xl:flex-row gap-6 xl:h-[calc(100vh-200px)] xl:min-h-[800px]">
      
      {/* RIGHT (Now TOP on Mobile via order-1): Live Interactive Preview 
         Updated classes: order-1 xl:order-2, fixed height on mobile for visibility
      */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative order-1 xl:order-2 h-[650px] xl:h-auto">
        
        {/* Device Toggle Bar */}
        <div className="h-14 border-b bg-white dark:bg-slate-950 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="animate-pulse border-violet-200 text-violet-700 bg-violet-50">Live Preview</Badge>
           </div>
           <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[ { id: 'mobile', icon: Smartphone }, { id: 'tablet', icon: Tablet }, { id: 'desktop', icon: Monitor } ].map((device) => (
                <button key={device.id} onClick={() => updateThemeConfig({ viewMode: device.id })} className={`p-2 rounded-md transition-all ${themeConfig.viewMode === device.id ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <device.icon className="w-4 h-4" />
                </button>
              ))}
           </div>
           {/* Mobile Only: Show simplified device indicator if needed, or hide on very small screens */}
           <div className="sm:hidden text-xs text-muted-foreground">Preview</div>

           {/* Global Reset Button */}
           <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground hover:text-red-500">
             <RotateCcw className="w-3 h-3 mr-1.5" /> Reset
           </Button>
        </div>

        {/* Canvas Area - DEVICE FRAMES */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-4 sm:p-8">
           <motion.div 
             layout
             initial={false}
             animate={{ 
               width: themeConfig.viewMode === 'desktop' ? '1000px' : (themeConfig.viewMode === 'tablet' ? '600px' : '360px'),
               height: themeConfig.viewMode === 'desktop' ? '700px' : (themeConfig.viewMode === 'tablet' ? '800px' : '700px'),
               borderRadius: themeConfig.viewMode === 'mobile' ? '40px' : (themeConfig.viewMode === 'tablet' ? '24px' : '12px'),
             }}
             transition={{ type: "spring", stiffness: 200, damping: 25 }}
             className={`relative shadow-2xl transition-all duration-500 origin-center
               ${themeConfig.viewMode === 'desktop' ? 'bg-slate-800 border-b-[20px] border-slate-700' : 'bg-slate-900 border-[8px] border-slate-900'}
             `}
             style={{ 
               // Adjusted scale for mobile view to ensure it fits in the container
               transform: themeConfig.viewMode === 'tablet' ? 'scale(0.65)' : (themeConfig.viewMode === 'desktop' ? 'scale(0.55)' : 'scale(0.85)'),
             }}
           >
              {/* Screen Content */}
              <div className={`w-full h-full overflow-y-auto overflow-x-hidden relative ${pageBackgrounds[themeConfig.pageBackground]}
                  ${themeConfig.viewMode === 'mobile' ? 'rounded-[32px]' : (themeConfig.viewMode === 'tablet' ? 'rounded-[16px]' : 'rounded-t-[8px]')}
              `}>
                {/* --- MOCK FORM START --- */}
                 <div className="min-h-full w-full flex flex-col items-center justify-center p-6">
                    <AnimatePresence mode="wait">
                       
                       {/* 1. WELCOME STEP */}
                       {previewStep === 'welcome' && (
                          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
                            <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                              <CardContent className="p-8">
                                <FormLogo />
                                <div className="text-center mb-8">
                                  <h1 className={`text-2xl font-bold mb-2 ${themeClasses.textHeader}`}>{formSettings.header_title || 'Header Title'}</h1>
                                  <p className={`${themeClasses.textMuted}`}>{formSettings.custom_message || 'Your message here...'}</p>
                                </div>
                                <div className="space-y-3">
                                  {(formSettings.collect_video ?? true) && (
                                    <Button onClick={startVideoFlow} className={`w-full h-14 text-lg ${getButtonClass()}`} style={getButtonStyle()}>
                                      <Video className="w-5 h-5 mr-2" /> Record a Video
                                    </Button>
                                  )}

                                  {(formSettings.collect_photo) && (
                                    <Button onClick={startPhotoFlow} className={`w-full h-14 text-lg ${getButtonClass()}`} style={getButtonStyle()}>
                                      <ImageIcon className="w-5 h-5 mr-2" /> Upload Photo
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    onClick={startTextFlow} 
                                    variant={(!(formSettings.collect_video ?? true) && !formSettings.collect_photo) ? "default" : "outline"}
                                    className={`w-full h-14 text-lg 
                                      ${(!(formSettings.collect_video ?? true) && !formSettings.collect_photo)
                                        ? getButtonClass() 
                                        : `${themeClasses.input} hover:bg-slate-100 dark:hover:bg-slate-800`
                                      }`}
                                    style={(!(formSettings.collect_video ?? true) && !formSettings.collect_photo) ? getButtonStyle() : {}}
                                  >
                                    <FileText className="w-5 h-5 mr-2" /> 
                                    {(!(formSettings.collect_video ?? true) && !formSettings.collect_photo) ? 'Write a Testimonial' : 'Write Text'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                       )}

                       {/* 2. VIDEO STEP */}
                       {previewStep === 'video' && (
                          <motion.div key="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
                             <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                               <CardContent className="p-6">
                                  <FormLogo />
                                  <div className="flex items-center gap-2 mb-4">
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewStep('welcome')} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Record Your Video</h2>
                                  </div>
                                  <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                                     <div className="text-white text-center p-4">
                                        <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Camera Preview</p>
                                     </div>
                                     <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> 0:00 / 1:00
                                     </div>
                                  </div>
                                  <div className="flex justify-center gap-3">
                                    <Button variant="destructive" size="lg" className="rounded-full w-16 h-16" onClick={() => setPreviewStep('text')}>
                                       <span className="w-6 h-6 bg-white rounded-sm" />
                                    </Button>
                                  </div>
                                  <p className={`text-center text-sm mt-4 ${themeClasses.textMuted}`}>Maximum 60 seconds</p>
                               </CardContent>
                             </Card>
                          </motion.div>
                       )}

                       {/* 2.5 PHOTO STEP */}
                       {previewStep === 'photo' && (
                          <motion.div key="photo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
                             <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                               <CardContent className="p-6">
                                  <FormLogo />
                                  <div className="flex items-center gap-2 mb-4">
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewStep('welcome')} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Upload Photo</h2>
                                  </div>
                                  
                                  {isCameraOpen ? (
                                    <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-6 flex flex-col items-center justify-end pb-6">
                                       <div className="absolute top-4 right-4 z-10">
                                           <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={closeCamera}>
                                               <X className="w-6 h-6" />
                                           </Button>
                                       </div>
                                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                           <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                                       </div>
                                       <p className="text-white text-xs mb-8 absolute top-4 left-4">Camera Active</p>
                                       <Button variant="destructive" size="lg" className="rounded-full w-14 h-14 border-4 border-white" onClick={takeMockPhoto}>
                                       </Button>
                                    </div>
                                  ) : mockPhoto ? (
                                    <div className="relative aspect-square rounded-xl overflow-hidden mb-6 group bg-slate-100">
                                       <img src={mockPhoto} alt="Captured" className="w-full h-full object-cover" />
                                       <button onClick={removeMockPhoto} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors">
                                          <X className="w-4 h-4" />
                                       </button>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                      <div onClick={() => setMockPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80')} className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                         <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                         <span className={`text-xs font-medium ${themeClasses.textHeader}`}>Upload</span>
                                      </div>
                                      <div onClick={() => setIsCameraOpen(true)} className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                         <Aperture className="w-8 h-8 text-slate-400 mb-2" />
                                         <span className={`text-xs font-medium ${themeClasses.textHeader}`}>Camera</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <Button onClick={() => setPreviewStep('text')} className={getButtonClass()} style={getButtonStyle()}>Continue</Button>
                                  <Button variant="ghost" onClick={() => setPreviewStep('text')} className={`w-full mt-2 ${themeClasses.textMuted}`}>Skip</Button>
                               </CardContent>
                             </Card>
                          </motion.div>
                       )}

                       {/* 3. TEXT STEP */}
                       {previewStep === 'text' && (
                          <motion.div key="text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
                             <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                               <CardContent className="p-6">
                                  <FormLogo />
                                  <div className="flex items-center gap-2 mb-4">
                                    <Button variant="ghost" size="icon" onClick={handleBackFromText} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Write Testimonial</h2>
                                  </div>
                                  {formSettings.collect_star_rating && (
                                    <div className="mb-6">
                                       <Label className={`mb-2 block ${themeClasses.textHeader}`}>Your Rating</Label>
                                       <div className="flex gap-1">
                                          {[1,2,3,4,5].map(s => (
                                             <Star key={s} className={`w-8 h-8 ${s <= mockRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} onClick={() => setMockRating(s)} />
                                          ))}
                                       </div>
                                    </div>
                                  )}
                                  <div className="space-y-4">
                                     <div>
                                        <Label className={themeClasses.textHeader}>Your Testimonial</Label>
                                        <Textarea value={mockText} onChange={e => setMockText(e.target.value)} placeholder="Share your experience..." rows={5} className={`mt-2 ${themeClasses.input}`} />
                                     </div>
                                     <Button onClick={() => setPreviewStep('details')} className={getButtonClass()} style={getButtonStyle()}>Continue</Button>
                                  </div>
                               </CardContent>
                             </Card>
                          </motion.div>
                       )}

                       {/* 4. DETAILS STEP */}
                       {previewStep === 'details' && (
                          <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
                             <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                               <CardContent className="p-6">
                                  <FormLogo />
                                  <div className="flex items-center gap-2 mb-4">
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewStep('text')} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Your Details</h2>
                                  </div>
                                  <div className="space-y-4">
                                     <div>
                                        <Label className={themeClasses.textHeader}>Your Name *</Label>
                                        <div className="relative mt-2">
                                           <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                           <Input placeholder="John Doe" className={`pl-9 ${themeClasses.input}`} />
                                        </div>
                                     </div>
                                     <div>
                                        <Label className={themeClasses.textHeader}>Your Email *</Label>
                                        <Input placeholder="john@example.com" className={`mt-2 ${themeClasses.input}`} />
                                     </div>
                                     <div>
                                        <Label className={themeClasses.textHeader}>Role (Optional)</Label>
                                        <Input placeholder="CEO at Company" className={`mt-2 ${themeClasses.input}`} />
                                     </div>
                                     <Button onClick={() => setPreviewStep('success')} className={`mt-4 ${getButtonClass()}`} style={getButtonStyle()}>Submit Testimonial</Button>
                                  </div>
                               </CardContent>
                             </Card>
                          </motion.div>
                       )}

                       {/* 5. SUCCESS STEP */}
                       {previewStep === 'success' && (
                          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                             <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                               <CardContent className="p-8 text-center">
                                  <FormLogo />
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                  >
                                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                  </motion.div>
                                  <h2 className={`text-2xl font-bold mb-2 ${themeClasses.textHeader}`}>
                                    {formSettings.thank_you_title || 'Thank You!'}
                                  </h2>
                                  <p className={`mb-6 ${themeClasses.textMuted}`}>
                                    {formSettings.thank_you_message || 'Your testimonial has been submitted successfully.'}
                                  </p>
                                  <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                      Want to collect testimonials like this?
                                    </p>
                                    <span className="text-violet-600 font-medium hover:underline cursor-pointer">
                                      Create your own Wall of Love →
                                    </span>
                                  </div>
                                  <div className="mt-4">
                                    {/* USE restartPreview HERE TO AVOID RESETTING THEME */}
                                    <Button variant="outline" onClick={restartPreview} className={themeClasses.input}>Submit Another</Button>
                                  </div>
                               </CardContent>
                             </Card>
                          </motion.div>
                       )}

                    </AnimatePresence>
                    
                    {/* FOOTER */}
                    <div className="text-center mt-6">
                      <p className={`text-sm ${themeClasses.textMuted}`}>Powered by <span className="font-medium text-violet-600">TrustFlow</span></p>
                    </div>

                 </div>
                 {/* --- MOCK FORM END --- */}
              </div>
           </motion.div>
        </div> 
      </div>

      {/* LEFT (Now BOTTOM on Mobile via order-2): Designer Controls 
         Updated classes: order-2 xl:order-1, fixed height on mobile for scrollability
      */}
      <Card className="w-full xl:w-[400px] flex flex-col border-violet-100 dark:border-violet-900/20 shadow-xl shadow-violet-500/5 bg-white/80 backdrop-blur-sm overflow-hidden flex-shrink-0 order-2 xl:order-1 h-[600px] xl:h-full">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5 text-violet-600 fill-violet-100" />
            Form Designer
          </CardTitle>
          <CardDescription>Customize the collection experience</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
           {/* Logo Section */}
           <div>
            <PremiumHeader icon={ImageIcon} title="Logo & Branding" />
            
            <div className="flex items-center justify-between mb-4">
               {/* Logo Preview in Control Panel */}
               <div className="h-16 w-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden shrink-0 relative group">
                  {logoPreview && !imageError ? (
                    <>
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                      {/* Hover Overlay for removal visual hint (optional, but button below is better) */}
                    </>
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
               </div>

               {/* Remove Button (Visible if logo exists) */}
               {logoPreview && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2">
                     <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
               )}
            </div>

            <Tabs defaultValue="upload" value={logoMode} onValueChange={setLogoMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload" className="text-xs"><Upload className="w-3 h-3 mr-2" /> Upload</TabsTrigger>
                <TabsTrigger value="url" className="text-xs"><LinkIcon className="w-3 h-3 mr-2" /> URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-0">
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-xs font-medium transition-colors">
                        {logoPreview ? 'Change File' : 'Choose File'}
                      </div>
                      <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight">Rec: <span className="font-medium text-slate-700">400x400px PNG</span> (Transparent).</p>
                  </div>
              </TabsContent>
              
              <TabsContent value="url" className="mt-0">
                <Input 
                  placeholder="https://example.com/logo.png" 
                  // If it's an internal/blob URL, show empty to keep it clean for user input
                  value={isInternalUrl(formSettings.logo_url) ? '' : (formSettings.logo_url || '')} 
                  onChange={(e) => { 
                    setLogoPreview(e.target.value); 
                    setFormSettings({...formSettings, logo_url: e.target.value});
                    // If user types, we assume they are overriding the file upload
                    setLogoFile(null);
                    setImageError(false);
                  }} 
                  className="text-xs" 
                />
                <p className="text-[10px] text-muted-foreground mt-2">Paste a direct link to your logo image.</p>
              </TabsContent>
            </Tabs>
          </div>
          <Separator />
          
          {/* Visual Theme */}
          <div>
            <PremiumHeader icon={Palette} title="Visual Theme" />
            <div className="space-y-5">
               <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Accent Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.keys(accentColors).filter(k => k !== 'custom').map(color => (
                      <button key={color} onClick={() => updateThemeConfig({ accentColor: color })} className={`w-8 h-8 rounded-full bg-gradient-to-br ${accentColors[color]} transition-all shadow-sm ${themeConfig.accentColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105 hover:shadow-md'}`} />
                    ))}
                    <button onClick={() => updateThemeConfig({ accentColor: 'custom' })} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border border-slate-200 ${themeConfig.accentColor === 'custom' ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 bg-white' : 'bg-slate-50 hover:bg-slate-100'}`} style={themeConfig.accentColor === 'custom' ? { background: themeConfig.customColor } : {}}>
                      {themeConfig.accentColor !== 'custom' && <Plus className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {themeConfig.accentColor === 'custom' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                         <div className="flex items-center gap-3">
                            <input type="color" value={themeConfig.customColor} onChange={(e) => updateThemeConfig({ customColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0" />
                            <Input value={themeConfig.customColor} onChange={(e) => updateThemeConfig({ customColor: e.target.value })} className="h-8 text-xs font-mono uppercase" />
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
               <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Card Theme</Label>
                  <PremiumToggle id="theme-mode" current={themeConfig.theme} onChange={(val) => updateThemeConfig({ theme: val })} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
               </div>
               <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Page Background</Label>
                   <PremiumToggle id="bg-mode" current={themeConfig.pageBackground} onChange={(val) => updateThemeConfig({ pageBackground: val })} options={[{ label: 'Gradient', value: 'gradient-violet' }, { label: 'Blue', value: 'gradient-blue' }, { label: 'Clean', value: 'white' }, { label: 'Dark', value: 'dark' }]} />
               </div>
            </div>
          </div>
          <Separator />
          
          {/* Text Content */}
          <div>
            <SectionHeader icon={Type} title="Text Content" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="header_title" className="text-xs">Header Title</Label>
                <Input id="header_title" value={formSettings.header_title} onChange={(e) => setFormSettings({ ...formSettings, header_title: e.target.value })} placeholder="Share your experience..." className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_message" className="text-xs">Custom Message</Label>
                <Textarea id="custom_message" value={formSettings.custom_message} onChange={(e) => setFormSettings({ ...formSettings, custom_message: e.target.value })} placeholder="We appreciate your feedback..." rows={3} className="bg-slate-50 resize-none" />
              </div>
            </div>
          </div>
          <Separator />

          {/* Thank You Page */}
          <div>
            <SectionHeader icon={Heart} title="Thank You Page" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thank_you_title" className="text-xs">Title</Label>
                <Input 
                  id="thank_you_title" 
                  value={formSettings.thank_you_title || 'Thank you!'} 
                  onChange={(e) => setFormSettings({ ...formSettings, thank_you_title: e.target.value })} 
                  className="bg-slate-50" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thank_you_message" className="text-xs">Message</Label>
                <Textarea 
                  id="thank_you_message" 
                  value={formSettings.thank_you_message || 'Your testimonial has been submitted.'} 
                  onChange={(e) => setFormSettings({ ...formSettings, thank_you_message: e.target.value })} 
                  rows={2} 
                  className="bg-slate-50 resize-none" 
                />
              </div>
            </div>
          </div>
          <Separator />
          
          {/* Features */}
          <div>
            <PremiumHeader icon={Layout} title="Form Features" />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-sm">Video Testimonials</Label>
                  <p className="text-[10px] text-muted-foreground">Allow users to record videos</p>
                </div>
                <Switch checked={formSettings.collect_video ?? true} onCheckedChange={(checked) => setFormSettings({ ...formSettings, collect_video: checked })} />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-sm">Photo/Image</Label>
                  <p className="text-[10px] text-muted-foreground">Allow image uploads</p>
                </div>
                <Switch checked={formSettings.collect_photo ?? false} onCheckedChange={(checked) => setFormSettings({ ...formSettings, collect_photo: checked })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-sm">Star Rating</Label>
                  <p className="text-[10px] text-muted-foreground">Collect 1-5 star ratings</p>
                </div>
                <Switch checked={formSettings.collect_star_rating} onCheckedChange={(checked) => setFormSettings({ ...formSettings, collect_star_rating: checked })} />
              </div>
            </div>
          </div>

          <div className="pt-4">
             {/* ANIMATED SAVE BUTTON */}
             <Button 
                onClick={handleSave} 
                disabled={saveStatus !== 'idle'} 
                className={`w-full text-white transition-all duration-300 relative overflow-hidden ${
                  saveStatus === 'success' 
                    ? 'bg-green-600 hover:bg-green-600' 
                    : saveStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-600'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {saveStatus === 'loading' && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  {saveStatus === 'success' && (
                     <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Check className="w-5 h-5" />
                     </motion.div>
                  )}
                  {saveStatus === 'error' && (
                     <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <AlertCircle className="w-5 h-5" />
                     </motion.div>
                  )}
                  {saveStatus === 'idle' && (
                     <span>Save Changes</span>
                  )}
                  {saveStatus === 'success' && (
                     <span>Saved!</span>
                  )}
                  {saveStatus === 'error' && (
                     <span>Unable to Save</span>
                  )}
                </div>
             </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default EditFormTab;