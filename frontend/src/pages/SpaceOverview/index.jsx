import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Copy, ExternalLink, Inbox, Edit, Code, Settings, Loader2, Share2, BarChart3 
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid'; 

// Import Sub-components
import InboxTab from './components/InboxTab';
import EditFormTab from './components/EditFormTab';
import ShareTab from './components/ShareTab';
import WidgetTab from './components/WidgetTab';
import SettingsTab from './components/SettingsTab';
import CTADashboardTab from './components/CTADashboardTab';

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

  // --- DEFAULTS ---
  const DEFAULT_THEME_CONFIG = {
    theme: 'light',
    accentColor: 'violet',
    customColor: '#8b5cf6',
    pageBackground: 'gradient-violet',
    viewMode: 'mobile'
  };

  const DEFAULT_WIDGET_SETTINGS = {
    layout: 'grid', theme: 'light', cardTheme: 'light', corners: 'smooth', shadow: 'medium', border: true, hoverEffect: 'lift',
    nameSize: 'medium', testimonialStyle: 'clean', animation: 'fade', speed: 'normal',
    cardSize: 'medium', placement: 'section', maxCount: 12, shuffle: false, gridRows: 2,
    autoScroll: false, scrollSpeed: 3, wallPadding: 'medium',
    showHeading: false, headingText: 'Wall of Love', headingFont: 'Inter', headingColor: '#000000', headingBold: true,
    showSubheading: false, subheadingText: 'What our happy customers say', subheadingFont: 'Inter', subheadingColor: '#64748b',
    carouselFocusZoom: false, carouselSameSize: true, 
    popupsEnabled: false,
    popupPosition: 'bottom-left', // or 'bottom-right'
    popupDelay: 2,     // seconds initial delay
    popupDuration: 5,  // seconds display time
    popupGap: 10,      // seconds between popups
    popupMessage: 'Someone just shared love!',
  };

  // --- STATE ---
  const [formSettings, setFormSettings] = useState({
    header_title: '',
    custom_message: '',
    collect_star_rating: true,
    collect_video: true,
    collect_photo: false,
    thank_you_title: 'Thank you!',
    thank_you_message: 'Your testimonial has been submitted.',
    theme_config: DEFAULT_THEME_CONFIG,
    logo_url: null
  });

  const [widgetSettings, setWidgetSettings] = useState(DEFAULT_WIDGET_SETTINGS);

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

  const fetchSpaceData = async () => {
    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select(`
          *,
          space_form_settings (*),
          widget_configurations (*)
        `)
        .eq('id', spaceId)
        .eq('owner_id', user.id)
        .single();

      if (spaceError) throw spaceError;

      setSpace(spaceData);

      // Handle Form Settings
      let fetchedFormSettings = {};
      if (Array.isArray(spaceData.space_form_settings) && spaceData.space_form_settings.length > 0) {
        fetchedFormSettings = spaceData.space_form_settings[0];
      } else if (spaceData.space_form_settings) {
        fetchedFormSettings = spaceData.space_form_settings;
      }

      setFormSettings({
        header_title: fetchedFormSettings.header_title || spaceData.header_title || '',
        custom_message: fetchedFormSettings.custom_message || spaceData.custom_message || '',
        collect_star_rating: fetchedFormSettings.collect_star_rating ?? true,
        collect_video: fetchedFormSettings.collect_video ?? true,
        collect_photo: fetchedFormSettings.collect_photo ?? false,
        thank_you_title: fetchedFormSettings.thank_you_title || 'Thank you!',
        thank_you_message: fetchedFormSettings.thank_you_message || 'Your testimonial has been submitted.',
        theme_config: { ...DEFAULT_THEME_CONFIG, ...(fetchedFormSettings.theme_config || {}) },
        logo_url: spaceData.logo_url 
      });

      // Handle Widget Settings
      let fetchedWidgetSettings = {};
      if (Array.isArray(spaceData.widget_configurations) && spaceData.widget_configurations.length > 0) {
        fetchedWidgetSettings = spaceData.widget_configurations[0].settings || {};
      } else if (spaceData.widget_configurations) {
        fetchedWidgetSettings = spaceData.widget_configurations.settings || {};
      }

      setWidgetSettings({
        ...DEFAULT_WIDGET_SETTINGS,
        ...fetchedWidgetSettings
      });

      // Fetch Testimonials
      const { data: testimonialsData, error: testimonialsError } = await supabase
        .from('testimonials')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (testimonialsError) throw testimonialsError;
      setTestimonials(testimonialsData || []);

    } catch (error) {
      console.error('Error fetching space:', error);
      toast.error('Unable to load space', {
        description: 'There was a problem loading your space data. Please refresh.',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateSpaceState = (newSpaceData) => {
    setSpace(prev => ({ ...prev, ...newSpaceData }));
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
      toast.error('Action Failed', { description: 'Could not update the testimonial status.' });
    }
  };

  const deleteTestimonial = async (testimonialId) => {
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', testimonialId);
      if (error) throw error;
      setTestimonials(prev => prev.filter(t => t.id !== testimonialId));
    } catch (error) {
      console.error("Delete failed in parent:", error);
      throw error; 
    }
  };

  const deleteSpace = async () => {
    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Delete Space failed:", error);
      throw error;
    }
  };

  const saveFormSettings = async (settingsToSave = formSettings, logoFile = null) => {
    setSaving(true);
    try {
      let finalLogoUrl = settingsToSave.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${spaceId}/${uuidv4()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('space_logos').upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('space_logos').getPublicUrl(fileName);
        finalLogoUrl = publicUrl;
      }

      const { logo_url, ...formSpecificSettings } = settingsToSave;

      await supabase.from('spaces').update({ logo_url: finalLogoUrl }).eq('id', spaceId);
      
      const { error: settingsError } = await supabase
        .from('space_form_settings')
        .upsert({ space_id: spaceId, ...formSpecificSettings }, { onConflict: 'space_id' });

      if (settingsError) throw settingsError;

      setSpace({ ...space, logo_url: finalLogoUrl });
      setFormSettings({ ...settingsToSave, logo_url: finalLogoUrl });

    } catch (error) {
      console.error(error);
      toast.error('Save Failed', { description: 'We could not save your changes.' });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveWidgetSettings = async (settingsToSave) => {
    try {
      const { error } = await supabase
        .from('widget_configurations')
        .upsert({ 
          space_id: spaceId,
          settings: settingsToSave
        }, { onConflict: 'space_id' });

      if (error) throw error;
      setWidgetSettings(settingsToSave);
      
    } catch (error) {
      console.error('Error saving widget settings:', error);
      throw error; 
    }
  };

  const copySubmitLink = () => {
    const link = `${window.location.origin}/submit/${space.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>;
  if (loading || !space) return <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20"><div className="container mx-auto px-4 py-8"><div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-8" /></div></div>;

  return (
    // UPDATED: Added MASTER KEY classes to hide scrollbars for ALL children ([&_*...])
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-background to-secondary/20 
      [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] 
      [&_*::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none] [&_*]:[-ms-overflow-style:none]">
      
      <Toaster richColors position="bottom-right" />

      {/* --- HEADER (MOBILE OPTIMIZED) --- */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            
            {/* Left: Back Btn + Title */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold truncate">{space.space_name}</h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">/{space.slug}</p>
              </div>
            </div>

            {/* Right: Actions (Full width on mobile) */}
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <Button variant="outline" className="flex-1 md:flex-none text-xs md:text-sm h-9 md:h-10" onClick={copySubmitLink}>
                <Copy className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none text-xs md:text-sm h-9 md:h-10" onClick={() => window.open(`/submit/${space.slug}`, '_blank')}>
                <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Preview Form
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          
          {/* --- TABS LIST --- */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0">
            <TabsList className="bg-white/50 dark:bg-gray-800/50 backdrop-blur p-1 inline-flex w-auto md:w-full md:flex-wrap h-auto min-w-full md:min-w-0 justify-start md:justify-center">
              
              <TabsTrigger value="inbox" className="flex items-center gap-2 flex-shrink-0">
                <Inbox className="w-4 h-4" />
                Inbox <Badge variant="secondary" className="ml-1 bg-violet-100 text-violet-700">{testimonials.length}</Badge>
              </TabsTrigger>

              <TabsTrigger value="roi-dashboard" className="flex items-center gap-2 flex-shrink-0">
                <BarChart3 className="w-4 h-4" />
                ROI Dashboard
              </TabsTrigger>
              
              <TabsTrigger value="edit-form" className="flex items-center gap-2 flex-shrink-0">
                <Edit className="w-4 h-4" />
                Edit Form
              </TabsTrigger>
              
              <TabsTrigger value="widget" className="flex items-center gap-2 flex-shrink-0">
                <Code className="w-4 h-4" />
                Widget
              </TabsTrigger>

              <TabsTrigger value="share" className="flex items-center gap-2 flex-shrink-0">
                <Share2 className="w-4 h-4" />
                Share & QR
              </TabsTrigger>
              
              <TabsTrigger value="settings" className="flex items-center gap-2 flex-shrink-0">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>

            </TabsList>
          </div>

          {/* --- CONTENT AREA --- */}
          <div className="mt-4 md:mt-8">
            <TabsContent value="inbox" className="mt-0">
              <InboxTab testimonials={testimonials} toggleLike={toggleLike} deleteTestimonial={deleteTestimonial} setSelectedVideo={setSelectedVideo} copySubmitLink={copySubmitLink} />
            </TabsContent>

            <TabsContent value="roi-dashboard" className="mt-0">
              <CTADashboardTab spaceId={spaceId} />
            </TabsContent>

            <TabsContent value="edit-form" className="mt-0">
              <EditFormTab 
                formSettings={formSettings}
                setFormSettings={setFormSettings}
                saveFormSettings={saveFormSettings}
                saving={saving}
              />
            </TabsContent>

            <TabsContent value="share" className="mt-0">
              <ShareTab space={space} />
            </TabsContent>

            <TabsContent value="widget" className="mt-0">
              <WidgetTab 
                testimonials={testimonials} 
                spaceId={spaceId} 
                activeTab={activeTab}
                widgetSettings={widgetSettings}
                setWidgetSettings={setWidgetSettings}
                saveWidgetSettings={saveWidgetSettings}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <SettingsTab 
                space={space} 
                spaceId={spaceId} 
                navigate={navigate} 
                copySubmitLink={copySubmitLink}
                deleteSpace={deleteSpace}
                updateSpaceState={updateSpaceState}
                userEmail={user?.email} 
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>

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