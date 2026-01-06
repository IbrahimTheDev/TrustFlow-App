import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Heart, HeartOff, ArrowLeft, Copy, ExternalLink, Video, FileText, 
  Star, Trash2, Play, Loader2, Settings, Code, Inbox, Edit,
  ChevronLeft, ChevronRight, Layout, Palette, BoxSelect, Sparkles, 
  Square, Circle, MousePointerClick, Zap, Check, X,
  Grid3X3, GalleryHorizontal, StretchHorizontal, AlignJustify,
  Gauge, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Constants to match WallOfLove exactly
const CARD_WIDTH = 300; 
const GAP = 24; 
const PADDING_X = 48; 

// --- Local Definition of StylishVideoPlayer ---
const StylishVideoPlayer = ({ videoUrl, corners = 'rounded-xl' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
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

// --- Premium Toggle Component ---
const PremiumToggle = ({ options, current, onChange, id }) => (
  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg relative isolate">
    {options.map((opt) => {
      const Icon = opt.icon;
      const isActive = current === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          type="button"
          className={`
            relative flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium transition-colors z-10
            ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
          `}
        >
          {isActive && (
            <motion.span
              layoutId={`active-pill-${id}`}
              className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm border border-black/5 dark:border-white/5 -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span className="capitalize whitespace-nowrap">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
    <Icon className="w-3.5 h-3.5" />
    {title}
  </div>
);

const SpaceOverview = () => {
  const { spaceId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [space, setSpace] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [maskWidth, setMaskWidth] = useState('100%');
  const containerRef = useRef(null);
  
  // Animation Replay Trigger
  const [replayTrigger, setReplayTrigger] = useState(0);

  // Form edit state
  const [formSettings, setFormSettings] = useState({
    header_title: '',
    custom_message: '',
    collect_star_rating: true,
  });

  // Premium Widget settings
  const [widgetSettings, setWidgetSettings] = useState({
    layout: 'grid',       // grid, masonry, carousel, list
    theme: 'light',       // light, dark, transparent
    corners: 'smooth',    // sharp, smooth, round
    shadow: 'medium',     // none, light, medium, strong
    border: true,
    animation: 'fade',    // fade, slideUp, slideDown, scale, pop, flip, elastic, none
    speed: 'normal'       // slow, normal, fast
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && spaceId) {
      fetchSpaceData();
    }
  }, [user, spaceId]);

  // --- Strict Fit Calculation (Matches WallOfLove) ---
  useEffect(() => {
    // We only need specific calculations for Carousel
    if (widgetSettings.layout !== 'carousel' || !containerRef.current) {
      setMaskWidth('100%');
      return;
    }

    const updateDimensions = () => {
      if (containerRef.current) {
        // Measure parent width
        const rect = containerRef.current.getBoundingClientRect();
        // Subtract padding (p-6 = 48px)
        const availableWidth = rect.width - PADDING_X;
        
        // Calculate fit
        const count = Math.floor((availableWidth + GAP) / (CARD_WIDTH + GAP));
        const safeCount = Math.max(1, count);
        
        setVisibleCount(safeCount);
        
        // Exact Width Calculation
        const exactWidth = (safeCount * CARD_WIDTH) + ((safeCount - 1) * GAP);
        setMaskWidth(`${exactWidth}px`);
      }
    };

    // Initial calculation
    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [widgetSettings.layout, activeTab]); 

  // Trigger animation replay when animation settings change
  useEffect(() => {
    setReplayTrigger(prev => prev + 1);
  }, [widgetSettings.animation, widgetSettings.speed]);

  const fetchSpaceData = async () => {
    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .eq('owner_id', user.id)
        .single();

      if (spaceError) throw spaceError;
      setSpace(spaceData);
      setFormSettings({
        header_title: spaceData.header_title || '',
        custom_message: spaceData.custom_message || '',
        collect_star_rating: spaceData.collect_star_rating ?? true,
      });

      const { data: testimonialsData, error: testimonialsError } = await supabase
        .from('testimonials')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (testimonialsError) throw testimonialsError;
      setTestimonials(testimonialsData || []);
    } catch (error) {
      console.error('Error fetching space:', error);
      toast({
        title: 'Error',
        description: 'Failed to load space data.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (testimonialId, currentValue) => {
    setTestimonials(testimonials.map(t => 
      t.id === testimonialId ? { ...t, is_liked: !currentValue } : t
    ));

    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ is_liked: !currentValue })
        .eq('id', testimonialId);

      if (error) throw error;
    } catch (error) {
      setTestimonials(testimonials.map(t => 
        t.id === testimonialId ? { ...t, is_liked: currentValue } : t
      ));
      toast({
        title: 'Error',
        description: 'Failed to update testimonial.',
        variant: 'destructive',
      });
    }
  };

  const deleteTestimonial = async (testimonialId) => {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', testimonialId);

      if (error) throw error;
      setTestimonials(testimonials.filter(t => t.id !== testimonialId));
      toast({ title: 'Testimonial deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete testimonial.',
        variant: 'destructive',
      });
    }
  };

  const saveFormSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('spaces')
        .update(formSettings)
        .eq('id', spaceId);

      if (error) throw error;
      setSpace({ ...space, ...formSettings });
      toast({ title: 'Settings saved!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copySubmitLink = () => {
    const link = `${window.location.origin}/submit/${space.slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied!' });
  };

  const copyEmbedCode = () => {
    const code = `<script 
  src="${window.location.origin}/embed.js" 
  data-space-id="${spaceId}" 
  data-theme="${widgetSettings.theme}"
  data-layout="${widgetSettings.layout}"
  data-corners="${widgetSettings.corners}"
  data-shadow="${widgetSettings.shadow}"
  data-border="${widgetSettings.border}"
  data-animation="${widgetSettings.animation}"
  data-animation-speed="${widgetSettings.speed}">
</script>`;
    navigator.clipboard.writeText(code);
    toast({ title: 'Embed code copied!', description: 'Code includes all your selected customizations.' });
  };

  // --- Infinite Loop Navigation ---
  const handleNext = () => {
    const liked = testimonials.filter(t => t.is_liked);
    const maxIndex = Math.max(0, liked.length - visibleCount);
    
    if (carouselIndex >= maxIndex) {
      setCarouselIndex(0); 
    } else {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    const liked = testimonials.filter(t => t.is_liked);
    const maxIndex = Math.max(0, liked.length - visibleCount);
    
    if (carouselIndex <= 0) {
      setCarouselIndex(maxIndex); 
    } else {
      setCarouselIndex(prev => prev - 1);
    }
  };

  // --- Dynamic Style Generator ---
  const getPreviewCardStyles = () => {
    const { theme, layout, corners, shadow, border } = widgetSettings;
    
    let classes = 'p-6 transition-all duration-300 ';
    
    // Corners
    if (corners === 'sharp') classes += 'rounded-none ';
    else if (corners === 'round') classes += 'rounded-3xl ';
    else classes += 'rounded-xl '; // smooth

    // Shadow
    if (shadow === 'none') classes += 'shadow-none ';
    else if (shadow === 'light') classes += 'shadow-sm hover:shadow-md ';
    else if (shadow === 'strong') classes += 'shadow-xl hover:shadow-2xl ';
    else classes += 'shadow-md hover:shadow-lg '; // medium

    // Theme & Border
    if (theme === 'dark') {
      classes += 'bg-slate-900 text-slate-100 ';
      classes += border ? 'border border-slate-800 ' : 'border-0 ';
    } else {
      classes += 'bg-white text-slate-800 ';
      classes += border ? 'border border-slate-100 ' : 'border-0 ';
    }

    // Layout Specifics
    if (layout === 'masonry') {
      classes += 'break-inside-avoid mb-6 inline-block w-full ';
    } else if (layout === 'carousel') {
      classes += 'flex-shrink-0 w-[300px] '; 
    } else if (layout === 'list') {
      classes += 'w-full mb-4 ';
    }

    return classes;
  };

  // --- Animation Variants ---
  const getAnimationVariants = () => {
    const { animation, speed } = widgetSettings;
    
    // Calculate durations based on speed setting
    const durations = {
      slow: 0.8,
      normal: 0.5,
      fast: 0.3
    };
    const dur = durations[speed] || 0.5;
    const stagger = speed === 'fast' ? 0.05 : 0.1;

    switch(animation) {
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 50 },
          visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * stagger, duration: dur, ease: "easeOut" } })
        };
      case 'slideDown':
        return {
          hidden: { opacity: 0, y: -50 },
          visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * stagger, duration: dur, ease: "easeOut" } })
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: (i) => ({ opacity: 1, scale: 1, transition: { delay: i * stagger, duration: dur } })
        };
      case 'pop':
        return {
          hidden: { opacity: 0, scale: 0.5 },
          visible: (i) => ({ opacity: 1, scale: 1, transition: { delay: i * stagger, type: 'spring', stiffness: 300, damping: 20 } })
        };
      case 'flip':
        return {
          hidden: { opacity: 0, rotateX: 90 },
          visible: (i) => ({ opacity: 1, rotateX: 0, transition: { delay: i * stagger, duration: dur } })
        };
      case 'elastic':
        return {
          hidden: { opacity: 0, x: -100 },
          visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * stagger, type: 'spring', bounce: 0.6 } })
        };
      case 'none':
        return {
          hidden: { opacity: 1 },
          visible: { opacity: 1 }
        };
      case 'fade':
      default:
        return {
          hidden: { opacity: 0 },
          visible: (i) => ({ opacity: 1, transition: { delay: i * stagger, duration: dur } })
        };
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (loading || !space) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-8" />
        </div>
      </div>
    );
  }

  const likedTestimonials = testimonials.filter(t => t.is_liked);
  const isCarousel = widgetSettings.layout === 'carousel';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{space.space_name}</h1>
              <p className="text-sm text-muted-foreground">/{space.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copySubmitLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open(`/submit/${space.slug}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Form
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur p-1">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox
              <Badge variant="secondary" className="ml-1 bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {testimonials.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="edit-form" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Form
            </TabsTrigger>
            <TabsTrigger value="widget" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Widget
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Inbox Tab */}
          <TabsContent value="inbox">
            {testimonials.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                  <Inbox className="w-10 h-10 text-violet-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No testimonials yet</h2>
                <p className="text-muted-foreground mb-6">Share your collection link to start receiving testimonials.</p>
                <Button onClick={copySubmitLink} className="bg-gradient-to-r from-violet-600 to-indigo-600">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Collection Link
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`transition-all hover:shadow-md ${testimonial.is_liked ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={testimonial.respondent_photo_url} />
                            <AvatarFallback className="bg-violet-100 text-violet-600">
                              {testimonial.respondent_name?.charAt(0).toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{testimonial.respondent_name}</span>
                              {testimonial.respondent_role && (
                                <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                  {testimonial.respondent_role}
                                </span>
                              )}
                              {testimonial.type === 'video' && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  Video
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {testimonial.respondent_email}
                            </div>
                            {testimonial.rating && (
                              <div className="flex items-center gap-1 mb-3">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            )}
                            {testimonial.type === 'video' ? (
                              <Button variant="outline" size="sm" onClick={() => setSelectedVideo(testimonial.video_url)}>
                                <Play className="w-4 h-4 mr-2" />
                                Play Video
                              </Button>
                            ) : (
                              <p className="text-foreground/90">"{testimonial.content}"</p>
                            )}
                            <div className="text-xs text-muted-foreground mt-3">
                              {new Date(testimonial.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLike(testimonial.id, testimonial.is_liked)}
                              className={testimonial.is_liked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}
                            >
                              {testimonial.is_liked ? <Heart className="w-5 h-5 fill-current" /> : <HeartOff className="w-5 h-5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTestimonial(testimonial.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Edit Form Tab */}
          <TabsContent value="edit-form">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Form Settings</CardTitle>
                  <CardDescription>Customize how your collection form looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="header_title">Header Title</Label>
                    <Input
                      id="header_title"
                      value={formSettings.header_title}
                      onChange={(e) => setFormSettings({ ...formSettings, header_title: e.target.value })}
                      placeholder="Share your experience..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom_message">Custom Message</Label>
                    <Textarea
                      id="custom_message"
                      value={formSettings.custom_message}
                      onChange={(e) => setFormSettings({ ...formSettings, custom_message: e.target.value })}
                      placeholder="We appreciate your feedback..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Star Rating</Label>
                      <p className="text-sm text-muted-foreground">Allow respondents to give a star rating</p>
                    </div>
                    <Switch
                      checked={formSettings.collect_star_rating}
                      onCheckedChange={(checked) => setFormSettings({ ...formSettings, collect_star_rating: checked })}
                    />
                  </div>
                  <Button onClick={saveFormSettings} disabled={saving} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-100 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>See how your form looks to respondents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg max-w-sm mx-auto">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <Star className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold">{formSettings.header_title || 'Share your experience'}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{formSettings.custom_message || 'We appreciate your feedback!'}</p>
                    </div>
                    <div className="space-y-3">
                      <Button className="w-full" variant="outline"><Video className="w-4 h-4 mr-2" />Record Video</Button>
                      <Button className="w-full" variant="outline"><FileText className="w-4 h-4 mr-2" />Write Text</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Widget Tab - NEW PREMIUM DESIGNER */}
          <TabsContent value="widget" className="mt-0">
            <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-200px)] min-h-[800px]">
              
              {/* Left Column: Control Deck */}
              <Card className="w-full xl:w-[400px] flex flex-col border-violet-100 dark:border-violet-900/20 shadow-xl shadow-violet-500/5 bg-white/80 backdrop-blur-sm overflow-hidden flex-shrink-0">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="w-5 h-5 text-violet-600 fill-violet-100" />
                        Widget Designer
                      </CardTitle>
                      <CardDescription>Customize your wall of love</CardDescription>
                    </div>
                    <Button size="sm" onClick={copyEmbedCode} className="bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20 text-xs">
                       <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Code
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                  
                  {/* Layout Section */}
                  <div>
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
                  </div>

                  <Separator />

                  {/* Appearance Section */}
                  <div>
                    <SectionHeader icon={Palette} title="Visual Appearance" />
                    <div className="space-y-4">
                      {/* Theme */}
                      <div>
                        <Label className="text-xs text-slate-500 mb-1.5 block">Color Theme</Label>
                        <PremiumToggle 
                          id="theme"
                          current={widgetSettings.theme}
                          onChange={(val) => setWidgetSettings({ ...widgetSettings, theme: val })}
                          options={[
                            { label: 'Light', value: 'light' },
                            { label: 'Dark', value: 'dark' },
                            { label: 'Transparent', value: 'transparent' },
                          ]}
                        />
                      </div>

                      {/* Card Styling Group */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border space-y-4">
                         {/* Corners */}
                         <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Card Corners</Label>
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
                         {/* Shadows */}
                         <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Shadow Intensity</Label>
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
                         {/* Border */}
                         <div className="flex items-center justify-between pt-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Show Borders</Label>
                            <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 border shadow-sm">
                               <button onClick={() => setWidgetSettings({ ...widgetSettings, border: true })} className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${widgetSettings.border ? 'bg-violet-100 text-violet-600' : 'text-slate-300'}`}><Check className="w-3.5 h-3.5" /></button>
                               <button onClick={() => setWidgetSettings({ ...widgetSettings, border: false })} className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${!widgetSettings.border ? 'bg-red-50 text-red-500' : 'text-slate-300'}`}><X className="w-3.5 h-3.5" /></button>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Animation Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                       <SectionHeader icon={Sparkles} title="Motion & Effects" />
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 hover:text-violet-700"
                          onClick={() => setReplayTrigger(prev => prev + 1)}
                          title="Replay Animation"
                       >
                          <RefreshCw className="h-3 w-3" />
                       </Button>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">Entrance Animation</Label>
                          <div className="grid grid-cols-2 gap-2">
                             {['fade', 'slideUp', 'slideDown', 'scale', 'pop', 'flip', 'elastic', 'none'].map((anim) => (
                               <Button
                                 key={anim}
                                 variant={widgetSettings.animation === anim ? "default" : "outline"}
                                 size="sm"
                                 onClick={() => setWidgetSettings({ ...widgetSettings, animation: anim })}
                                 className={`justify-start capitalize text-xs h-8 ${widgetSettings.animation === anim ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
                               >
                                 {widgetSettings.animation === anim && <Sparkles className="w-3 h-3 mr-2 text-violet-200" />}
                                 {anim.replace(/([A-Z])/g, ' $1').trim()}
                               </Button>
                             ))}
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

                </CardContent>
              </Card>

              {/* Right Column: Live Canvas */}
              <div className="flex-1 flex flex-col min-w-0">
                 <div className="flex items-center justify-between mb-2 px-2">
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="bg-white/50 backdrop-blur border-violet-200 text-violet-700 animate-pulse">
                          Live Preview
                       </Badge>
                       <span className="text-xs text-muted-foreground">{likedTestimonials.length} testimonials approved</span>
                    </div>
                    {isCarousel && (
                       <div className="text-xs text-muted-foreground">Carousel Mode</div>
                    )}
                 </div>

                 <Card className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 overflow-hidden relative shadow-inner">
                    <CardContent 
                       ref={containerRef}
                       className={`h-full w-full p-8 transition-colors duration-500 overflow-y-auto custom-scrollbar 
                         ${widgetSettings.theme === 'dark' ? 'bg-slate-950' : widgetSettings.theme === 'transparent' ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]' : 'bg-slate-50'}
                       `}
                    >
                       {likedTestimonials.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Star className="w-16 h-16 opacity-20 mb-4" />
                           <p>No approved testimonials yet.</p>
                         </div>
                       ) : (
                         <>
                           {/* Carousel Controls */}
                           {isCarousel && likedTestimonials.length > visibleCount && (
                             <>
                               <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-110 transition-all"><ChevronLeft className="w-5 h-5 text-slate-700" /></button>
                               <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-110 transition-all"><ChevronRight className="w-5 h-5 text-slate-700" /></button>
                             </>
                           )}

                           <div 
                             key={widgetSettings.layout} // Force re-render on layout change to fix measurement bugs
                             className="relative mx-auto transition-all duration-300"
                             style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%', maxWidth: '1000px' }}
                           >
                              <motion.div
                                layout // Framer Motion layout prop helps smoothen grid/list changes
                                className={`
                                  ${isCarousel ? 'flex gap-6' : ''}
                                  ${widgetSettings.layout === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}
                                  ${widgetSettings.layout === 'masonry' ? 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6' : ''}
                                  ${widgetSettings.layout === 'list' ? 'max-w-2xl mx-auto flex flex-col gap-4' : ''}
                                `}
                                style={isCarousel ? { transform: `translateX(-${carouselIndex * (CARD_WIDTH + GAP)}px)`, transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' } : {}}
                              >
                                 <AnimatePresence mode='wait'>
                                    {(isCarousel ? likedTestimonials : likedTestimonials).map((testimonial, i) => (
                                       <motion.div
                                         key={`${testimonial.id}-${replayTrigger}`} // Key change forces re-animation
                                         custom={i}
                                         initial="hidden"
                                         animate="visible"
                                         variants={getAnimationVariants()}
                                         className={getPreviewCardStyles()}
                                       >
                                          {/* Testimonial Content */}
                                          <div className="flex items-center gap-1 mb-3">
                                             {[...Array(testimonial.rating || 5)].map((_, idx) => (
                                                <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                             ))}
                                          </div>

                                          {testimonial.type === 'video' && testimonial.video_url ? (
                                             <StylishVideoPlayer videoUrl={testimonial.video_url} corners={widgetSettings.corners === 'sharp' ? 'rounded-none' : 'rounded-xl'} />
                                          ) : (
                                             <p className="text-sm leading-relaxed opacity-90 mb-4 line-clamp-6">{testimonial.content}</p>
                                          )}

                                          <div className="flex items-center gap-3 pt-4 border-t border-dashed border-gray-200/10 mt-auto">
                                             <Avatar className="w-8 h-8 border border-white/20">
                                                <AvatarImage src={testimonial.respondent_photo_url} />
                                                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{testimonial.respondent_name?.charAt(0)}</AvatarFallback>
                                             </Avatar>
                                             <div>
                                                <div className="text-xs font-bold">{testimonial.respondent_name}</div>
                                                <div className="text-[10px] opacity-70">{testimonial.respondent_role || 'Verified User'}</div>
                                             </div>
                                          </div>
                                       </motion.div>
                                    ))}
                                 </AnimatePresence>
                              </motion.div>
                           </div>
                         </>
                       )}
                    </CardContent>
                 </Card>
              </div>

            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Space Settings</CardTitle>
                <CardDescription>Manage your space configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Space Name</Label>
                  <Input value={space.space_name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Collection URL</Label>
                  <div className="flex gap-2">
                    <Input value={`${window.location.origin}/submit/${space.slug}`} readOnly />
                    <Button variant="outline" onClick={copySubmitLink}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="destructive" onClick={() => {
                    if (window.confirm('Are you sure? This will delete all testimonials.')) {
                      supabase.from('spaces').delete().eq('id', spaceId).then(() => navigate('/dashboard'));
                    }
                  }}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete Space
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-none">
          <div className="aspect-video w-full">
            {selectedVideo && <video src={selectedVideo} controls autoPlay className="w-full h-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceOverview;