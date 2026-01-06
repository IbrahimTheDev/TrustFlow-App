import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom'; 
import { supabase } from '@/lib/supabase';
import { Star, Play, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import '@/index.css';

const CARD_WIDTH = 300; 
const GAP = 24; // Gap-6 (24px)
const PADDING_X = 32; // Container p-4 (16px * 2)

// --- Custom Video Player Component ---
const StylishVideoPlayer = ({ videoUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black shadow-md ring-1 ring-black/5 aspect-video mb-4">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors backdrop-blur-[1px] cursor-pointer z-10"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
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

const WallOfLove = () => {
  const { spaceId } = useParams(); 
  const [searchParams] = useSearchParams();
  
  // Refs
  const outerContainerRef = useRef(null); 
  
  // State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [maskWidth, setMaskWidth] = useState('100%');
  
  const theme = searchParams.get('theme') || 'light';
  const layout = searchParams.get('layout') || 'grid';
  
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. Transparent Background Setup ---
  useEffect(() => {
    document.body.classList.add('force-transparent');
    document.documentElement.classList.add('force-transparent'); 
    return () => {
      document.body.classList.remove('force-transparent');
      document.documentElement.classList.remove('force-transparent');
    };
  }, []);

  // --- 2. Fetch Data ---
  useEffect(() => {
    if (spaceId) fetchTestimonials();
  }, [spaceId]);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_liked', true) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Resize Logic (Auto Fit & Height Reporting) ---
  useEffect(() => {
    const handleResize = () => {
      if (outerContainerRef.current) {
        // Report Height to Parent (Iframe)
        const height = outerContainerRef.current.scrollHeight;
        window.parent.postMessage({ type: 'trustflow-resize', height }, '*');

        // Smart Carousel Calculation
        if (layout === 'carousel') {
          const rect = outerContainerRef.current.getBoundingClientRect();
          const availableWidth = rect.width - PADDING_X; // Subtract padding
          
          // Calculate how many 300px cards fit
          const count = Math.floor((availableWidth + GAP) / (CARD_WIDTH + GAP));
          const safeCount = Math.max(1, count); // Minimum 1 card
          
          setVisibleCount(safeCount);
          
          // Calculate exact width for the Mask Div
          const exactWidth = (safeCount * CARD_WIDTH) + ((safeCount - 1) * GAP);
          setMaskWidth(`${exactWidth}px`);
        } else {
          setMaskWidth('100%');
        }
      }
    };

    // Initial check
    handleResize();

    // Observer for robust resizing
    const observer = new ResizeObserver(handleResize);
    if (outerContainerRef.current) {
      observer.observe(outerContainerRef.current);
    }

    return () => observer.disconnect();
  }, [testimonials, layout, loading]);

  // --- 4. Infinite Loop Navigation ---
  const handleNext = () => {
    // If we are near the end (showing the last possible full set), loop to start
    const maxIndex = Math.max(0, testimonials.length - visibleCount);
    
    if (carouselIndex >= maxIndex) {
      setCarouselIndex(0); // Infinite Loop -> Go to Start
    } else {
      setCarouselIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    // If we are at start, loop to end
    const maxIndex = Math.max(0, testimonials.length - visibleCount);
    
    if (carouselIndex <= 0) {
      setCarouselIndex(maxIndex); // Infinite Loop -> Go to End
    } else {
      setCarouselIndex((prev) => prev - 1);
    }
  };

  if (loading) return <div className="p-4 text-center"></div>;

  if (testimonials.length === 0) {
    return (
      <div ref={outerContainerRef} className="p-8 text-center text-gray-500">
        <p>No testimonials yet</p>
      </div>
    );
  }

  const isCarousel = layout === 'carousel';

  return (
    // Outer Container: Relative for positioning buttons, Group for hover effects
    <div ref={outerContainerRef} className="p-4 bg-transparent w-full relative group">
      
      {/* --- Navigation Buttons (Only for Carousel & if needed) --- */}
      {isCarousel && testimonials.length > visibleCount && (
        <>
          {/* Left Button */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Right Button */}
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* --- Mask Container (The Viewport) --- */}
      <div 
        className="relative mx-auto transition-[width] duration-300 ease-in-out"
        style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%' }}
      >
        {/* --- Sliding Track --- */}
        <div 
          className={`
            gap-6
            ${
              isCarousel 
                ? 'flex transition-transform duration-500 ease-out' // Carousel = Flex + Slide
                : layout === 'masonry'
                ? 'block columns-1 md:columns-2 lg:columns-3 space-y-6' // Masonry = Block + Columns
                : 'grid md:grid-cols-2 lg:grid-cols-3' // Grid = Grid
            }
          `}
          style={isCarousel ? { 
            transform: `translateX(-${carouselIndex * (CARD_WIDTH + GAP)}px)` 
          } : {}}
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className={`
                p-6 rounded-xl shadow-sm border transition-all hover:shadow-md
                ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'} 
                ${layout === 'masonry' ? 'break-inside-avoid mb-6 inline-block w-full' : ''}
                ${isCarousel ? 'flex-shrink-0 w-[300px]' : ''} 
              `}
            >
              {/* Rating */}
              {testimonial.rating && ( 
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Content */}
              {testimonial.type === 'video' && testimonial.video_url ? (
                <StylishVideoPlayer videoUrl={testimonial.video_url} />
              ) : (
                <p className={`text-sm mb-4 leading-relaxed opacity-90`}>
                  "{testimonial.content}"
                </p>
              )}

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                {testimonial.respondent_photo_url ? (
                  <img 
                    src={testimonial.respondent_photo_url} 
                    alt={testimonial.respondent_name}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    theme === 'dark' 
                      ? 'bg-violet-900/50 text-violet-300' 
                      : 'bg-violet-100 text-violet-600'
                  }`}>
                    {testimonial.respondent_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                
                <div>
                  <div className={`font-medium text-sm`}>
                    {testimonial.respondent_name || "Anonymous"}
                  </div>
                  {testimonial.respondent_role && (
                    <div className={`text-xs opacity-70`}>
                      {testimonial.respondent_role}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WallOfLove;