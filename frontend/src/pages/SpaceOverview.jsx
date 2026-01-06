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
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Constants to match WallOfLove exactly
const CARD_WIDTH = 300; 
const GAP = 24; // Gap-6 (24px)
const PADDING_X = 48; // SpaceOverview Card has p-6 (24px * 2 = 48px)

// --- Local Definition of StylishVideoPlayer ---
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

  // Form edit state
  const [formSettings, setFormSettings] = useState({
    header_title: '',
    custom_message: '',
    collect_star_rating: true,
  });

  // Widget settings
  const [widgetSettings, setWidgetSettings] = useState({
    layout: 'grid',
    theme: 'light',
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

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    updateDimensions();

    return () => observer.disconnect();
  }, [widgetSettings.layout, activeTab]); // Re-calc when tab changes to ensure size is correct

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
                  data-layout="${widgetSettings.layout}">
                  </script>
                  <div id="trustflow-widget"></div>`;
    navigator.clipboard.writeText(code);
    toast({ title: 'Embed code copied!' });
  };

  // --- Infinite Loop Navigation ---
  const handleNext = () => {
    const liked = testimonials.filter(t => t.is_liked);
    const maxIndex = Math.max(0, liked.length - visibleCount);
    
    if (carouselIndex >= maxIndex) {
      setCarouselIndex(0); // Loop to start
    } else {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    const liked = testimonials.filter(t => t.is_liked);
    const maxIndex = Math.max(0, liked.length - visibleCount);
    
    if (carouselIndex <= 0) {
      setCarouselIndex(maxIndex); // Loop to end
    } else {
      setCarouselIndex(prev => prev - 1);
    }
  };

  // Helper to determine card classes based on theme
  const getPreviewCardClasses = () => {
    const theme = widgetSettings.theme;
    const layout = widgetSettings.layout;
    
    let classes = 'p-6 rounded-xl shadow-sm border transition-all hover:shadow-md';
    
    // Theme
    if (theme === 'dark') {
      classes += ' bg-slate-900 border-slate-800 text-slate-100';
    } else {
      classes += ' bg-white border-slate-100 text-slate-800';
    }

    // Layout
    if (layout === 'masonry') {
      classes += ' break-inside-avoid mb-6 inline-block w-full';
    } else if (layout === 'carousel') {
      classes += ' flex-shrink-0 w-[300px]'; 
    }

    return classes;
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
        <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
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
          <TabsList className="mb-8">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox
              <Badge variant="secondary" className="ml-1">{testimonials.length}</Badge>
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
                <Button onClick={copySubmitLink}>
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
                    <Card className={`transition-all ${testimonial.is_liked ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10' : ''}`}>
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
                              <Button variant="outline" onClick={() => setSelectedVideo(testimonial.video_url)}>
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

          {/* Widget Tab */}
          <TabsContent value="widget">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Widget Settings</CardTitle>
                    <CardDescription>Configure your Wall of Love widget</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Layout</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['grid', 'masonry', 'carousel'].map((layout) => (
                          <Button
                            key={layout}
                            variant={widgetSettings.layout === layout ? 'default' : 'outline'}
                            onClick={() => {
                              setWidgetSettings({ ...widgetSettings, layout });
                              setCarouselIndex(0); // Reset carousel on layout change
                            }}
                            className="capitalize"
                          >
                            {layout}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['light', 'dark'].map((theme) => (
                          <Button
                            key={theme}
                            variant={widgetSettings.theme === theme ? 'default' : 'outline'}
                            onClick={() => setWidgetSettings({ ...widgetSettings, theme })}
                            className="capitalize"
                          >
                            {theme}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Embed Code</CardTitle>
                    <CardDescription>Add this code to your website</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <code>
                        {`<script src="${window.location.origin}/embed.js"`}<br />
                        {`  data-space-id="${spaceId}"`}<br />
                        {`  data-theme="${widgetSettings.theme}"`}<br />
                        {`  data-layout="${widgetSettings.layout}">`}<br /> 
                        {`</script>`}<br />
                        {`<div id="trustflow-widget"></div>`}
                      </code>
                    </div>
                    <Button onClick={copyEmbedCode} className="w-full mt-4">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Widget Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Widget Preview</CardTitle>
                  <CardDescription>{likedTestimonials.length} approved testimonials will be shown</CardDescription>
                </CardHeader>
                <CardContent 
                  ref={containerRef} 
                  className={`min-h-[400px] p-6 transition-colors relative group overflow-hidden ${widgetSettings.theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}
                >
                  {likedTestimonials.length === 0 ? (
                    <div className={`text-center py-12 ${widgetSettings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No approved testimonials yet.</p>
                      <p className="text-sm mt-2">Click the heart icon on testimonials to approve them.</p>
                    </div>
                  ) : (
                    <>
                      {/* Navigation Buttons (Only for Carousel + Hover) */}
                      {isCarousel && likedTestimonials.length > visibleCount && (
                        <>
                          <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200"
                            aria-label="Scroll left"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:scale-110 text-gray-700 dark:text-gray-200"
                            aria-label="Scroll right"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      {/* Mask Container */}
                      <div 
                        className="relative mx-auto transition-[width] duration-300 ease-in-out"
                        style={isCarousel ? { width: maskWidth, overflow: 'hidden' } : { width: '100%' }}
                      >
                        {/* Track */}
                        <div 
                          className={`
                            gap-6
                            ${
                              isCarousel
                                ? 'flex transition-transform duration-500 ease-out' 
                                : widgetSettings.layout === 'masonry'
                                ? 'block columns-1 md:columns-2 lg:columns-3 space-y-6'
                                : 'grid md:grid-cols-2 lg:grid-cols-3'
                            }
                          `}
                          style={isCarousel ? { 
                            transform: `translateX(-${carouselIndex * (CARD_WIDTH + GAP)}px)` 
                          } : {}}
                        >
                          {/* Carousel renders ALL items to slide. Grid/Masonry renders Slice */}
                          {(isCarousel ? likedTestimonials : likedTestimonials.slice(0, 6)).map((testimonial) => (
                            <div 
                              key={testimonial.id}
                              className={getPreviewCardClasses()}
                            >
                              <div className="flex items-center gap-1 mb-2">
                                {[...Array(testimonial.rating || 5)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              
                              {testimonial.type === 'video' && testimonial.video_url ? (
                                <StylishVideoPlayer videoUrl={testimonial.video_url} />
                              ) : (
                                <p className={`text-sm mb-4 leading-relaxed opacity-90 line-clamp-4`}>
                                  "{testimonial.content}"
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-auto">
                                {testimonial.respondent_photo_url ? (
                                  <img 
                                    src={testimonial.respondent_photo_url} 
                                    alt={testimonial.respondent_name}
                                    className="w-10 h-10 rounded-full object-cover border"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                    widgetSettings.theme === 'dark' ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-600'
                                  }`}>
                                    {testimonial.respondent_name?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-sm">{testimonial.respondent_name}</div>
                                  {testimonial.respondent_role && (
                                    <div className="text-xs opacity-70">{testimonial.respondent_role}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Video Testimonial</DialogTitle></DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedVideo && <video src={selectedVideo} controls autoPlay className="w-full h-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceOverview;