import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Heart, HeartOff, ArrowLeft, Copy, ExternalLink, Video, FileText, 
  Star, Trash2, Play, Loader2, Settings, Code, Inbox, Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const fetchSpaceData = async () => {
    try {
      // Fetch space
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

      // Fetch testimonials
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
    // Optimistic update
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
      // Revert on error
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
    const code = `<script src="${window.location.origin}/embed.js" data-space-id="${spaceId}" data-theme="${widgetSettings.theme}"></script>\n<div id="trustflow-widget"></div>`;
    navigator.clipboard.writeText(code);
    toast({ title: 'Embed code copied!' });
  };

  // Only show loading on initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Show skeleton while loading space data
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
                          {/* Avatar */}
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={testimonial.respondent_photo_url} />
                            <AvatarFallback className="bg-violet-100 text-violet-600">
                              {testimonial.respondent_name?.charAt(0).toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{testimonial.respondent_name}</span>
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

                            {/* Rating */}
                            {testimonial.rating && (
                              <div className="flex items-center gap-1 mb-3">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                              </div>
                            )}

                            {/* Content */}
                            {testimonial.type === 'video' ? (
                              <Button
                                variant="outline"
                                onClick={() => setSelectedVideo(testimonial.video_url)}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Play Video
                              </Button>
                            ) : (
                              <p className="text-foreground/90">"{testimonial.content}"</p>
                            )}

                            <div className="text-xs text-muted-foreground mt-3">
                              {new Date(testimonial.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLike(testimonial.id, testimonial.is_liked)}
                              className={testimonial.is_liked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}
                            >
                              {testimonial.is_liked ? (
                                <Heart className="w-5 h-5 fill-current" />
                              ) : (
                                <HeartOff className="w-5 h-5" />
                              )}
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
              {/* Form Controls */}
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

                  <Button 
                    onClick={saveFormSettings} 
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="bg-gray-100 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>See how your form looks to respondents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg max-w-sm mx-auto">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold">{formSettings.header_title || 'Share your experience'}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{formSettings.custom_message || 'We appreciate your feedback!'}</p>
                    </div>
                    <div className="space-y-3">
                      <Button className="w-full" variant="outline">
                        <Video className="w-4 h-4 mr-2" />
                        Record Video
                      </Button>
                      <Button className="w-full" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        Write Text
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Widget Tab */}
          <TabsContent value="widget">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Widget Settings */}
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
                            onClick={() => setWidgetSettings({ ...widgetSettings, layout })}
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
                        {`  data-theme="${widgetSettings.theme}">`}<br />
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
                  <CardDescription>
                    {likedTestimonials.length} approved testimonials will be shown
                  </CardDescription>
                </CardHeader>
                <CardContent className={`min-h-[400px] rounded-lg p-6 ${widgetSettings.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {likedTestimonials.length === 0 ? (
                    <div className={`text-center py-12 ${widgetSettings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No approved testimonials yet.</p>
                      <p className="text-sm mt-2">Click the heart icon on testimonials to approve them.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {likedTestimonials.slice(0, 4).map((testimonial) => (
                        <div 
                          key={testimonial.id}
                          className={`p-4 rounded-lg ${widgetSettings.theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}
                        >
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(testimonial.rating || 5)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <p className={`text-sm mb-3 ${widgetSettings.theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            "{testimonial.content || 'Video testimonial'}"
                          </p>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={testimonial.respondent_photo_url} />
                              <AvatarFallback>
                                {testimonial.respondent_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`text-sm font-medium ${widgetSettings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {testimonial.respondent_name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <Button variant="outline" onClick={copySubmitLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (window.confirm('Are you sure? This will delete all testimonials.')) {
                        // Delete space
                        supabase.from('spaces').delete().eq('id', spaceId).then(() => {
                          navigate('/dashboard');
                        });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Space
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
          <DialogHeader>
            <DialogTitle>Video Testimonial</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedVideo && (
              <video 
                src={selectedVideo} 
                controls 
                autoPlay 
                className="w-full h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceOverview;
