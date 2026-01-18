import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom'; 
import { supabase } from '@/lib/supabase';
import { Star, Play, ChevronLeft, ChevronRight, BadgeCheck, Loader2, ExternalLink, Heart, Clock, Quote } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import '@/index.css';

const CARD_WIDTH = 300; 
const GAP = 24; 
const PADDING_X = 32; 

// --- CSS for Smooth Continuous Scroll Animation ---
const smoothScrollStyles = `
  @keyframes smoothMarquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .smooth-scroll-container {
    display: flex;
    width: max-content;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .smooth-scroll-container:hover {
    animation-play-state: paused;
  }
  /* Mobile Masonry Fix */
  @media (max-width: 767px) {
    .mobile-masonry-card {
      transform: scale(0.95);
      font-size: 0.95em;
    }
    .mobile-masonry-container {
      columns: 1 !important;
      padding: 8px !important;
    }
    .mobile-masonry-container .mobile-masonry-card {
      margin-bottom: 12px;
    }
  }
`; 

// --- 1. ERROR BOUNDARY (Fixed to show Error) ---
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    console.error("TrustFlow Widget Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
        // Fallback UI showing the actual error
        return (
            <div className="p-4 text-center border border-red-200 bg-red-50 rounded-lg">
                <p className="text-red-600 font-bold text-sm">Widget Error</p>
                <p className="text-xs text-red-500 mt-1">{this.state.error?.message || "Unknown error"}</p>
            </div>
        );
    }
    return this.props.children; 
  }
}

// --- 2. VIDEO PLAYER ---
const StylishVideoPlayer = ({ videoUrl, corners = 'rounded-xl' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlayClick = () => {
    if (videoRef.current) videoRef.current.play();
  };

  return (
    <div className={`relative overflow-hidden bg-black shadow-md ring-1 ring-black/5 aspect-video mb-4 ${corners}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        controls={isPlaying} 
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors backdrop-blur-[1px] cursor-pointer z-10"
          >
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transition-all"
            >
              <Play className="w-5 h-5 text-white fill-white ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 3. MAIN WIDGET CONTENT ---
const WallOfLoveContent = ({ customSpaceId }) => {
  const { spaceId: urlSpaceId } = useParams(); 
  const spaceId = customSpaceId || urlSpaceId;
  
  const [searchParams] = useSearchParams();
  const outerContainerRef = useRef(null); 
  const carouselConstraintsRef = useRef(null);
  
  // Logic State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [maskWidth, setMaskWidth] = useState('100%');
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSnapping, setIsSnapping] = useState(false); 

  // --- Interaction States ---
  const [expandedId, setExpandedId] = useState(null);
  const [expandedRect, setExpandedRect] = useState(null); 
  const [isPaused, setIsPaused] = useState(false);
  
  // New: Store which cards are actually overflowing
  const [overflowingCards, setOverflowingCards] = useState(new Set());
  const textRefs = useRef({}); // Map to store refs of text elements
  
  // Settings State
  const [settings, setSettings] = useState({
    layout: 'grid',
    theme: 'transparent',
    cardTheme: 'light',
    corners: 'smooth',
    shadow: 'medium',
    border: true, 
    hoverEffect: 'lift',
    nameSize: 'medium',
    testimonialStyle: 'clean',
    animation: 'fade',
    speed: 'normal',
    carouselSameSize: true, 
    showHeading: false,
    headingText: '',
    headingFont: 'Inter',
    headingColor: '#000000',
    showSubheading: false,
    subheadingText: '',
    subheadingFont: 'Inter',
    subheadingColor: '#64748b',
    carouselFocusZoom: false,
    maxCount: 12,
    shuffle: false,
    autoScroll: false,
    scrollSpeed: 3,
    // New settings
    smoothContinuousScroll: false,
    smoothScrollSpeed: 30,
    showBranding: true,
    seeMoreEnabled: true,
    seeMoreButtonText: 'See More',
    seeMoreButtonLink: '#',
    // Gallery settings
    presetId: 'default',
    cardStyle: 'default'
  });

  // --- 1. SUPER FAST TRANSPARENCY ---
  useLayoutEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.overflow = 'hidden'; 
  }, []);

  // --- 2. Theme Application ---
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark');
    if (settings.theme === 'dark') {
        root.classList.add('dark');
        body.style.backgroundColor = '#0f172a';
    } else if (settings.theme === 'light') {
        body.style.backgroundColor = '#ffffff';
    } else {
        body.style.backgroundColor = 'transparent';
    }
  }, [settings.theme]);

  // --- 3. Font Loader ---
  useEffect(() => {
    // FIX: Added filter(Boolean) to avoid crash if fonts are undefined
    const fontsToLoad = [settings.headingFont, settings.subheadingFont].filter(Boolean);
    const uniqueFonts = [...new Set(fontsToLoad)];
    uniqueFonts.forEach(font => {
        if (font === 'Inter') return; 
        const fontName = font.replace(/\s+/g, '+');
        const linkId = `tf-font-${fontName}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    });
  }, [settings.headingFont, settings.subheadingFont]);

  // --- 4. Data Fetching ---
  useEffect(() => {
    console.log("DEBUG: WallOfLove mounted. SpaceID:", spaceId);
    if (spaceId) {
        Promise.all([fetchTestimonials(), fetchSettings()])
            .then(() => console.log("DEBUG: Fetch complete"))
            .catch(err => console.error("DEBUG: Fetch error", err))
            .finally(() => setLoading(false));
    }
  }, [spaceId]);

  const fetchSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('widget_configurations')
            .select('settings')
            .eq('space_id', spaceId)
            .single();
        
        if (error) console.error("DEBUG: Settings fetch error:", error);
        
        if (data?.settings) {
            console.log("DEBUG: Settings loaded:", data.settings);
            setSettings(prev => ({ ...prev, ...data.settings }));
        }
    } catch (e) { console.warn("Using default settings."); }
  };

  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_liked', true) 
      .order('created_at', { ascending: false });
    
    if (error) console.error("DEBUG: Testimonials error:", error);
    else console.log("DEBUG: Testimonials loaded:", data?.length);

    setTestimonials(data || []);
  };

  // --- 5. Logic: Shuffle & Loop ---
  // FIX: Added `(testimonials || [])` to prevent crash if data is null
  const displayedTestimonials = useMemo(() => {
    let result = [...(testimonials || [])];
    if (settings.shuffle) result = result.sort(() => Math.random() - 0.5);
    return result.slice(0, settings.maxCount || 12);
  }, [testimonials, settings.shuffle, settings.maxCount]);

  const carouselItems = useMemo(() => {
    if (settings.layout !== 'carousel' || displayedTestimonials.length === 0) return displayedTestimonials;
    const clones = displayedTestimonials.slice(0, visibleCount + 2); 
    return [...displayedTestimonials, ...clones];
  }, [displayedTestimonials, settings.layout, visibleCount]);

  // --- STRICT OVERFLOW CHECKER ---
  useLayoutEffect(() => {
    const checkOverflow = () => {
      const newOverflows = new Set();
      Object.keys(textRefs.current).forEach((key) => {
        const el = textRefs.current[key];
        if (el && el.scrollHeight > el.clientHeight) {
          newOverflows.add(key);
        }
      });
      setOverflowingCards(prev => {
        if (prev.size !== newOverflows.size) return newOverflows;
        for (let item of newOverflows) if (!prev.has(item)) return newOverflows;
        return prev;
      });
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [testimonials, settings, visibleCount]);


  // --- 6. Resize Logic (Iframe Overflow Handler) ---
  const handleResize = () => {
    if (!outerContainerRef.current) return;
    
    let height = outerContainerRef.current.scrollHeight;
    
    // Check Actual Expanded Card Height
    const expandedElement = document.getElementById('tf-expanded-overlay');
    
    if (expandedElement) {
        const rect = expandedElement.getBoundingClientRect();
        const neededHeight = rect.bottom + 60; 
        if (neededHeight > height) {
             height = neededHeight;
        }
    }

    console.log("DEBUG: Sending resize message. Height:", height);
    window.parent.postMessage({ type: 'trustflow-resize', height }, '*');

    if (settings.layout === 'carousel') {
      const rect = outerContainerRef.current.getBoundingClientRect();
      const availableWidth = rect.width - PADDING_X; 
      const isMobile = window.innerWidth < 640;
      const cardWidthToUse = isMobile ? availableWidth : CARD_WIDTH;
      const count = Math.floor((availableWidth + GAP) / (cardWidthToUse + GAP));
      const safeCount = Math.max(1, count); 
      setVisibleCount(safeCount);
      const calculatedMask = (safeCount * CARD_WIDTH) + ((safeCount - 1) * GAP) + 40;
      setMaskWidth(isMobile ? '100%' : `${calculatedMask}px`);
    } else {
      setMaskWidth('100%');
    }
  };

  useEffect(() => {
    // FIX: Removed 'loading' check so resize can trigger on initial loader too
    if (!outerContainerRef.current) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(outerContainerRef.current);
    handleResize(); // Trigger immediately
    window.addEventListener('resize', handleResize);
    return () => { observer.disconnect(); window.removeEventListener('resize', handleResize); };
  }, [testimonials, settings.layout, loading, settings.theme]);

  // Force resize when expansion happens/changes
  useLayoutEffect(() => {
      const t = setTimeout(handleResize, 100);
      return () => clearTimeout(t);
  }, [expandedId, expandedRect]);

  // --- 7. Navigation ---
  const handleNext = () => {
    if (settings.layout === 'carousel') {
        if (carouselIndex >= displayedTestimonials.length) {
            setIsSnapping(true);
            setCarouselIndex(0);
            requestAnimationFrame(() => requestAnimationFrame(() => { 
                setIsSnapping(false); 
                setCarouselIndex(1); 
            }));
        } else {
            setCarouselIndex(prev => prev + 1);
        }
    }
  };

  const handlePrev = () => {
    if (settings.layout === 'carousel') {
        if (carouselIndex <= 0) {
            setIsSnapping(true);
            setCarouselIndex(displayedTestimonials.length);
            requestAnimationFrame(() => requestAnimationFrame(() => { 
                setIsSnapping(false); 
                setCarouselIndex(displayedTestimonials.length - 1); 
            }));
        } else {
            setCarouselIndex(prev => prev - 1);
        }
    }
  };

  // AUTO SCROLL LOGIC
  useEffect(() => {
    let interval;
    if (settings.autoScroll && settings.layout === 'carousel' && !isPaused) {
        interval = setInterval(handleNext, (settings.scrollSpeed || 3) * 1000);
    }
    return () => clearInterval(interval);
  }, [settings.autoScroll, settings.scrollSpeed, settings.layout, carouselIndex, isPaused]);

  // --- 8. Animation Variants Logic ---
  const getAnimationVariants = () => {
    const { animation, speed } = settings;
    const dur = speed === 'fast' ? 0.3 : speed === 'slow' ? 0.8 : 0.5;
    const visibleState = { opacity: 1, y: 0, x: 0, scale: 1, rotateX: 0 };
    const transition = { duration: dur, ease: "easeOut" };
    const variants = { visible: { ...visibleState, transition }, hidden: { opacity: 0 } };

    switch (animation) {
      case 'slideUp': variants.hidden = { opacity: 0, y: 50 }; break;
      case 'slideDown': variants.hidden = { opacity: 0, y: -50 }; break;
      case 'scale': variants.hidden = { opacity: 0, scale: 0.8 }; break;
      case 'pop': 
        variants.hidden = { opacity: 0, scale: 0.5 };
        variants.visible.transition = { type: 'spring', stiffness: 300, damping: 20 };
        break;
      case 'fade': default: variants.hidden = { opacity: 0 }; break;
    }
    return variants;
  };

  // --- 9. Styles ---
  const getCardWidthPx = () => (window.innerWidth < 640 ? window.innerWidth - PADDING_X : CARD_WIDTH);

  const getCardStyles = (isOverlay = false) => {
    const { cardTheme, layout, corners, shadow, border, hoverEffect, carouselSameSize } = settings;
    let classes = 'p-5 md:p-6 flex flex-col ';
    
    if (!isOverlay) {
        classes += 'transition-all duration-300 ';
    } else {
        classes += 'transition-[box-shadow,transform,background-color,border-color,opacity] duration-300 ';
    }
    
    if (isOverlay) {
        classes += 'h-auto '; 
    } else if (layout === 'masonry') {
        classes += 'h-auto ';
    } else {
        if (carouselSameSize) classes += '!h-full '; 
        else classes += 'h-auto ';
    }
    
    if (corners === 'sharp') classes += 'rounded-none ';
    else if (corners === 'round') classes += 'rounded-3xl ';
    else classes += 'rounded-xl ';

    if (isOverlay) {
        classes += 'shadow-2xl ring-1 ring-black/5 '; 
    } else {
        if (shadow === 'none') classes += 'shadow-none ';
        else if (shadow === 'light') classes += 'shadow-sm ';
        else if (shadow === 'strong') classes += 'shadow-xl ';
        else classes += 'shadow-md ';
    }

    if (hoverEffect === 'lift') classes += 'hover:-translate-y-1 hover:shadow-lg ';
    else if (hoverEffect === 'scale') classes += 'hover:scale-[1.01] hover:shadow-lg ';
    else if (hoverEffect === 'glow') classes += 'hover:shadow-violet-500/20 hover:border-violet-300 ';
    
    if (cardTheme === 'dark') classes += 'bg-slate-900 text-slate-100 ' + (border ? 'border border-slate-800 ' : 'border-0 ');
    else classes += 'bg-white text-slate-800 ' + (border ? 'border border-slate-100 ' : 'border-0 ');

    if (layout === 'masonry') classes += 'break-inside-avoid mb-6 inline-block w-full ';
    else if (layout === 'carousel') classes += 'flex-shrink-0 w-[85vw] sm:w-[300px] '; 
    else if (layout === 'list') classes += 'w-full mb-4 ';

    if (isOverlay) classes += ' z-50 pointer-events-auto ';

    return classes;
  };

  const handleMouseEnter = (e, index, isOverflowing) => {
    setIsPaused(true); // PAUSE
    if (!isOverflowing) return; 
    
    if (window.innerWidth >= 640) {
        const rect = e.currentTarget.getBoundingClientRect();
        setExpandedRect(rect);
        setExpandedId(index);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false); // RESUME
  };

  const handleMobileClick = (e, index, isOverflowing) => {
    setIsPaused(true); // PAUSE on Touch
    if (!isOverflowing) return; 
    
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
        if (expandedId === index) {
            setExpandedId(null);
            setIsPaused(false); 
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setExpandedRect(rect);
            setExpandedId(index);
        }
    }
  };

  const handleOverlayLeave = () => {
    setExpandedId(null);
    setExpandedRect(null);
    setIsPaused(false); 
  };
  
  const smoothScrollDuration = useMemo(() => {
    try {
      const totalWidth = displayedTestimonials.length * (CARD_WIDTH + GAP);
      const speed = settings.smoothScrollSpeed || 30;
      return totalWidth / speed;
    } catch (e) {
      console.log('DEBUG: Error calculating smooth scroll duration', e);
      return 30;
    }
  }, [displayedTestimonials.length, settings.smoothScrollSpeed]);

  // --- RENDER ---
  
  // FIX: Added ref={outerContainerRef} to the Loader div
  // This ensures embed.js detects content height > 0 during loading
  if (loading) return (
    <div ref={outerContainerRef} className="min-h-[100px] flex items-center justify-center bg-transparent">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400"/>
    </div>
  );

  // FIX: Added ref={outerContainerRef} to the Empty State
  if (testimonials.length === 0) return <div ref={outerContainerRef} className="p-8 text-center text-gray-500">No testimonials yet</div>;

  const isCarousel = settings.layout === 'carousel';
  const bubbleBgClass = settings.cardTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
  const shouldAnimate = !settings.autoScroll && !settings.smoothContinuousScroll; 
  const isDark = settings.cardTheme === 'dark';

  // --- CARD CONTENT GENERATOR WITH CARD STYLE SUPPORT ---
  const renderCardContent = (testimonial, index, forOverlay = false) => {
    const cardStyle = settings.cardStyle || 'default';
    const isBubble = settings.testimonialStyle === 'bubble';
    
    // Common star rating component
    const StarRating = ({ rating, size = 'sm' }) => {
      const sizeClass = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
      return (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`${sizeClass} ${i < (rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          ))}
        </div>
      );
    };

    // Common branding badge - position varies by card style
    const BrandingBadge = ({ position = 'top-right' }) => {
      if (settings.showBranding === false) return null;
      
      const positionClasses = {
        'top-right': 'absolute top-2 right-2',
        'top-left': 'absolute top-2 left-2',
        'bottom-right': 'absolute bottom-2 right-2',
        'bottom-left': 'absolute bottom-2 left-2',
        'bottom-center': 'absolute bottom-2 left-1/2 -translate-x-1/2',
        'inline-footer': 'mt-auto pt-2'
      };
      
      return (
        <div className={`${positionClasses[position]} z-20`}>
          <span className={`text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 backdrop-blur-sm ${
            isDark 
              ? 'bg-slate-900/80 text-slate-400 border border-slate-700/50' 
              : 'bg-white/90 text-slate-500 border border-slate-200/50 shadow-sm'
          }`}>
            <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-violet-500 text-violet-500" /> TrustFlow
          </span>
        </div>
      );
    };

    // --- TESTIMONIAL CLASSIC STYLE (Profile First - like Testimonial.to) ---
    if (cardStyle === 'testimonial-classic') {
      return (
        <>
          {/* Branding at bottom-right to avoid heart icon conflict */}
          <BrandingBadge position="bottom-right" />
          {/* Profile Top with Hearts */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-md">
                <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-sm sm:text-base">{testimonial.respondent_name || "Anonymous"}</div>
                <div className={`text-[10px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {testimonial.respondent_role || 'Verified User'}
                </div>
              </div>
            </div>
            <Heart className="w-5 h-5 text-rose-400 fill-rose-400 flex-shrink-0" />
          </div>
          
          {/* Rating */}
          {testimonial.rating && <div className="mb-3"><StarRating rating={testimonial.rating} /></div>}
          
          {/* Content */}
          <div className={`flex-1 ${forOverlay ? 'pb-4' : 'pb-2'}`}>
            {testimonial.type === 'video' && testimonial.video_url ? (
              <StylishVideoPlayer videoUrl={testimonial.video_url} corners={settings.corners === 'sharp' ? 'rounded-none' : 'rounded-xl'} />
            ) : (
              <p 
                ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                className="text-sm leading-relaxed whitespace-pre-line"
                style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {testimonial.content}
              </p>
            )}
          </div>
        </>
      );
    }

    // --- MIXPANEL STYLE (Profile on top, company logo bottom) ---
    if (cardStyle === 'mixpanel-style') {
      return (
        <>
          {/* Branding at top-right for mixpanel style */}
          <BrandingBadge position="top-right" />
          {/* Profile Top */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white shadow-lg">
              <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-lg">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-base sm:text-lg">{testimonial.respondent_name || "Anonymous"}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {testimonial.respondent_role || 'Verified User'}
              </div>
            </div>
          </div>
          
          {/* Content with possible highlights */}
          <div className={`flex-1 mb-4 ${forOverlay ? 'pb-4' : ''}`}>
            {testimonial.type === 'video' && testimonial.video_url ? (
              <StylishVideoPlayer videoUrl={testimonial.video_url} corners={settings.corners === 'sharp' ? 'rounded-none' : 'rounded-xl'} />
            ) : (
              <p 
                ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                className="text-sm sm:text-base leading-relaxed whitespace-pre-line"
                style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {testimonial.content}
              </p>
            )}
          </div>
          
          {/* Company Logo Footer */}
          <div className={`pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex items-center gap-2`}>
            <div className={`w-5 h-5 rounded ${isDark ? 'bg-purple-600' : 'bg-purple-500'} flex items-center justify-center`}>
              <span className="text-white text-[8px] font-bold">✓</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Verified Review</span>
          </div>
        </>
      );
    }

    // --- VIDEO HERO STYLE ---
    if (cardStyle === 'video-hero' && testimonial.type === 'video' && testimonial.video_url) {
      return (
        <div className="relative h-full min-h-[280px]">
          {/* Branding at top-left, heart at top-right for video hero */}
          <BrandingBadge position="top-left" />
          <Heart className="absolute top-2 right-2 w-5 h-5 text-rose-400 fill-rose-400 z-20 drop-shadow-lg" />
          
          {/* Video Background */}
          <div className="absolute inset-0">
            <StylishVideoPlayer videoUrl={testimonial.video_url} corners={settings.corners === 'sharp' ? 'rounded-none' : 'rounded-2xl'} className="h-full" />
          </div>
          
          {/* Bottom Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent rounded-b-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-8 h-8 border-2 border-white/50">
                <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
                <AvatarFallback className="bg-white/20 text-white text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-white">
                <div className="font-semibold text-sm">{testimonial.respondent_name || "Anonymous"}</div>
                <div className="text-[10px] text-white/70">{testimonial.respondent_role || 'Verified'}</div>
              </div>
            </div>
            {testimonial.rating && <StarRating rating={testimonial.rating} size="xs" />}
          </div>
        </div>
      );
    }

    // --- TWITTER/SOCIAL FEED STYLE ---
    if (cardStyle === 'twitter-style') {
      return (
        <>
          {/* Branding at top-right for twitter style */}
          <BrandingBadge position="top-right" />
          {/* Profile Row */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
              <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
              <AvatarFallback className="bg-slate-200 text-slate-600">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm truncate">{testimonial.respondent_name || "Anonymous"}</span>
                <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500 flex-shrink-0" />
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {testimonial.respondent_role || 'Verified User'}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className={`flex-1 mb-3 ${forOverlay ? 'pb-4' : ''}`}>
            {testimonial.type === 'video' && testimonial.video_url ? (
              <StylishVideoPlayer videoUrl={testimonial.video_url} corners="rounded-xl" />
            ) : (
              <p 
                ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                className="text-sm leading-relaxed whitespace-pre-line"
                style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {testimonial.content}
              </p>
            )}
          </div>
          
          {/* Timestamp Footer */}
          <div className={`pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex items-center gap-2`}>
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date(testimonial.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {testimonial.rating && <div className="ml-auto"><StarRating rating={testimonial.rating} size="xs" /></div>}
          </div>
        </>
      );
    }

    // --- QUOTE CARD STYLE ---
    if (cardStyle === 'quote-card') {
      return (
        <>
          {/* Branding at top-right for quote card */}
          <BrandingBadge position="top-right" />
          {/* Large Quote Icon */}
          <Quote className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? 'text-violet-400' : 'text-violet-500'} opacity-40 mb-3`} />
          
          {/* Large Content */}
          <div className={`flex-1 mb-4 ${forOverlay ? 'pb-4' : ''}`}>
            {testimonial.type === 'video' && testimonial.video_url ? (
              <StylishVideoPlayer videoUrl={testimonial.video_url} corners="rounded-xl" />
            ) : (
              <p 
                ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                className="text-base sm:text-lg font-serif italic leading-relaxed whitespace-pre-line"
                style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                "{testimonial.content}"
              </p>
            )}
          </div>
          
          {/* Rating if exists */}
          {testimonial.rating && <div className="mb-4"><StarRating rating={testimonial.rating} /></div>}
          
          {/* Signature Footer */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <div className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>— Signed by</div>
              <div className="font-bold text-sm">{testimonial.respondent_name || "Anonymous"}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{testimonial.respondent_role || 'Verified'}</div>
            </div>
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-violet-200">
              <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </>
      );
    }

    // --- MODERN SPLIT STYLE ---
    if (cardStyle === 'modern-split') {
      return (
        <div className="flex h-full relative">
          {/* Branding at bottom-right for split style */}
          <BrandingBadge position="bottom-right" />
          {/* Left Avatar Area */}
          <div className={`w-1/3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center rounded-l-xl -m-5 sm:-m-6 mr-4`}>
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
              <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-xl">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          {/* Right Content */}
          <div className="flex-1 flex flex-col justify-between py-1">
            {testimonial.rating && <div className="mb-2"><StarRating rating={testimonial.rating} /></div>}
            
            <div className={`flex-1 mb-3 ${forOverlay ? 'pb-2' : ''}`}>
              {testimonial.type === 'video' && testimonial.video_url ? (
                <StylishVideoPlayer videoUrl={testimonial.video_url} corners="rounded-lg" />
              ) : (
                <p 
                  ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {testimonial.content}
                </p>
              )}
            </div>
            
            <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="font-bold text-sm">{testimonial.respondent_name || "Anonymous"}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{testimonial.respondent_role || 'Verified'}</div>
            </div>
          </div>
        </div>
      );
    }

    // --- FLOATING BADGE STYLE ---
    if (cardStyle === 'floating-badge') {
      return (
        <div className="relative pt-6">
          {/* Branding at top-right for floating badge style */}
          <BrandingBadge position="top-right" />
          {/* Floating Avatar */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-white shadow-xl">
              <AvatarImage src={testimonial.respondent_photo_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xl">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          {/* Card Body - name and role centered */}
          <div className="text-center pt-10">
            <div className="font-bold text-base mb-1">{testimonial.respondent_name || "Anonymous"}</div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-3`}>{testimonial.respondent_role || 'Verified'}</div>
            
            {testimonial.rating && <div className="flex justify-center mb-3"><StarRating rating={testimonial.rating} /></div>}
            
            <div className={forOverlay ? 'pb-4' : ''}>
              {testimonial.type === 'video' && testimonial.video_url ? (
                <StylishVideoPlayer videoUrl={testimonial.video_url} corners="rounded-xl" />
              ) : (
                <p 
                  ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                  className="text-sm leading-relaxed text-center whitespace-pre-line"
                  style={forOverlay ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {testimonial.content}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // --- DEFAULT STYLE (TrustFlow Classic) ---
    return (
        <>
            {/* Branding at top-right for default style */}
            <BrandingBadge position="top-right" />
            {testimonial.rating && ( 
                <div className="flex gap-0.5 mb-2 sm:mb-3">
                    {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                </div>
            )}
            
            <div className={`flex-1 mb-auto flex flex-col justify-start ${forOverlay ? 'pb-6' : 'pb-4'}`}>
                {testimonial.type === 'video' && testimonial.video_url ? (
                    <StylishVideoPlayer videoUrl={testimonial.video_url} corners={settings.corners === 'sharp' ? 'rounded-none' : 'rounded-xl'} />
                ) : (
                    <div className={`
                        ${isBubble ? `p-3 sm:p-4 ${bubbleBgClass} rounded-lg` : ''}
                        ${settings.testimonialStyle === 'quote' ? 'pl-4 border-l-4 border-violet-400 italic' : ''}
                        ${settings.testimonialStyle === 'clean' ? 'opacity-90' : ''}
                    `}>
                        <p 
                            ref={el => { if (!forOverlay) textRefs.current[`${testimonial.id}-${index}`] = el; }}
                            className="text-sm leading-relaxed whitespace-pre-line"
                            style={forOverlay ? {} : {
                                display: '-webkit-box',
                                WebkitLineClamp: 5,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                paddingBottom: '2px' 
                            }}
                        >
                        {testimonial.content}
                        </p>
                    </div>
                )}
            </div>
    
            <div className="flex items-center gap-3 pt-3 sm:pt-4 border-t border-dashed border-gray-200/10 mt-2">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border border-white/20 shrink-0">
                    <AvatarImage src={testimonial.respondent_photo_url} className="object-cover scale-110" />
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <div className={`font-bold text-sm sm:text-base flex items-center gap-1.5`}>
                    {testimonial.respondent_name || "Anonymous"}
                    <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-blue-500 shrink-0" />
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-70">
                    {testimonial.respondent_role || 'Verified User'}
                    </div>
                </div>
            </div>
        </>
      );
  }

  const expandedTestimonial = expandedId !== null ? (isCarousel ? carouselItems : displayedTestimonials)[expandedId] : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      ref={outerContainerRef} 
      className="w-full relative group font-sans pt-4 pb-8 px-4 sm:px-6 lg:px-8" 
      style={{ minHeight: '100px', overflow: 'visible' }}
      // GLOBAL PAUSE HANDLER for entire area
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Inject smooth scroll styles */}
      <style>{smoothScrollStyles}</style>
      
      {(settings.showHeading || settings.showSubheading) && (
        <div className="text-center mb-6 space-y-1 px-4">
             {settings.showHeading && (
                 <h2 style={{ fontFamily: settings.headingFont, color: settings.headingColor, fontWeight: settings.headingBold ? 'bold' : 'normal' }} className="text-2xl md:text-3xl">
                     {settings.headingText}
                 </h2>
             )}
             {settings.showSubheading && (
                 <p style={{ fontFamily: settings.subheadingFont, color: settings.subheadingColor }} className="text-sm md:text-lg opacity-80">
                     {settings.subheadingText}
                 </p>
             )}
        </div>
      )}

      {isCarousel && testimonials.length > visibleCount && !settings.smoothContinuousScroll && (
        <div className="hidden sm:block">
          <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 shadow-lg border border-gray-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200" style={{marginLeft: '2px'}}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 shadow-lg border border-gray-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200" style={{marginRight: '2px'}}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* LIST CONTAINER */}
      <div 
        className="relative mx-auto transition-[width] duration-300 ease-in-out overflow-hidden"
        style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%' }}
      >
        {/* Smooth Continuous Scroll Mode */}
        {settings.smoothContinuousScroll && (settings.layout === 'carousel' || settings.layout === 'grid') ? (
          <div 
            className="smooth-scroll-container"
            style={{ 
              animationName: 'smoothMarquee',
              animationDuration: `${smoothScrollDuration}s`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          >
            {/* Original items */}
            {displayedTestimonials.map((testimonial, i) => (
              <div
                key={`orig-${testimonial.id}-${i}`}
                className={`relative flex-shrink-0 mx-3`}
                style={{ width: `${CARD_WIDTH}px` }}
              >
                <div className={`${getCardStyles(false)} relative`}>
                  {renderCardContent(testimonial, i, false)}
                </div>
              </div>
            ))}
            {/* Cloned items for seamless loop */}
            {displayedTestimonials.map((testimonial, i) => (
              <div
                key={`clone-${testimonial.id}-${i}`}
                className={`relative flex-shrink-0 mx-3`}
                style={{ width: `${CARD_WIDTH}px` }}
              >
                <div className={`${getCardStyles(false)} relative`}>
                  {renderCardContent(testimonial, i, false)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            ref={carouselConstraintsRef}
            className={`
              ${isCarousel ? `flex gap-4 sm:gap-6 py-8 sm:py-12 px-5 sm:px-6 cursor-grab active:cursor-grabbing ${settings.carouselSameSize ? 'items-stretch' : 'items-start'}` : ''} 
              ${settings.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6' : ''}
              ${settings.layout === 'masonry' ? 'block columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 p-4 sm:p-6 mobile-masonry-container' : ''}
              ${settings.layout === 'list' ? 'max-w-2xl mx-auto flex flex-col gap-4 p-4 sm:p-6' : ''}
            `}
            drag={isCarousel ? "x" : false}
            dragConstraints={isCarousel ? { right: 0, left: -((testimonials.length * (300 + 24)) - maskWidth) } : false} 
            animate={isCarousel ? { x: -(carouselIndex * (getCardWidthPx() + GAP)) } : {}}
            transition={isSnapping ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Base Cards Render */}
            {(isCarousel ? carouselItems : displayedTestimonials).map((testimonial, i) => {
                  let isFocused = false;
                  if (isCarousel && settings.carouselFocusZoom) {
                      const relativeIndex = i - carouselIndex;
                      const centerOffset = Math.floor(visibleCount / 2);
                      if (relativeIndex === centerOffset) isFocused = true;
                  }
                  const variants = getAnimationVariants();
                  const isOverflowing = overflowingCards.has(`${testimonial.id}-${i}`);
                  
                  return (
                    <motion.div
                      key={`${testimonial.id}-${i}`}
                      custom={i}
                      layoutId={`card-${i}`} 
                      initial={shouldAnimate ? "hidden" : "visible"}
                      whileInView="visible"
                      viewport={{ once: true, margin: "-10%" }} 
                      variants={variants}
                      animate={isFocused ? { scale: 1.05, opacity: 1, zIndex: 10 } : undefined}
                      className={`relative group/card mobile-masonry-card ${settings.carouselSameSize && !isCarousel ? 'h-full' : ''} ${settings.layout === 'masonry' ? 'mb-6 h-auto' : ''} ${isOverflowing ? 'cursor-zoom-in' : ''}`}
                      
                      // Trigger Expansion & Pause
                      onMouseEnter={(e) => handleMouseEnter(e, i, isOverflowing)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => handleMobileClick(e, i, isOverflowing)}
                      
                      // Hide base card when expanded
                      style={{ opacity: expandedId === i ? 0 : 1 }}
                    >
                      <div className={`${getCardStyles(false)} relative`}>
                          {renderCardContent(testimonial, i, false)}
                      </div>
                    </motion.div>
                  );
              })}
          </motion.div>
        )}
      </div>

      {/* See More Button */}
      {settings.seeMoreEnabled !== false && settings.seeMoreButtonText && settings.seeMoreButtonLink && settings.seeMoreButtonLink !== '#' && (
        <div className="flex justify-center mt-8">
          <a 
            href={settings.seeMoreButtonLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 shadow-lg ${
              settings.cardTheme === 'dark' 
                ? 'bg-white text-slate-900 hover:bg-slate-100' 
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90'
            }`}
          >
            {settings.seeMoreButtonText}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* OVERLAY PORTAL FOR EXPANDED CARD */}
      <AnimatePresence>
        {expandedId !== null && expandedTestimonial && expandedRect && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 pointer-events-none"
            >
                <motion.div
                    id="tf-expanded-overlay" 
                    // FIX NO 1: Key ensures React destroys old overlay and creates new one for clean switch
                    key={expandedId}
                    layoutId={`card-${expandedId}`} 
                    className={`${getCardStyles(true)} relative`}
                    onMouseEnter={() => setIsPaused(true)}
                    style={{
                        position: 'fixed',
                        top: expandedRect.top,
                        left: expandedRect.left,
                        width: expandedRect.width,
                        minHeight: expandedRect.height, 
                        height: 'auto', 
                        pointerEvents: 'auto' 
                    }}
                    onMouseLeave={handleOverlayLeave}
                    onClick={() => { setExpandedId(null); setIsPaused(false); }} 
                >
                    {renderCardContent(expandedTestimonial, expandedId, true)}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

const WallOfLove = ({ customSpaceId }) => (
  <WidgetErrorBoundary>
    <WallOfLoveContent customSpaceId={customSpaceId} />
  </WidgetErrorBoundary>
);

export default WallOfLove;