import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Zap, Copy, Layout, Grid3X3, GalleryHorizontal, StretchHorizontal, AlignJustify,
  Palette, Type, MessageSquare, Quote, Hand, Square, Circle, AlignLeft,
  Check, X, Sparkles, RefreshCw, Gauge, ChevronLeft, ChevronRight, Star, BadgeCheck,
  Smartphone, Tablet, Laptop, Save, RotateCcw, Shuffle, Heading,
  Maximize2, Minimize2, Layers, Info, Loader2, AlertCircle, ChevronDown, CheckCircle, AlertTriangle, Bell, Clock, MapPin,
  ExternalLink, Crown, Link as LinkIcon
} from 'lucide-react';
import { StylishVideoPlayer, PremiumToggle, SectionHeader, CARD_WIDTH, GAP, PADDING_X } from './SharedComponents';
import confetti from 'canvas-confetti';

// --- CSS for Smooth Continuous Scroll Animation ---
const smoothScrollPreviewStyles = `
  @keyframes smoothMarqueePreview {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .smooth-scroll-preview-container {
    display: flex;
    width: max-content;
    animation-name: smoothMarqueePreview;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .smooth-scroll-preview-container:hover {
    animation-play-state: paused;
  }
`;

// --- Premium Fonts List ---
const PREMIUM_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", 
  "Roboto Condensed", "Source Sans Pro", "Oswald", "Raleway", "PT Sans", 
  "Merriweather", "Noto Sans", "Nunito", "Prompt", "Work Sans", 
  "Playfair Display", "Rubik", "Arimo", "Mukta", "Kanit", "IBM Plex Sans", 
  "Crimson Text", "DM Sans", "Bitter", "Josefin Sans", "Anton", "Cabin", 
  "Fjalla One", "Inconsolata"
];

// --- Helper: Sleek Toggle ---
const ToggleSwitch = ({ isOn, onToggle }) => (
    <div 
        onClick={onToggle} 
        className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${isOn ? 'bg-violet-600' : 'bg-slate-300'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isOn ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
);

const WidgetTab = ({ 
  testimonials, 
  spaceId, 
  activeTab,
  widgetSettings,      // <--- Prop from Parent
  setWidgetSettings,   // <--- Prop from Parent
  saveWidgetSettings,   // <--- Prop from Parent
  DEFAULT_WIDGET_SETTINGS
}) => {
  
  // -- State --
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [showScrollWarning, setShowScrollWarning] = useState(true);
  const [showPopupPreview, setShowPopupPreview] = useState(false);
  const [previewPopupIndex, setPreviewPopupIndex] = useState(0);
  
  // -- Save & Feedback State --
  const [saveStatus, setSaveStatus] = useState('idle'); 
  const [feedbackMsg, setFeedbackMsg] = useState(''); 
  const [feedbackType, setFeedbackType] = useState(''); 

  // -- Font Picker State --
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [previewFont, setPreviewFont] = useState('Inter'); 
  const fontListRef = useRef(null);

  // -- Device & Logic State --
  const [deviceMode, setDeviceMode] = useState('desktop'); 
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [maskWidth, setMaskWidth] = useState('100%');
  const [isSnapping, setIsSnapping] = useState(false);
  const containerRef = useRef(null);
  const [replayTrigger, setReplayTrigger] = useState(0);

  // -- Mobile Check --
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 1024) setShowMobileWarning(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // -- Font Loader --
  useEffect(() => {
    if (!previewFont) return;
    const fontName = previewFont.replace(/\s+/g, '+');
    const linkId = `font-${fontName}`;
    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
        document.head.appendChild(link);
    }
  }, [previewFont]);

  // -- Font Sync --
  useEffect(() => {
    if (!isFontOpen && widgetSettings?.headingFont) {
        setPreviewFont(widgetSettings.headingFont);
    }
  }, [widgetSettings?.headingFont, isFontOpen]);

  // -- Click Outside Font Picker --
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fontListRef.current && !fontListRef.current.contains(event.target)) setIsFontOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -- Data Processing --
  const displayedTestimonials = useMemo(() => {
    
    let result = [...testimonials].filter(t => t.is_liked);
    if (widgetSettings?.shuffle) result = result.sort(() => Math.random() - 0.5);
    return result.slice(0, widgetSettings?.maxCount || 12);
  }, [testimonials, widgetSettings?.shuffle, widgetSettings?.maxCount]);

    // -- Popup Checks --
    useEffect(() => {
      if (!widgetSettings?.popupsEnabled) {
          setShowPopupPreview(false);
          return;
      }
      const loop = setInterval(() => {
          setShowPopupPreview(prevIsVisible => {
              if (!prevIsVisible) {
                  setPreviewPopupIndex(prevIndex => (prevIndex + 1) % displayedTestimonials.length);
              }
              return !prevIsVisible;
          });
      }, 4000); 
  
      return () => clearInterval(loop);
    }, [widgetSettings?.popupsEnabled, displayedTestimonials.length]);

  // -- Seamless Loop --
  const carouselItems = useMemo(() => {
    if (widgetSettings?.layout !== 'carousel' || displayedTestimonials.length === 0) return displayedTestimonials;
    const clones = displayedTestimonials.slice(0, visibleCount + 1);
    return [...displayedTestimonials, ...clones];
  }, [displayedTestimonials, widgetSettings?.layout, visibleCount]);

  const isCarousel = widgetSettings?.layout === 'carousel';
  const isPagedGrid = widgetSettings?.layout === 'grid' && displayedTestimonials.length > (visibleCount * (widgetSettings?.gridRows || 2));

  // -- Auto Scroll --
  useEffect(() => {
    let interval;
    if (widgetSettings?.autoScroll && isCarousel) {
        interval = setInterval(() => handleNext(), (widgetSettings.scrollSpeed || 3) * 1000);
    }
    return () => clearInterval(interval);
  }, [widgetSettings?.autoScroll, widgetSettings?.scrollSpeed, isCarousel, carouselIndex]);

  // -- Reset Scroll Warning --
  useEffect(() => {
    if (widgetSettings?.layout === 'carousel') setShowScrollWarning(true);
  }, [widgetSettings?.layout]);

  // -- Resize Logic --
  useEffect(() => {
    if ((widgetSettings?.layout !== 'carousel' && !isPagedGrid) || !containerRef.current) {
        if(containerRef.current) setMaskWidth('100%');
        return;
    }
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableWidth = rect.width - PADDING_X;
        let cardWidthToUse = getCardWidthPx(); 
        const count = Math.floor((availableWidth + GAP) / (cardWidthToUse + GAP));
        const safeCount = Math.max(1, count);
        setVisibleCount(safeCount);
        if (isCarousel) {
             const exactWidth = (safeCount * cardWidthToUse) + ((safeCount - 1) * GAP);
             setMaskWidth(`${exactWidth + 8}px`);
        } else {
             setMaskWidth('100%');
        }
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [widgetSettings?.layout, widgetSettings?.cardSize, deviceMode, isPagedGrid, activeTab]); 

  useEffect(() => { setReplayTrigger(prev => prev + 1); }, [widgetSettings?.animation, widgetSettings?.speed, widgetSettings?.layout]);

  const handleNext = () => {
    if (isCarousel) {
        if (carouselIndex >= displayedTestimonials.length) {
            setIsSnapping(true);
            setCarouselIndex(0);
            requestAnimationFrame(() => requestAnimationFrame(() => { setIsSnapping(false); setCarouselIndex(1); }));
        } else {
            setCarouselIndex(prev => prev + 1);
        }
    } else {
        const total = displayedTestimonials.length;
        const jump = visibleCount * (widgetSettings?.gridRows || 2);
        if (carouselIndex + jump >= total) setCarouselIndex(0);
        else setCarouselIndex(prev => prev + jump);
    }
  };

  const handlePrev = () => {
    if (isCarousel) {
        if (carouselIndex <= 0) {
            setIsSnapping(true);
            setCarouselIndex(displayedTestimonials.length);
            requestAnimationFrame(() => requestAnimationFrame(() => { setIsSnapping(false); setCarouselIndex(displayedTestimonials.length - 1); }));
        } else {
            setCarouselIndex(prev => prev - 1);
        }
    } else {
        const total = displayedTestimonials.length;
        const jump = visibleCount * (widgetSettings?.gridRows || 2);
        if (carouselIndex - jump < 0) setCarouselIndex(Math.max(0, total - jump));
        else setCarouselIndex(prev => prev - jump);
    }
  };

  const handleReset = () => {
      setDeviceMode('desktop');
      setSaveStatus('idle');
      setFeedbackMsg('');
  };

  const getCardWidthPx = () => {
      if (deviceMode === 'mobile') return 260;
      if (widgetSettings?.cardSize === 'compact') return 260;
      if (widgetSettings?.cardSize === 'large') return 340;
      return CARD_WIDTH; 
  };

  // --- SAVE HANDLER (Calls Parent Function) ---
  const handleSave = async () => {
    // 1. Client-Side Validation
    if (widgetSettings.showHeading && (!widgetSettings.headingText || widgetSettings.headingText.trim() === '')) {
        setSaveStatus('error');
        setFeedbackType('user');
        setFeedbackMsg('Heading text cannot be empty!');
        setTimeout(() => { setSaveStatus('idle'); setFeedbackMsg(''); }, 3000);
        return;
    }

    if (widgetSettings.showSubheading && (!widgetSettings.subheadingText || widgetSettings.subheadingText.trim() === '')) {
        setSaveStatus('error');
        setFeedbackType('user');
        setFeedbackMsg('Subheading text cannot be empty!');
        setTimeout(() => { setSaveStatus('idle'); setFeedbackMsg(''); }, 3000);
        return;
    }

    // 2. Call Parent Save Function
    setSaveStatus('loading');
    setFeedbackMsg('');
    
    try {
        await saveWidgetSettings(widgetSettings);

        // 3. Success
        setSaveStatus('success');
        confetti({
            particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#8b5cf6', '#a78bfa', '#ffffff']
        });
        setTimeout(() => setSaveStatus('idle'), 3000);

    } catch (error) {
        // 4. Error
        setSaveStatus('error');
        setFeedbackType('system');
        setFeedbackMsg('Something went wrong. Please try again.');
        setTimeout(() => { setSaveStatus('idle'); setFeedbackMsg(''); }, 4000);
    }
  };

  const copyEmbedCode = () => {
    const code = `<script src="${window.location.origin}/embed.js" data-space-id="${spaceId}"></script>`;
    navigator.clipboard.writeText(code);

    confetti({
      particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#8b5cf6', '#a78bfa', '#ffffff']
  });
  };

  // Styles Helpers...
  const getPreviewCardStyles = (index) => {
    const { cardTheme, layout, corners, shadow, border, hoverEffect, carouselSameSize } = widgetSettings;
    let classes = 'p-6 transition-all duration-300 flex flex-col relative ';
    
    if (layout === 'masonry') classes += 'h-auto ';
    else if (layout === 'carousel') {
        if (carouselSameSize) classes += '!h-full ';
        else classes += 'h-auto ';
    } else {
        classes += '!h-full '; 
    }
    
    if (corners === 'sharp') classes += 'rounded-none ';
    else if (corners === 'round') classes += 'rounded-3xl ';
    else classes += 'rounded-xl '; 

    if (shadow === 'none') classes += 'shadow-none ';
    else if (shadow === 'light') classes += 'shadow-sm ';
    else if (shadow === 'strong') classes += 'shadow-xl ';
    else classes += 'shadow-md '; 

    if (hoverEffect === 'lift') classes += 'hover:-translate-y-1 hover:shadow-lg ';
    else if (hoverEffect === 'scale') classes += 'hover:scale-[1.02] hover:shadow-lg ';
    else if (hoverEffect === 'glow') classes += 'hover:shadow-violet-500/20 hover:border-violet-300 ';

    if (cardTheme === 'dark') {
      classes += 'bg-slate-900 text-slate-100 ';
      classes += border ? 'border border-slate-800 ' : 'border-0 ';
    } else {
      classes += 'bg-white text-slate-800 ';
      classes += border ? 'border border-slate-100 ' : 'border-0 ';
    }

    if (layout === 'masonry') classes += 'break-inside-avoid mb-6 inline-block w-full ';
    else if (layout === 'carousel') classes += 'flex-shrink-0 ';
    else if (layout === 'list') classes += 'w-full mb-4 ';
    return classes;
  };

  const getNameSizeClass = () => {
    switch (widgetSettings.nameSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getAnimationVariants = () => {
    const { animation, speed } = widgetSettings;
    const durations = { slow: 0.8, normal: 0.5, fast: 0.3 };
    const dur = durations[speed] || 0.5;
    return { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: dur } } };
  };

  // --- Animation Variants for Feedback Bubble ---
  const bubbleVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 5, scale: 0.9 }
  };

  // --- Shake Animation for Error Button ---
  const buttonVariants = {
    idle: { x: 0 },
    error: { x: [0, -5, 5, -5, 5, 0], transition: { duration: 0.4 } }
  };
  
  // --- NEW: Popup Preview Component (Floating Card) ---
  // --- NEW: Popup Preview Component (Floating Card) ---
  const PopupPreviewCard = () => {
    const positionClass = widgetSettings?.popupPosition === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4';
    
    // UPDATED: Use dynamic index instead of always [0]
    // Agar koi testimonial nahi hai, to fallback dummy data dikhao
    const item = displayedTestimonials[previewPopupIndex] || displayedTestimonials[0] || { 
        respondent_name: "Sarah J.", 
        content: "Love this product! It saved me so much time.", 
        rating: 5,
        respondent_photo_url: null 
    };
    
    return (
        <motion.div
            // ... (baaki animations same rahenge)
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`absolute z-50 max-w-[280px] w-full p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 flex gap-3 items-start
                ${widgetSettings.cardTheme === 'dark' ? 'bg-slate-900/90 text-white' : 'bg-white/90 text-slate-900'}
                ${positionClass}
            `}
        >
            {/* ... (Andar ka UI code same rahega) ... */}
            <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                    <AvatarImage src={item.respondent_photo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-xs">
                        {item.respondent_name?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                {/* ... */}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm truncate">{item.respondent_name}</span>
                    <div className="flex text-amber-400">
                        {[...Array(item.rating || 5)].map((_, i) => <Star key={i} className="w-2 h-2 fill-current" />)}
                    </div>
                </div>
                <p className="text-xs opacity-90 line-clamp-2 leading-tight">{item.content}</p>
                <div className="flex items-center gap-1 mt-1.5 opacity-60">
                    <p className="text-[9px] font-medium">{widgetSettings.popupMessage || 'Verified Customer'}</p>
                    <span className="text-[8px]">•</span>
                    <p className="text-[9px]">Just now</p>
                </div>
            </div>
        </motion.div>
    );
  };

  if (!widgetSettings) return null; // Safe guard

  return (
    // UPDATED: Main Container with Mobile-First Order Logic and Responsive Heights
    <div className="flex flex-col xl:flex-row gap-6 xl:h-[calc(100vh-200px)] xl:min-h-[800px] relative">
      {/* Mobile Suggestion */}
      {showMobileWarning && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-violet-600 text-white p-2 text-xs flex justify-between items-center shadow-lg">
              <span>Switch to desktop mode for the best designer experience.</span>
              <button onClick={() => setShowMobileWarning(false)}><X className="w-4 h-4" /></button>
          </div>
      )}
      
      {/* Right Column (Now TOP on Mobile via order-1): Live Canvas */}
      <div className="flex-1 flex flex-col min-w-0 order-1 xl:order-2 h-[650px] xl:h-auto">
         <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                   <Badge variant="outline" className="bg-white/50 backdrop-blur border-violet-200 text-violet-700 animate-pulse">
                      Live Preview
                   </Badge>
                   <span className="text-xs text-muted-foreground hidden md:inline">{displayedTestimonials.length} active</span>
               </div>
               
               <div className="flex items-center bg-slate-100 rounded-lg p-1 border">
                   {[
                       { mode: 'desktop', icon: Laptop },
                       { mode: 'tablet', icon: Tablet },
                       { mode: 'mobile', icon: Smartphone }
                   ].map(dev => (
                       <button
                           key={dev.mode}
                           onClick={() => setDeviceMode(dev.mode)}
                           className={`p-1.5 rounded-md transition-all ${deviceMode === dev.mode ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                           <dev.icon className="w-4 h-4" />
                       </button>
                   ))}
               </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-red-500 h-8 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                </Button>
            </div>
         </div>

         <Card className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 overflow-hidden relative shadow-inner flex items-center justify-center p-4">
            
            <motion.div 
                layout
                initial={false}
                animate={{
                    width: deviceMode === 'mobile' ? '375px' : deviceMode === 'tablet' ? '768px' : '100%',
                    height: '100%',
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`relative bg-white shadow-2xl transition-all duration-500 overflow-hidden flex flex-col
                    ${deviceMode === 'mobile' ? 'rounded-[30px] border-[8px] border-slate-900' : ''}
                    ${deviceMode === 'tablet' ? 'rounded-[20px] border-[8px] border-slate-900' : 'rounded-lg border border-slate-200'}
                `}
            >
                {deviceMode === 'mobile' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-50" />}
                <AnimatePresence>
                 {widgetSettings.popupsEnabled && showPopupPreview && (
                   <PopupPreviewCard />
                            )}
                </AnimatePresence>
                <CardContent 
                ref={containerRef}
                className={`h-full w-full overflow-y-auto custom-scrollbar relative
                    ${widgetSettings.theme === 'dark' ? 'bg-slate-950' : widgetSettings.theme === 'transparent' ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]' : 'bg-slate-50'}
                    ${widgetSettings.wallPadding === 'small' ? 'p-4' : widgetSettings.wallPadding === 'large' ? 'p-12' : 'p-8'}
                `}
                >
                <div className="min-h-full flex flex-col justify-center">

                    {/* Headings */}
                    {(widgetSettings.showHeading || widgetSettings.showSubheading) && (
                        <div className="text-center mb-8 space-y-2">
                            {widgetSettings.showHeading && (
                                <h2 
                                    style={{
                                        fontFamily: previewFont, 
                                        color: widgetSettings.headingColor,
                                        fontWeight: widgetSettings.headingBold ? 'bold' : 'normal'
                                    }}
                                    className="text-2xl md:text-3xl transition-all duration-200"
                                >
                                    {widgetSettings.headingText}
                                </h2>
                            )}
                            {widgetSettings.showSubheading && (
                                <p 
                                    style={{
                                        fontFamily: previewFont, 
                                        color: widgetSettings.subheadingColor
                                    }}
                                    className="text-sm md:text-lg transition-all duration-200"
                                >
                                    {widgetSettings.subheadingText}
                                </p>
                            )}
                        </div>
                    )}

                    {displayedTestimonials.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Star className="w-16 h-16 opacity-20 mb-4" />
                        <p>No testimonials available.</p>
                        </div>
                    ) : (
                        <>
                        {/* Inject smooth scroll styles */}
                        <style>{smoothScrollPreviewStyles}</style>
                        
                        {isCarousel && !widgetSettings.smoothContinuousScroll && (
                            <>
                            <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-110 transition-all"><ChevronLeft className="w-5 h-5 text-slate-700" /></button>
                            <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-110 transition-all"><ChevronRight className="w-5 h-5 text-slate-700" /></button>
                            </>
                        )}

                        <div 
                            key={`${widgetSettings.layout}-${widgetSettings.cardSize}-${widgetSettings.smoothContinuousScroll}`} 
                            className="relative mx-auto transition-all duration-300 overflow-hidden"
                            style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%', maxWidth: '1200px' }}
                        >
                            {/* Smooth Continuous Scroll Mode for Preview */}
                            {widgetSettings.smoothContinuousScroll && (widgetSettings.layout === 'carousel' || widgetSettings.layout === 'grid') ? (
                                <div 
                                    className="smooth-scroll-preview-container py-4 px-2"
                                    style={{ 
                                        animationDuration: `${(displayedTestimonials.length * (getCardWidthPx() + GAP)) / (widgetSettings.smoothScrollSpeed || 30)}s`,
                                    }}
                                >
                                    {/* Original items */}
                                    {displayedTestimonials.map((testimonial, i) => (
                                        <div
                                            key={`orig-${testimonial.id}-${i}`}
                                            className={`${getPreviewCardStyles(i)} flex-shrink-0 mx-3`}
                                            style={{ width: `${getCardWidthPx()}px` }}
                                        >
                                            <div className="flex items-center gap-1 mb-3">
                                                {[...Array(testimonial.rating || 5)].map((_, idx) => (
                                                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                ))}
                                            </div>
                                            <div className="flex-1 mb-4">
                                                <p className={`text-sm leading-relaxed line-clamp-6 whitespace-pre-line
                                                    ${widgetSettings.testimonialStyle === 'bubble' 
                                                        ? (widgetSettings.cardTheme === 'dark' ? 'p-4 bg-slate-800 text-slate-200 rounded-lg' : 'p-4 bg-slate-100 text-slate-800 rounded-lg') 
                                                        : ''}
                                                    ${widgetSettings.testimonialStyle === 'quote' 
                                                        ? (widgetSettings.cardTheme === 'dark' ? 'pl-4 border-l-4 border-violet-400 italic text-slate-300' : 'pl-4 border-l-4 border-violet-400 italic text-slate-600') 
                                                        : ''}
                                                    ${widgetSettings.testimonialStyle === 'clean' ? 'opacity-90' : ''}
                                                `}>
                                                    {testimonial.content}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 pt-4 border-t border-dashed border-gray-200/10 mt-auto">
                                                <Avatar className="w-12 h-12 border border-white/20 overflow-hidden shrink-0">
                                                    <AvatarImage src={testimonial.respondent_photo_url} className="w-full h-full object-cover scale-110" />
                                                    <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className={`font-bold ${getNameSizeClass()} flex items-center gap-1.5`}>
                                                        {testimonial.respondent_name}
                                                        <BadgeCheck className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                                                    </div>
                                                    <div className="text-[10px] opacity-70">{testimonial.respondent_role || 'Verified User'}</div>
                                                </div>
                                            </div>
                                            {widgetSettings.showBranding !== false && (
                                                <div className="absolute top-2 right-2">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${widgetSettings.cardTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Star className="w-2.5 h-2.5 fill-violet-500 text-violet-500" /> TrustFlow
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {/* Cloned items for seamless loop */}
                                    {displayedTestimonials.map((testimonial, i) => (
                                        <div
                                            key={`clone-${testimonial.id}-${i}`}
                                            className={`${getPreviewCardStyles(i)} flex-shrink-0 mx-3`}
                                            style={{ width: `${getCardWidthPx()}px` }}
                                        >
                                            <div className="flex items-center gap-1 mb-3">
                                                {[...Array(testimonial.rating || 5)].map((_, idx) => (
                                                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                ))}
                                            </div>
                                            <div className="flex-1 mb-4">
                                                <p className={`text-sm leading-relaxed line-clamp-6 whitespace-pre-line ${widgetSettings.testimonialStyle === 'clean' ? 'opacity-90' : ''}`}>
                                                    {testimonial.content}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 pt-4 border-t border-dashed border-gray-200/10 mt-auto">
                                                <Avatar className="w-12 h-12 border border-white/20 overflow-hidden shrink-0">
                                                    <AvatarImage src={testimonial.respondent_photo_url} className="w-full h-full object-cover scale-110" />
                                                    <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className={`font-bold ${getNameSizeClass()} flex items-center gap-1.5`}>
                                                        {testimonial.respondent_name}
                                                        <BadgeCheck className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                                                    </div>
                                                    <div className="text-[10px] opacity-70">{testimonial.respondent_role || 'Verified User'}</div>
                                                </div>
                                            </div>
                                            {widgetSettings.showBranding !== false && (
                                                <div className="absolute top-2 right-2">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${widgetSettings.cardTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Star className="w-2.5 h-2.5 fill-violet-500 text-violet-500" /> TrustFlow
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                            <motion.div
                                layout 
                                className={`
                                ${isCarousel 
                                    ? `flex gap-6 py-4 px-2 ${widgetSettings.carouselSameSize ? 'items-stretch' : 'items-center'}` 
                                    : ''
                                } 
                                ${widgetSettings.layout === 'grid' 
                                    ? (deviceMode === 'mobile' 
                                        ? 'flex flex-col gap-4' 
                                        : deviceMode === 'tablet' 
                                            ? 'grid grid-cols-2 gap-4' 
                                            : 'grid md:grid-cols-2 lg:grid-cols-3 gap-6') 
                                    : ''}
                                ${widgetSettings.layout === 'masonry' 
                                    ? (deviceMode === 'mobile' 
                                        ? 'flex flex-col gap-4' 
                                        : deviceMode === 'tablet' 
                                            ? 'columns-2 gap-4' 
                                            : 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6') 
                                    : ''}
                                ${widgetSettings.layout === 'list' ? 'max-w-2xl mx-auto flex flex-col gap-4' : ''}
                                `}
                                style={isCarousel ? { 
                                    transform: `translateX(-${carouselIndex * (getCardWidthPx() + GAP)}px)`, 
                                    transition: isSnapping ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' 
                                } : {}}
                            >
                                <AnimatePresence mode='wait'>
                                    {/* Use 'carouselItems' for infinite cloning, else standard list */}
                                    {(isCarousel ? carouselItems : displayedTestimonials).map((testimonial, i) => {
                                        let isFocused = false;
                                        if (isCarousel && widgetSettings.carouselFocusZoom) {
                                            const relativeIndex = i - carouselIndex;
                                            const centerOffset = Math.floor(visibleCount / 2);
                                            if (relativeIndex === centerOffset) isFocused = true;
                                        }

                                        return (
                                            <motion.div
                                                key={`${testimonial.id}-${i}-${replayTrigger}`}
                                                custom={i}
                                                initial="hidden"
                                                animate={isFocused ? { scale: 1.05, opacity: 1, zIndex: 10 } : "visible"}
                                                variants={getAnimationVariants()}
                                                className={getPreviewCardStyles(i)}
                                                style={{
                                                    width: isCarousel ? `${getCardWidthPx()}px` : undefined,
                                                    transformOrigin: 'center center'
                                                }}
                                            >
                                                <div className="flex items-center gap-1 mb-3">
                                                    {[...Array(testimonial.rating || 5)].map((_, idx) => (
                                                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                    ))}
                                                </div>

                                                <div className="flex-1 mb-4 flex flex-col">
                                                    {testimonial.type === 'video' && testimonial.video_url ? (
                                                    <StylishVideoPlayer videoUrl={testimonial.video_url} corners={widgetSettings.corners === 'sharp' ? 'rounded-none' : 'rounded-xl'} />
                                                    ) : (
                                                    <p className={`text-sm leading-relaxed line-clamp-6 whitespace-pre-line
                                                        ${widgetSettings.testimonialStyle === 'bubble' 
                                                            ? (widgetSettings.cardTheme === 'dark' ? 'p-4 bg-slate-800 text-slate-200 rounded-lg relative' : 'p-4 bg-slate-100 text-slate-800 rounded-lg relative') 
                                                            : ''}
                                                        ${widgetSettings.testimonialStyle === 'quote' 
                                                            ? (widgetSettings.cardTheme === 'dark' ? 'pl-4 border-l-4 border-violet-400 italic text-slate-300' : 'pl-4 border-l-4 border-violet-400 italic text-slate-600') 
                                                            : ''}
                                                        ${widgetSettings.testimonialStyle === 'clean' ? 'opacity-90' : ''}
                                                    `}>
                                                        {testimonial.content}
                                                    </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 pt-4 border-t border-dashed border-gray-200/10 mt-auto">
                                                    <Avatar className="w-12 h-12 border border-white/20 overflow-hidden shrink-0">
                                                        <AvatarImage src={testimonial.respondent_photo_url} className="w-full h-full object-cover scale-110" />
                                                        <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className={`font-bold ${getNameSizeClass()} flex items-center gap-1.5`}>
                                                            {testimonial.respondent_name}
                                                            <BadgeCheck className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                                                        </div>
                                                        <div className="text-[10px] opacity-70">{testimonial.respondent_role || 'Verified User'}</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Powered by TrustFlow Badge - Top Right */}
                                                {widgetSettings.showBranding !== false && (
                                                    <div className="absolute top-2 right-2">
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${widgetSettings.cardTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                            <Star className="w-2.5 h-2.5 fill-violet-500 text-violet-500" /> TrustFlow
                                                        </span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                            )}
                        </div>
                        
                        {/* See More Button Preview */}
                        {widgetSettings.seeMoreButtonText && (
                            <div className="flex justify-center mt-6">
                                <a 
                                    href={widgetSettings.seeMoreButtonLink || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all ${
                                        widgetSettings.cardTheme === 'dark' 
                                            ? 'bg-violet-600 hover:bg-violet-500 text-white' 
                                            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white'
                                    }`}
                                >
                                    {widgetSettings.seeMoreButtonText}
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}
                        </>
                    )}
                </div>
                </CardContent>
            </motion.div>
         </Card>
      </div>

      {/* Left Column (Now BOTTOM on Mobile via order-2): Control Deck */}
      <Card className="w-full xl:w-[420px] flex flex-col border-violet-100 dark:border-violet-900/20 shadow-xl shadow-violet-500/5 bg-white/80 backdrop-blur-sm overflow-hidden flex-shrink-0 order-2 xl:order-1 h-[600px] xl:h-full">
        <CardHeader className="pb-4 border-b bg-white/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-violet-600 fill-violet-100" />
                Widget Designer
              </CardTitle>
              <CardDescription>Customize your wall of love</CardDescription>
            </div>
            
            <div className="flex gap-2 items-center relative">
                 <Button size="sm" onClick={copyEmbedCode} className="bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20 text-xs h-8">
                    <Copy className="w-3.5 h-3.5 mr-1.5 " /> Copy Code
                 </Button>
                 
                 {/* FEEDBACK BUBBLE */}
                 <AnimatePresence>
                    {feedbackMsg && (
                        <motion.div
                            variants={bubbleVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`absolute right-0 top-10 z-50 px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 border 
                                ${feedbackType === 'user' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}
                            `}
                        >
                            {feedbackType === 'user' ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {feedbackMsg}
                            {/* Tiny triangle pointer */}
                            <div className={`absolute -top-1 right-8 w-2 h-2 rotate-45 border-l border-t bg-inherit border-inherit`} />
                        </motion.div>
                    )}
                 </AnimatePresence>

                 {/* Animated Save Button */}
                 <motion.div
                    variants={buttonVariants}
                    animate={saveStatus === 'error' ? 'error' : 'idle'}
                 >
                     <Button 
                        size="sm"
                        onClick={handleSave} 
                        disabled={saveStatus === 'loading'}
                        className={`h-8 transition-all duration-300 relative overflow-hidden ${
                          saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                          saveStatus === 'error' ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 
                          'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {saveStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {saveStatus === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                          {saveStatus === 'error' && <RotateCcw className="w-3.5 h-3.5" />}
                          {saveStatus === 'idle' && <Save className="w-3.5 h-3.5" />}
                          <span>
                              {saveStatus === 'success' ? 'Saved' : 
                               saveStatus === 'error' ? 'Retry' : 
                               saveStatus === 'loading' ? 'Saving' : 'Save'}
                          </span>
                        </div>
                     </Button>
                 </motion.div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-thin scrollbar-thumb-violet-200 scrollbar-track-transparent">
          {/* --- NEW: FOMO POPUPS SECTION (PREMIUM) --- */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <SectionHeader icon={Bell} title="Social Proof Popups" />
                <Badge className="text-[10px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-sm flex items-center gap-1 px-2 py-0.5">
                   <Star className="w-2.5 h-2.5 fill-current" /> PRO
                </Badge>
             </div>
             
             <div className={`p-4 rounded-xl border transition-all duration-300 ${widgetSettings.popupsEnabled ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex items-center justify-between mb-4">
                     <div className="space-y-0.5">
                         <Label className="text-sm font-semibold text-slate-800">Enable Popups</Label>
                         <p className="text-[10px] text-slate-500">Show recent reviews in corner</p>
                     </div>
                     <ToggleSwitch 
                        isOn={widgetSettings.popupsEnabled} 
                        onToggle={() => setWidgetSettings({...widgetSettings, popupsEnabled: !widgetSettings.popupsEnabled})}
                     />
                 </div>

                 {/* Collapsible Settings */}
                 <AnimatePresence>
                    {widgetSettings.popupsEnabled && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4 pt-2 border-t border-violet-200/50"
                        >
                            <div>
                                <Label className="text-xs text-slate-500 mb-2 block">Position</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setWidgetSettings({...widgetSettings, popupPosition: 'bottom-left'})}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all gap-1 ${widgetSettings.popupPosition === 'bottom-left' ? 'bg-white border-violet-500 text-violet-700 shadow-sm' : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}
                                    >
                                        <div className="w-8 h-6 bg-slate-100 rounded border border-slate-200 relative">
                                            <div className="absolute bottom-1 left-1 w-2 h-2 bg-violet-500 rounded-sm" />
                                        </div>
                                        Bottom Left
                                    </button>
                                    <button 
                                        onClick={() => setWidgetSettings({...widgetSettings, popupPosition: 'bottom-right'})}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all gap-1 ${widgetSettings.popupPosition === 'bottom-right' ? 'bg-white border-violet-500 text-violet-700 shadow-sm' : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}
                                    >
                                        <div className="w-8 h-6 bg-slate-100 rounded border border-slate-200 relative">
                                            <div className="absolute bottom-1 right-1 w-2 h-2 bg-violet-500 rounded-sm" />
                                        </div>
                                        Bottom Right
                                    </button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500 mb-2 block">Display Message</Label>
                                <Input 
                                    value={widgetSettings.popupMessage} 
                                    onChange={(e) => setWidgetSettings({...widgetSettings, popupMessage: e.target.value})}
                                    className="h-8 text-xs bg-white"
                                    placeholder="Someone just shared love!"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</Label>
                                        <span className="text-[10px] font-mono text-violet-600">{widgetSettings.popupDuration}s</span>
                                    </div>
                                    <Slider 
                                        value={[widgetSettings.popupDuration]} min={3} max={15} step={1}
                                        onValueChange={(val) => setWidgetSettings({...widgetSettings, popupDuration: val[0]})}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Label className="text-[10px] text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Gap</Label>
                                        <span className="text-[10px] font-mono text-violet-600">{widgetSettings.popupGap}s</span>
                                    </div>
                                    <Slider 
                                        value={[widgetSettings.popupGap]} min={5} max={60} step={5}
                                        onValueChange={(val) => setWidgetSettings({...widgetSettings, popupGap: val[0]})}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
             </div>
          </div>

          <Separator className="bg-slate-100" />
          {/* 1. Layout Structure */}
          <div className="space-y-4">
            <SectionHeader icon={Layout} title="Layout Structure" />
            <PremiumToggle 
              id="layout"
              current={widgetSettings.layout}
              onChange={(val) => { setWidgetSettings({ ...widgetSettings, layout: val }); setCarouselIndex(0); }}
              options={[
                { label: 'Grid', value: 'grid', icon: Grid3X3 },
                { label: 'Masonry', value: 'masonry', icon: GalleryHorizontal },
                { label: 'Carousel', value: 'carousel', icon: StretchHorizontal },
                { label: 'List', value: 'list', icon: AlignJustify },
              ]}
            />
            
            <AnimatePresence>
                {widgetSettings.layout === 'carousel' && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}>
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg mt-2">
                            <Label className="text-xs text-slate-600">Equal Height Cards</Label>
                            <ToggleSwitch 
                                isOn={widgetSettings.carouselSameSize} 
                                onToggle={() => setWidgetSettings({...widgetSettings, carouselSameSize: !widgetSettings.carouselSameSize})} 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          <Separator className="bg-slate-100" />

          {/* 2. Content & Placement */}
          <div className="space-y-4">
             <SectionHeader icon={Layers} title="Content & Placement" />
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label className="text-xs text-slate-500 mb-2 block">Placement</Label>
                    <PremiumToggle 
                        id="placement"
                        current={widgetSettings.placement}
                        onChange={(val) => setWidgetSettings({...widgetSettings, placement: val})}
                        options={[ { label: 'Body', value: 'body' }, { label: 'Section', value: 'section' } ]}
                    />
                 </div>
                 <div>
                    <Label className="text-xs text-slate-500 mb-2 block">Wall Padding</Label>
                    <PremiumToggle 
                        id="padding"
                        current={widgetSettings.wallPadding}
                        onChange={(val) => setWidgetSettings({...widgetSettings, wallPadding: val})}
                        options={[ { label: 'S', value: 'small' }, { label: 'M', value: 'medium' }, { label: 'L', value: 'large' } ]}
                    />
                 </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                 <div>
                     <div className="flex justify-between mb-2">
                         <Label className="text-xs font-medium text-slate-600">Max Testimonials</Label>
                         <span className="text-xs font-bold text-violet-600">{widgetSettings.maxCount}</span>
                     </div>
                     <Slider 
                        value={[widgetSettings.maxCount]} min={4} max={12} step={1}
                        onValueChange={(val) => setWidgetSettings({...widgetSettings, maxCount: val[0]})}
                     />
                 </div>
             </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 3. Typography */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <SectionHeader icon={Heading} title="Typography & Headers" />
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">PREMIUM</Badge>
             </div>
             
             {/* Heading Control */}
             <div className="space-y-3">
                 <div className="flex items-center justify-between">
                     <Label className="text-xs font-bold text-slate-700">Main Heading</Label>
                     <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-400">{widgetSettings.showHeading ? 'Shown' : 'Hidden'}</span>
                         <ToggleSwitch 
                            isOn={widgetSettings.showHeading} 
                            onToggle={() => setWidgetSettings({...widgetSettings, showHeading: !widgetSettings.showHeading})}
                         />
                     </div>
                 </div>
                 {widgetSettings.showHeading && (
                     <div className="space-y-2 pl-2 border-l-2 border-violet-100 animate-in slide-in-from-left-2">
                         <Input 
                           value={widgetSettings.headingText} 
                           onChange={(e) => setWidgetSettings({...widgetSettings, headingText: e.target.value})}
                           className={`h-8 text-xs ${!widgetSettings.headingText ? 'border-red-300 bg-red-50' : ''}`}
                           placeholder="Heading Text"
                         />
                         <div className="flex gap-2 relative" ref={fontListRef}>
                             <input 
                               type="color" value={widgetSettings.headingColor} 
                               onChange={(e) => setWidgetSettings({...widgetSettings, headingColor: e.target.value})}
                               className="h-8 w-8 rounded cursor-pointer border-none"
                             />
                             <div className="flex-1 relative">
                                <button 
                                  onClick={() => setIsFontOpen(!isFontOpen)}
                                  className="w-full h-8 flex items-center justify-between px-2 text-xs border rounded bg-white hover:bg-slate-50"
                                >
                                  <span style={{ fontFamily: widgetSettings.headingFont }}>{widgetSettings.headingFont}</span>
                                  <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                                <AnimatePresence>
                                  {isFontOpen && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                      className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded shadow-xl z-50 scrollbar-thin"
                                    >
                                      {PREMIUM_FONTS.map(font => (
                                        <div 
                                          key={font}
                                          className="px-3 py-1.5 text-xs hover:bg-violet-50 cursor-pointer flex items-center justify-between"
                                          style={{ fontFamily: font }}
                                          onClick={() => {
                                            setWidgetSettings({...widgetSettings, headingFont: font});
                                            setIsFontOpen(false);
                                          }}
                                          onMouseEnter={() => setPreviewFont(font)} 
                                          onMouseLeave={() => setPreviewFont(widgetSettings.headingFont)}
                                        >
                                          {font}
                                          {widgetSettings.headingFont === font && <Check className="w-3 h-3 text-violet-600" />}
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                             </div>
                             <Button 
                               variant="outline" size="icon" className={`h-8 w-8 ${widgetSettings.headingBold ? 'bg-slate-100' : ''}`}
                               onClick={() => setWidgetSettings({...widgetSettings, headingBold: !widgetSettings.headingBold})}
                             >
                                 <span className="font-bold">B</span>
                             </Button>
                         </div>
                     </div>
                 )}
             </div>

             {/* Subheading Control */}
             <div className="space-y-3 pt-2">
                 <div className="flex items-center justify-between">
                     <Label className="text-xs font-bold text-slate-700">Subheading</Label>
                     <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-400">{widgetSettings.showSubheading ? 'Shown' : 'Hidden'}</span>
                         <ToggleSwitch 
                            isOn={widgetSettings.showSubheading} 
                            onToggle={() => setWidgetSettings({...widgetSettings, showSubheading: !widgetSettings.showSubheading})}
                         />
                     </div>
                 </div>
                 {widgetSettings.showSubheading && (
                     <div className="space-y-2 pl-2 border-l-2 border-violet-100 animate-in slide-in-from-left-2">
                         <Input 
                           value={widgetSettings.subheadingText} 
                           onChange={(e) => setWidgetSettings({...widgetSettings, subheadingText: e.target.value})}
                           className={`h-8 text-xs ${!widgetSettings.subheadingText ? 'border-red-300 bg-red-50' : ''}`}
                           placeholder="Subheading Text"
                         />
                         <div className="flex gap-2">
                             <input 
                               type="color" value={widgetSettings.subheadingColor} 
                               onChange={(e) => setWidgetSettings({...widgetSettings, subheadingColor: e.target.value})}
                               className="h-8 w-8 rounded cursor-pointer border-none"
                             />
                         </div>
                     </div>
                 )}
             </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 4. Card Styling */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <SectionHeader icon={Palette} title="Card Styling" />
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">PREMIUM</Badge>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-2">
                     <Shuffle className="w-4 h-4 text-slate-500" />
                     <Label className="text-xs text-slate-600">Shuffle Content</Label>
                 </div>
                 <Button 
                    size="sm" variant={widgetSettings.shuffle ? 'default' : 'outline'} 
                    onClick={() => setWidgetSettings({...widgetSettings, shuffle: !widgetSettings.shuffle})}
                    className={`h-6 w-10 p-0 rounded-full ${widgetSettings.shuffle ? 'bg-violet-600' : ''}`}
                 >
                    {widgetSettings.shuffle ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                 </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                  <Label className="text-xs text-slate-500 mb-2 block">Card Size</Label>
                  <PremiumToggle 
                    id="cardSize"
                    current={widgetSettings.cardSize}
                    onChange={(val) => setWidgetSettings({ ...widgetSettings, cardSize: val })}
                    options={[
                      { label: 'Compact', value: 'compact', icon: Minimize2 },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Large', value: 'large', icon: Maximize2 },
                    ]}
                  />
              </div>

              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Background</Label>
                <PremiumToggle 
                  id="theme"
                  current={widgetSettings.theme}
                  onChange={(val) => setWidgetSettings({ ...widgetSettings, theme: val })}
                  options={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'Clear', value: 'transparent' },
                  ]}
                />
              </div>
              
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Card Style</Label>
                <PremiumToggle 
                  id="cardTheme"
                  current={widgetSettings.cardTheme}
                  onChange={(val) => setWidgetSettings({ ...widgetSettings, cardTheme: val })}
                  options={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                  ]}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 space-y-5">
                 <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                       <Type className="w-3 h-3" /> Name Size
                    </Label>
                    <PremiumToggle 
                      id="nameSize"
                      current={widgetSettings.nameSize}
                      onChange={(val) => setWidgetSettings({ ...widgetSettings, nameSize: val })}
                      options={[
                        { label: 'S', value: 'small' },
                        { label: 'M', value: 'medium' },
                        { label: 'L', value: 'large' },
                      ]}
                    />
                 </div>

                 <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                       <AlignLeft className="w-3 h-3" /> Content Style
                    </Label>
                    <PremiumToggle 
                      id="testimonialStyle"
                      current={widgetSettings.testimonialStyle}
                      onChange={(val) => setWidgetSettings({ ...widgetSettings, testimonialStyle: val })}
                      options={[
                        { label: 'Clean', value: 'clean' },
                        { label: 'Bubble', value: 'bubble', icon: MessageSquare },
                        { label: 'Quote', value: 'quote', icon: Quote },
                      ]}
                    />
                 </div>

                 <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
                       <Hand className="w-3 h-3" /> Hover Interaction
                    </Label>
                    <PremiumToggle 
                      id="hoverEffect"
                      current={widgetSettings.hoverEffect}
                      onChange={(val) => setWidgetSettings({ ...widgetSettings, hoverEffect: val })}
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Lift', value: 'lift' },
                        { label: 'Scale', value: 'scale' },
                        { label: 'Glow', value: 'glow' },
                      ]}
                    />
                 </div>

                 <Separator className="bg-slate-200 dark:bg-slate-800" />

                 <div className="space-y-4">
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Corners</Label>
                        <PremiumToggle 
                        id="corners"
                        current={widgetSettings.corners}
                        onChange={(val) => setWidgetSettings({ ...widgetSettings, corners: val })}
                        options={[
                            { label: 'Sharp', value: 'sharp', icon: Square },
                            { label: 'Smooth', value: 'smooth', icon: Circle },
                            { label: 'Round', value: 'round', icon: Circle },
                        ]}
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Shadow</Label>
                        <PremiumToggle 
                        id="shadow"
                        current={widgetSettings.shadow}
                        onChange={(val) => setWidgetSettings({ ...widgetSettings, shadow: val })}
                        options={[
                            { label: 'None', value: 'none' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Strong', value: 'strong' },
                        ]}
                        />
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between pt-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Show Borders</Label>
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 border shadow-sm">
                       <button onClick={() => setWidgetSettings({ ...widgetSettings, border: true })} className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${widgetSettings.border ? 'bg-violet-100 text-violet-600' : 'text-slate-300'}`}><Check className="w-3.5 h-3.5" /></button>
                       <button onClick={() => setWidgetSettings({ ...widgetSettings, border: false })} className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${!widgetSettings.border ? 'bg-red-50 text-red-500' : 'text-slate-300'}`}><X className="w-3.5 h-3.5" /></button>
                    </div>
                 </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 5. Motion & Effects */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <SectionHeader icon={Sparkles} title="Motion & Effects" />
               <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 bg-amber-50">PREMIUM</Badge>
            </div>
            
            <div className="space-y-6">
               {/* Smooth Continuous Scroll - NEW */}
               <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-4 rounded-xl border border-violet-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10"><Sparkles className="w-12 h-12 text-violet-500" /></div>
                   <div className="relative z-10 space-y-4">
                       <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                    <RefreshCw className="w-3 h-3" /> Smooth Continuous Scroll
                                </Label>
                                <p className="text-[10px] text-slate-500">Marquee-style infinite loop animation</p>
                            </div>
                            
                            {(widgetSettings.layout === 'carousel' || widgetSettings.layout === 'grid') ? (
                                <ToggleSwitch 
                                    isOn={widgetSettings.smoothContinuousScroll} 
                                    onToggle={() => {
                                        console.log('DEBUG: Toggling smooth continuous scroll');
                                        // Mutually exclusive with autoScroll
                                        setWidgetSettings({
                                            ...widgetSettings, 
                                            smoothContinuousScroll: !widgetSettings.smoothContinuousScroll,
                                            autoScroll: !widgetSettings.smoothContinuousScroll ? false : widgetSettings.autoScroll
                                        });
                                    }}
                                />
                            ) : (
                                <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">Carousel/Grid Only</Badge>
                            )}
                       </div>
                       
                       {widgetSettings.smoothContinuousScroll && (widgetSettings.layout === 'carousel' || widgetSettings.layout === 'grid') && (
                           <motion.div 
                               initial={{ opacity: 0, height: 0 }} 
                               animate={{ opacity: 1, height: 'auto' }} 
                               className="pt-3 border-t border-violet-200/50"
                           >
                               <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                   <span>Slow</span>
                                   <span className="font-mono text-violet-600">{widgetSettings.smoothScrollSpeed || 30}px/s</span>
                                   <span>Fast</span>
                               </div>
                               <Slider 
                                   value={[widgetSettings.smoothScrollSpeed || 30]} min={10} max={100} step={5}
                                   onValueChange={(val) => setWidgetSettings({...widgetSettings, smoothScrollSpeed: val[0]})}
                                   className="py-2"
                               />
                           </motion.div>
                       )}
                   </div>
               </div>

               <div className="bg-slate-900 text-slate-100 p-4 rounded-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10"><Sparkles className="w-12 h-12 text-white" /></div>
                   <div className="relative z-10 space-y-4">
                       <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                <RotateCcw className="w-3 h-3" /> Auto-Scroll (Carousel)
                            </Label>
                            
                            {isCarousel ? (
                                <div className="flex items-center bg-slate-800 rounded-full p-0.5">
                                   <button 
                                       onClick={() => setWidgetSettings({ ...widgetSettings, autoScroll: false })} 
                                       className={`px-3 py-1 rounded-full text-[10px] transition-all ${!widgetSettings.autoScroll ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                   >Off</button>
                                   <button 
                                       onClick={() => {
                                           console.log('DEBUG: Enabling autoScroll, disabling smoothContinuousScroll');
                                           // Mutually exclusive with smoothContinuousScroll
                                           setWidgetSettings({ 
                                               ...widgetSettings, 
                                               autoScroll: true, 
                                               smoothContinuousScroll: false 
                                           });
                                       }} 
                                       className={`px-3 py-1 rounded-full text-[10px] transition-all ${widgetSettings.autoScroll ? 'bg-violet-600 text-white' : 'text-slate-500'}`}
                                   >On</button>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">Carousel Only</Badge>
                            )}
                       </div>
                       
                       {!isCarousel && showScrollWarning && (
                            <div className="flex items-start gap-2 bg-slate-800/50 p-2 rounded text-[10px] text-amber-200 border border-amber-900/30">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="flex-1">Please select Carousel Layout to use this feature.</span>
                                <button onClick={() => setShowScrollWarning(false)} className="hover:text-white"><X className="w-3 h-3" /></button>
                            </div>
                       )}

                       {isCarousel && widgetSettings.autoScroll && (
                           <div className="animate-in fade-in slide-in-from-top-2">
                               <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                   <span>Fast</span>
                                   <span>Slow</span>
                               </div>
                               <Slider 
                                   value={[widgetSettings.scrollSpeed]} min={1} max={10} step={0.5} inverted
                                   onValueChange={(val) => setWidgetSettings({...widgetSettings, scrollSpeed: val[0]})}
                                   className="py-2"
                               />
                           </div>
                       )}

                       {isCarousel && (
                           <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                               <Label className="text-xs text-slate-400">Focus Zoom Effect</Label>
                               <button 
                                onClick={() => setWidgetSettings({...widgetSettings, carouselFocusZoom: !widgetSettings.carouselFocusZoom})}
                                className={`w-8 h-4 rounded-full relative transition-colors ${widgetSettings.carouselFocusZoom ? 'bg-violet-500' : 'bg-slate-700'}`}
                               >
                                   <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${widgetSettings.carouselFocusZoom ? 'left-[18px]' : 'left-0.5'}`} />
                               </button>
                           </div>
                       )}
                   </div>
               </div>

               <div>
                  <Label className="text-xs text-slate-500 mb-1.5 block">Animation Speed</Label>
                  <PremiumToggle 
                     id="speed"
                     current={widgetSettings.speed}
                     onChange={(val) => setWidgetSettings({ ...widgetSettings, speed: val })}
                     options={[
                       { label: 'Slow', value: 'slow', icon: Gauge },
                       { label: 'Normal', value: 'normal', icon: Gauge },
                       { label: 'Fast', value: 'fast', icon: Zap },
                     ]}
                  />
               </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 6. Branding Control - NEW PRO FEATURE */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <SectionHeader icon={Crown} title="Branding" />
                <Badge className="text-[10px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-sm flex items-center gap-1 px-2 py-0.5">
                   <Star className="w-2.5 h-2.5 fill-current" /> PRO
                </Badge>
             </div>
             
             <div className={`p-4 rounded-xl border transition-all duration-300 ${!widgetSettings.showBranding ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex items-center justify-between">
                     <div className="space-y-0.5">
                         <Label className="text-sm font-semibold text-slate-800">Remove Branding (Pro)</Label>
                         <p className="text-[10px] text-slate-500">Hide "Powered by TrustFlow" badge</p>
                     </div>
                     <ToggleSwitch 
                        isOn={!widgetSettings.showBranding} 
                        onToggle={() => {
                            console.log('DEBUG: Toggling branding visibility');
                            setWidgetSettings({...widgetSettings, showBranding: !widgetSettings.showBranding});
                        }}
                     />
                 </div>
             </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 7. See More Button - PRO Feature */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                <SectionHeader icon={ExternalLink} title="See More Button" />
                <Badge className="text-[10px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-sm flex items-center gap-1 px-2 py-0.5">
                   <Star className="w-2.5 h-2.5 fill-current" /> PRO
                </Badge>
             </div>
             
             <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-4">
                 <div className="space-y-2">
                     <Label className="text-xs text-slate-500">Button Text</Label>
                     <Input 
                        value={widgetSettings.seeMoreButtonText || 'See More'} 
                        onChange={(e) => setWidgetSettings({...widgetSettings, seeMoreButtonText: e.target.value})}
                        className="h-8 text-xs bg-white"
                        placeholder="See More"
                     />
                 </div>
                 <div className="space-y-2">
                     <Label className="text-xs text-slate-500 flex items-center gap-1">
                         <LinkIcon className="w-3 h-3" /> Redirect Link
                     </Label>
                     <Input 
                        value={widgetSettings.seeMoreButtonLink || '#'} 
                        onChange={(e) => {
                            console.log('DEBUG: See More Link updated to:', e.target.value);
                            setWidgetSettings({...widgetSettings, seeMoreButtonLink: e.target.value});
                        }}
                        className="h-8 text-xs bg-white"
                        placeholder="https://example.com/testimonials"
                     />
                     <p className="text-[10px] text-slate-400">Where users go when they click the button on Wall of Love</p>
                 </div>
             </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetTab;