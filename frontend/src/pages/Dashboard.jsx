import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// ✅ Added Code, Layout, Palette icons
import { Heart, Plus, Settings, LogOut, MoreVertical, ExternalLink, Copy, Trash2, Loader2, Code, Layout, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import ProfileModal from '@/components/ProfileModal';
import UserProfileImage from '@/components/UserProfileImage';

const Dashboard = () => {
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // ✅ NEW: Embed Modal State
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [embedTheme, setEmbedTheme] = useState('light');
  const [embedLayout, setEmbedLayout] = useState('grid');

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && initialLoad) {
      fetchSpaces();
      setInitialLoad(false);
    }
  }, [user, initialLoad]);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*, testimonials(count)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spaces.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + uuidv4().slice(0, 6);
  };

  const createSpace = async (e) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    setCreating(true);
    try {
      const slug = generateSlug(newSpaceName);
      const { data, error } = await supabase
        .from('spaces')
        .insert({
          id: uuidv4(),
          owner_id: user.id,
          space_name: newSpaceName,
          slug: slug,
          header_title: `Share your experience with ${newSpaceName}`,
          custom_message: 'We appreciate your feedback! Please take a moment to share your experience.',
          collect_star_rating: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setSpaces([data, ...spaces]);
      setCreateDialogOpen(false);
      setNewSpaceName('');
      toast({
        title: 'Space created!',
        description: 'Your new space is ready to collect testimonials.',
      });
      navigate(`/dashboard/${data.id}`);
    } catch (error) {
      console.error('Error creating space:', error);
      toast({
        title: 'Error',
        description: 'Failed to create space.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteSpace = async (spaceId) => {
    if (!window.confirm('Are you sure you want to delete this space? All testimonials will be lost.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;

      setSpaces(spaces.filter(s => s.id !== spaceId));
      toast({
        title: 'Space deleted',
        description: 'The space has been removed.',
      });
    } catch (error) {
      console.error('Error deleting space:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete space.',
        variant: 'destructive',
      });
    }
  };

  const copySubmitLink = (slug) => {
    const link = `${window.location.origin}/submit/${slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Share this link with your clients.',
    });
  };

  // ✅ NEW: Embed Logic
  const openEmbedModal = (slug) => {
    setSelectedSlug(slug);
    setEmbedTheme('light');
    setEmbedLayout('grid');
    setEmbedDialogOpen(true);
  };

  const getEmbedCode = () => {
    const origin = window.location.origin;
    const queryParams = [];
    if (embedTheme !== 'light') queryParams.push(`theme=${embedTheme}`);
    if (embedLayout !== 'grid') queryParams.push(`layout=${embedLayout}`);
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const src = `${origin}/embed/${selectedSlug}${queryString}`;

    return `<iframe 
  src="${src}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  scrolling="yes"
></iframe>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    toast({
      title: 'Code Copied',
      description: 'Paste this into your HTML.',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              TrustFlow
            </span>
          </Link>

          <div className="relative ml-2">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all"
            >
              <UserProfileImage 
                src={profile?.avatar_url} 
                alt={profile?.full_name || "User"} 
                className="w-9 h-9 border border-violet-200 dark:border-violet-800"
                iconClassName="w-5 h-5"
              />
            </button>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 top-12 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-1">
                    <button 
                      onClick={() => { setIsProfileOpen(false); setIsProfileModalOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button 
                      onClick={() => handleSignOut()} 
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Spaces</h1>
            <p className="text-muted-foreground mt-1">Manage your testimonial collection spaces</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Space
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Space</DialogTitle>
                <DialogDescription>
                  A space is a dedicated collection point for testimonials from a specific project or client.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createSpace} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="spaceName">Space Name</Label>
                  <Input
                    id="spaceName"
                    placeholder="e.g., Urban Brew Cafe"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creating}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600"
                  >
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Space
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Spaces Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No spaces yet</h2>
            <p className="text-muted-foreground mb-6">Create your first space to start collecting testimonials.</p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Space
            </Button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space, index) => (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-violet-100 dark:border-violet-900/50"
                  onClick={() => navigate(`/dashboard/${space.id}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">{space.space_name}</CardTitle>
                      <CardDescription className="mt-1">
                        {space.testimonials?.[0]?.count || 0} testimonials
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copySubmitLink(space.slug); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy submit link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/submit/${space.slug}`, '_blank'); }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open form
                        </DropdownMenuItem>
                        
                        {/* ✅ NEW: Embed Option */}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEmbedModal(space.slug); }}>
                          <Code className="w-4 h-4 mr-2" />
                          Embed Widget
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); deleteSpace(space.id); }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground truncate">
                      /{space.slug}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: spaces.length * 0.05 }}
            >
              <Card 
                className="h-full border-dashed border-2 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all cursor-pointer flex items-center justify-center min-h-[160px]"
                onClick={() => setCreateDialogOpen(true)}
              >
                <CardContent className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                    <Plus className="w-6 h-6 text-violet-600" />
                  </div>
                  <p className="font-medium text-muted-foreground">Create New Space</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </main>

      {/* ✅ NEW: Embed Code Dialog with Dynamic Options */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Embed Wall of Love</DialogTitle>
            <DialogDescription>
              Customize your widget and copy the code to your website.
            </DialogDescription>
          </DialogHeader>
          
          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Layout
                </Label>
                <div className="flex gap-2">
                    {['grid', 'masonry', 'carousel'].map((l) => (
                        <button 
                            key={l}
                            onClick={() => setEmbedLayout(l)}
                            className={`px-3 py-2 text-sm rounded-md border transition-all flex-1 ${
                                embedLayout === l 
                                ? 'bg-violet-100 border-violet-500 text-violet-700 font-medium dark:bg-violet-900/40 dark:text-violet-300' 
                                : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Theme
                </Label>
                <div className="flex gap-2">
                    {['light', 'dark'].map((t) => (
                        <button 
                            key={t}
                            onClick={() => setEmbedTheme(t)}
                            className={`px-3 py-2 text-sm rounded-md border transition-all flex-1 ${
                                embedTheme === t
                                ? 'bg-violet-100 border-violet-500 text-violet-700 font-medium dark:bg-violet-900/40 dark:text-violet-300' 
                                : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="mt-4 relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" onClick={copyEmbedCode} className="h-8 shadow-sm">
                    <Copy className="w-3 h-3 mr-2" /> Copy Code
                </Button>
            </div>
            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {getEmbedCode()}
            </pre>
          </div>
          
          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
             <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <span className="text-base">💡</span> 
                Tip: You can adjust the <code>height</code> or <code>width</code> in the HTML to fit your website's container perfectly.
             </p>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        user={user} 
        profile={profile} 
        onProfileUpdate={refreshProfile} 
      />
    </div>
  );
};

export default Dashboard;