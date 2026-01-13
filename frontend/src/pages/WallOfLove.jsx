import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom'; 
import { supabase } from '@/lib/supabase';
import { Star, Play, ChevronLeft, ChevronRight, BadgeCheck, Loader2 } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import '@/index.css';

const CARD_WIDTH = 300; 
const GAP = 24; 
const PADDING_X = 32; 

// --- 1. ERROR BOUNDARY ---
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) {
    console.error("TrustFlow Widget Error:", error);
  }
  render() {
    if (this.state.hasError) return null; 
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
    scrollSpeed: 3
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
    if (spaceId) {
        Promise.all([fetchTestimonials(), fetchSettings()]).finally(() => setLoading(false));
    }
  }, [spaceId]);

  const fetchSettings = async () => {
    try {
        const { data } = await supabase
            .from('widget_configurations')
            .select('settings')
            .eq('space_id', spaceId)
            .single();
        if (data?.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }));
        }
    } catch (e) { console.warn("Using default settings."); }
  };

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_liked', true) 
      .order('created_at', { ascending: false });
    setTestimonials(data || []);
  };

  // --- 5. Logic: Shuffle & Loop ---
  const displayedTestimonials = useMemo(() => {
    let result = [...testimonials];
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
        // Calculate needed bottom space relative to viewport/document
        const neededHeight = rect.bottom + 60; 
        if (neededHeight > height) {
             height = neededHeight;
        }
    }

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
    if (loading || !outerContainerRef.current) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(outerContainerRef.current);
    handleResize();
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
    // FIX NO 2: Removed generic 'transition-all' from base string
    let classes = 'p-5 md:p-6 flex flex-col ';
    
    // Condition to STOP floating/sliding on overlay
    if (!isOverlay) {
        classes += 'transition-all duration-300 ';
    } else {
        // Overlay only transitions non-layout properties
        classes += 'transition-[box-shadow,transform,background-color,border-color,opacity] duration-300 ';
    }
    
    // --- Height Logic ---
    if (isOverlay) {
        classes += 'h-auto '; 
    } else if (layout === 'masonry') {
        classes += 'h-auto ';
    } else {
        if (carouselSameSize) classes += '!h-full '; 
        else classes += 'h-auto ';
    }
    
    // Radius
    if (corners === 'sharp') classes += 'rounded-none ';
    else if (corners === 'round') classes += 'rounded-3xl ';
    else classes += 'rounded-xl ';

    // Shadow
    if (isOverlay) {
        classes += 'shadow-2xl ring-1 ring-black/5 '; 
    } else {
        if (shadow === 'none') classes += 'shadow-none ';
        else if (shadow === 'light') classes += 'shadow-sm ';
        else if (shadow === 'strong') classes += 'shadow-xl ';
        else classes += 'shadow-md ';
    }

    // Hover (Visuals apply to both now for consistency)
    if (hoverEffect === 'lift') classes += 'hover:-translate-y-1 hover:shadow-lg ';
    else if (hoverEffect === 'scale') classes += 'hover:scale-[1.01] hover:shadow-lg ';
    else if (hoverEffect === 'glow') classes += 'hover:shadow-violet-500/20 hover:border-violet-300 ';
    

    // Theme
    if (cardTheme === 'dark') classes += 'bg-slate-900 text-slate-100 ' + (border ? 'border border-slate-800 ' : 'border-0 ');
    else classes += 'bg-white text-slate-800 ' + (border ? 'border border-slate-100 ' : 'border-0 ');

    if (layout === 'masonry') classes += 'break-inside-avoid mb-6 inline-block w-full ';
    else if (layout === 'carousel') classes += 'flex-shrink-0 w-[85vw] sm:w-[300px] '; 
    else if (layout === 'list') classes += 'w-full mb-4 ';

    if (isOverlay) classes += ' z-50 pointer-events-auto ';

    return classes;
  };

  // Interaction Handlers (Now controls Pause + Expand)
  const handleMouseEnter = (e, index, isOverflowing) => {
    setIsPaused(true); // PAUSE
    // STRICT CHECK: Only expand if strict overflow was detected
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
    if (!isOverflowing) return; // Strict check
    
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
        if (expandedId === index) {
            setExpandedId(null);
            setIsPaused(false); // Resume if closing
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

  // --- RENDER ---
  if (loading) return <div className="min-h-[200px] flex items-center justify-center bg-transparent"><Loader2 className="w-6 h-6 animate-spin text-gray-400"/></div>;
  if (testimonials.length === 0) return <div ref={outerContainerRef} className="p-8 text-center text-gray-500">No testimonials yet</div>;

  const isCarousel = settings.layout === 'carousel';
  const bubbleBgClass = settings.cardTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
  const shouldAnimate = !settings.autoScroll; 

  // --- CARD CONTENT GENERATOR ---
  const renderCardContent = (testimonial, index, forOverlay = false) => {
    const isBubble = settings.testimonialStyle === 'bubble';
    
    return (
        <>
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
      className="w-full relative group font-sans py-12" 
      style={{ minHeight: '100px' }}
      // GLOBAL PAUSE HANDLER for entire area
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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

      {isCarousel && testimonials.length > visibleCount && (
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
        className="relative mx-auto transition-[width] duration-300 ease-in-out"
        style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%' }}
      >
        <motion.div 
          ref={carouselConstraintsRef}
          className={`
            ${isCarousel ? `flex gap-4 sm:gap-6 py-8 sm:py-12 px-5 sm:px-6 cursor-grab active:cursor-grabbing ${settings.carouselSameSize ? 'items-stretch' : 'items-start'}` : ''} 
            ${settings.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 sm:p-4' : ''}
            ${settings.layout === 'masonry' ? 'block columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 p-2 sm:p-4' : ''}
            ${settings.layout === 'list' ? 'max-w-2xl mx-auto flex flex-col gap-4 p-2 sm:p-4' : ''}
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
                    layoutId={`card-${i}`} // Sync ID with overlay
                    initial={shouldAnimate ? "hidden" : "visible"}
                    whileInView="visible"
                    viewport={{ once: true, margin: "-10%" }} 
                    variants={variants}
                    animate={isFocused ? { scale: 1.05, opacity: 1, zIndex: 10 } : undefined}
                    className={`relative group/card ${settings.carouselSameSize && !isCarousel ? 'h-full' : ''} ${settings.layout === 'masonry' ? 'mb-6 h-auto' : ''} ${isOverflowing ? 'cursor-zoom-in' : ''}`}
                    
                    // Trigger Expansion & Pause
                    onMouseEnter={(e) => handleMouseEnter(e, i, isOverflowing)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleMobileClick(e, i, isOverflowing)}
                    
                    // Hide base card when expanded
                    style={{ opacity: expandedId === i ? 0 : 1 }}
                  >
                    <div className={getCardStyles(false)}>
                        {renderCardContent(testimonial, i, false)}
                    </div>
                  </motion.div>
                );
            })}
        </motion.div>
      </div>

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
                    className={getCardStyles(true)}
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