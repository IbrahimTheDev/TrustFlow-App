import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, Plus, Settings, LogOut, MoreVertical, ExternalLink, Copy, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [creating, setCreating] = useState(false);
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Show loading only during initial auth check, not during data fetch
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return null; // Will redirect via useEffect
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-violet-100 text-violet-600">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">
                  {profile?.full_name || user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

            {/* Create New Space Card */}
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
    </div>
  );
};

export default Dashboard;
