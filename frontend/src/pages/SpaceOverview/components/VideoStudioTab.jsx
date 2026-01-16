import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Play, Pause, RotateCcw, Scissors, Crop, Volume2, VolumeX, 
  Save, Loader2, AlertTriangle, CheckCircle, Download, X, Maximize2,
  SkipBack, SkipForward, Film, Wand2, Trash2, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Format time helper
const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Aspect ratio presets
const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', icon: '⬜', value: null },
  { id: 'square', label: 'Square', icon: '◼️', value: 1 },
  { id: 'portrait', label: '9:16', icon: '📱', value: 9/16 },
  { id: 'landscape', label: '16:9', icon: '🖥️', value: 16/9 },
  { id: 'classic', label: '4:3', icon: '📺', value: 4/3 }
];

// Video Editor Component
const VideoStudioTab = ({ 
  testimonials, 
  spaceId,
  onVideoUpdated 
}) => {
  // FFmpeg State
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegRef = useRef(null);

  // Selected Video State
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState(null);
  
  // Player State
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Edit State
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [aspectRatio, setAspectRatio] = useState('original');
  const [editedVolume, setEditedVolume] = useState(100);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStage, setProcessStage] = useState('');
  
  // UI State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Filter video testimonials
  const videoTestimonials = testimonials.filter(t => t.type === 'video' && t.video_url);

  // FFmpeg load error state
  const [ffmpegError, setFfmpegError] = useState(null);

  // Load FFmpeg on mount
  useEffect(() => {
    loadFFmpeg();
  }, []);

  // Robust FFmpeg loader with environment-agnostic support
  const loadFFmpeg = async () => {
  if (ffmpegLoaded || ffmpegLoading) return;
  setFfmpegLoading(true);

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();

    // Cache busting aur absolute path Codespace ke liye
    const baseURL = `${window.location.origin}/ffmpeg`;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    const ts = `?t=${Date.now()}`;

    console.log('[FFmpeg] Attempting to load from local public folder...');

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js${ts}`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm${ts}`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js${ts}`, 'text/javascript'),
    });

    ffmpegRef.current = { ffmpeg };
    setFfmpegLoaded(true);
    console.log('[FFmpeg] Successfully loaded!');
  } catch (error) {
    console.error('[FFmpeg] Failed to load:', error);
    console.log(error, error.message);
    // Fallback logic ko disable karein Codespace mein kyunki CDN wahan block hota hai
  } finally {
    setFfmpegLoading(false);
  }
};
  // Handle video selection
  const handleSelectVideo = (testimonial) => {
    setSelectedTestimonial(testimonial);
    // Add cache-busting timestamp
    const url = testimonial.video_url.includes('?') 
      ? `${testimonial.video_url}&t=${Date.now()}`
      : `${testimonial.video_url}?t=${Date.now()}`;
    setVideoUrl(url);
    setOriginalVideoUrl(testimonial.video_url);
    
    // Reset edit state
    setTrimStart(0);
    setTrimEnd(100);
    setAspectRatio('original');
    setEditedVolume(100);
    setHasChanges(false);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Video player controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      
      // Auto-loop within trim range
      const trimEndTime = (trimEnd / 100) * duration;
      if (current >= trimEndTime) {
        const trimStartTime = (trimStart / 100) * duration;
        videoRef.current.currentTime = trimStartTime;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value) => {
    if (videoRef.current && duration) {
      const time = (value[0] / 100) * duration;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (value) => {
    const vol = value[0] / 100;
    setVolume(vol);
    setEditedVolume(value[0]);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
    setHasChanges(true);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  // Trim handlers
  const handleTrimChange = (values) => {
    setTrimStart(values[0]);
    setTrimEnd(values[1]);
    setHasChanges(true);
    
    // Jump to trim start when adjusting
    if (videoRef.current && duration) {
      const startTime = (values[0] / 100) * duration;
      videoRef.current.currentTime = startTime;
    }
  };

  // Process and save video
  const processVideo = async () => {
    if (!ffmpegRef.current || !selectedTestimonial) {
      toast.error('Editor not ready', { description: 'Please wait for the editor to load.' });
      return;
    }

    if (!ffmpegLoaded) {
      toast.error('Editor not ready', { description: 'FFmpeg is still loading. Please wait.' });
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    setShowConfirmDialog(false);

    try {
      const { ffmpeg, fetchFile } = ffmpegRef.current;
      
      // Stage 1: Download original video
      setProcessStage('Downloading video...');
      setProcessProgress(5);
      
      // Fetch video with CORS support
      const videoResponse = await fetch(originalVideoUrl, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }
      
      const videoBlob = await videoResponse.blob();
      const inputFileName = 'input.mp4';
      const outputFileName = 'output.mp4';

      await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlob));
      setProcessProgress(20);

      // Stage 2: Build FFmpeg command
      setProcessStage('Processing video...');
      
      const startTime = (trimStart / 100) * duration;
      const endTime = (trimEnd / 100) * duration;
      const trimDuration = endTime - startTime;
      
      // Build filter complex for aspect ratio
      let filterComplex = [];
      const selectedRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio);
      
      if (selectedRatio?.value) {
        // Calculate crop dimensions
        filterComplex.push(`crop=ih*${selectedRatio.value}:ih`);
      }
      
      // Volume adjustment
      const volumeMultiplier = editedVolume / 100;
      const audioFilter = `volume=${volumeMultiplier}`;

      // Build command arguments
      let args = [
        '-i', inputFileName,
        '-ss', startTime.toString(),
        '-t', trimDuration.toString(),
      ];

      if (filterComplex.length > 0) {
        args.push('-vf', filterComplex.join(','));
      }
      
      args.push('-af', audioFilter);
      args.push('-c:v', 'libx264');
      args.push('-preset', 'fast');
      args.push('-crf', '23');
      args.push('-c:a', 'aac');
      args.push('-b:a', '128k');
      args.push('-movflags', '+faststart');
      args.push(outputFileName);

      // Execute FFmpeg
      await ffmpeg.exec(args);
      setProcessProgress(60);

      // Stage 3: Read output file
      setProcessStage('Preparing upload...');
      const outputData = await ffmpeg.readFile(outputFileName);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });
      setProcessProgress(70);

      // Stage 4: Upload to Supabase
      setProcessStage('Uploading to cloud...');
      
      // Generate new filename with timestamp
      const newFileName = `testimonials/${spaceId}/${selectedTestimonial.id}_${Date.now()}.mp4`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(newFileName, outputBlob, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setProcessProgress(85);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(newFileName);

      // Stage 5: Update database
      setProcessStage('Updating database...');
      
      const { error: updateError } = await supabase
        .from('testimonials')
        .update({ 
          video_url: publicUrl,
          video_metadata: {
            duration: trimDuration,
            aspectRatio: aspectRatio,
            editedAt: new Date().toISOString(),
            originalUrl: originalVideoUrl
          }
        })
        .eq('id', selectedTestimonial.id);

      if (updateError) throw updateError;
      setProcessProgress(95);

      // Stage 6: Delete old video (optional - keep for rollback)
      setProcessStage('Cleaning up...');
      try {
        // Extract old path from URL
        const oldUrlParts = originalVideoUrl.split('/videos/');
        if (oldUrlParts.length > 1) {
          const oldPath = oldUrlParts[1].split('?')[0];
          await supabase.storage.from('videos').remove([oldPath]);
        }
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError);
        // Non-critical error
      }

      setProcessProgress(100);
      setProcessStage('Complete!');

      // Success!
      toast.success('Video updated successfully!', {
        description: 'Your changes are now live everywhere.',
        duration: 5000
      });

      // Update local state
      const updatedUrl = `${publicUrl}?t=${Date.now()}`;
      setVideoUrl(updatedUrl);
      setOriginalVideoUrl(publicUrl);
      setHasChanges(false);

      // Callback to parent to refresh testimonials
      if (onVideoUpdated) {
        onVideoUpdated(selectedTestimonial.id, publicUrl);
      }

      // Cleanup FFmpeg files
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

    } catch (error) {
      console.error('Video processing failed:', error);
      toast.error('Processing failed', {
        description: error.message || 'Something went wrong. Please try again.'
      });
    } finally {
      setIsProcessing(false);
      setProcessStage('');
      setProcessProgress(0);
    }
  };

  // Reset edits
  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(100);
    setAspectRatio('original');
    setEditedVolume(100);
    setVolume(1);
    setHasChanges(false);
    if (videoRef.current) {
      videoRef.current.volume = 1;
      videoRef.current.currentTime = 0;
    }
    toast.info('Edits reset to original');
  };

  // No video testimonials state
  if (videoTestimonials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Film className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Video Testimonials</h3>
        <p className="text-slate-500 text-center max-w-md">
          You don't have any video testimonials yet. Once customers submit video reviews, 
          you can edit them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Film className="w-6 h-6 text-violet-500" />
            Video Studio
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Trim, crop, and adjust your video testimonials. Changes are permanent.
          </p>
        </div>
        
        {ffmpegLoading && (
          <Badge variant="outline" className="animate-pulse">
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Loading editor...
          </Badge>
        )}
        {ffmpegLoaded && (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Editor ready
          </Badge>
        )}
        {ffmpegError && !ffmpegLoading && (
          <Badge 
            variant="outline" 
            className="bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100"
            onClick={() => {
              setFfmpegError(null);
              loadFFmpeg();
            }}
          >
            <AlertTriangle className="w-3 h-3 mr-1.5" />
            Failed to load - Click to retry
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Video Selection Panel */}
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Video</CardTitle>
            <CardDescription>Choose a video testimonial to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {videoTestimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedTestimonial?.id === testimonial.id 
                      ? 'ring-2 ring-violet-500 bg-violet-50' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => handleSelectVideo(testimonial)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Video Thumbnail */}
                    <div className="w-16 h-12 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <video 
                        src={testimonial.video_url}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onError={(e) => console.warn('Thumbnail load error:', e)}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {testimonial.respondent_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(testimonial.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {selectedTestimonial?.id === testimonial.id && (
                      <Badge className="bg-violet-600 text-white text-[10px]">
                        Selected
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Editor Panel */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Video Editor</CardTitle>
                <CardDescription>
                  {selectedTestimonial 
                    ? `Editing: ${selectedTestimonial.respondent_name}'s video`
                    : 'Select a video to start editing'
                  }
                </CardDescription>
              </div>
              
              {hasChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!selectedTestimonial ? (
              // Empty State
              <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Film className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500">Select a video from the left panel</p>
              </div>
            ) : (
              <>
                {/* Video Player */}
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    crossOrigin="anonymous"
                    playsInline
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={(e) => {
                      console.error('Video playback error:', e);
                      toast.error('Failed to load video', {
                        description: 'There may be a CORS issue with the video source.'
                      });
                    }}
                    style={{
                      aspectRatio: ASPECT_RATIOS.find(r => r.id === aspectRatio)?.value || 'auto'
                    }}
                  />
                  
                  {/* Play Overlay */}
                  <AnimatePresence>
                    {!isPlaying && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
                        onClick={togglePlay}
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"
                        >
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Time Display */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, currentTime - 5);
                      }
                    }}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    size="icon"
                    className="bg-violet-600 hover:bg-violet-700"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(duration, currentTime + 5);
                      }
                    }}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  {/* Seek Slider */}
                  <div className="flex-1">
                    <Slider
                      value={[duration ? (currentTime / duration) * 100 : 0]}
                      max={100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : editedVolume]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>
                </div>

                <Separator />

                {/* Editing Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trim Controls */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Scissors className="w-4 h-4 text-violet-500" />
                      Trim Video
                    </Label>
                    <div className="space-y-3">
                      <Slider
                        value={[trimStart, trimEnd]}
                        max={100}
                        step={0.5}
                        minStepsBetweenThumbs={5}
                        onValueChange={handleTrimChange}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Start: {formatTime((trimStart / 100) * duration)}</span>
                        <span className="text-violet-600 font-medium">
                          Duration: {formatTime(((trimEnd - trimStart) / 100) * duration)}
                        </span>
                        <span>End: {formatTime((trimEnd / 100) * duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Crop className="w-4 h-4 text-violet-500" />
                      Aspect Ratio
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((ratio) => (
                        <Button
                          key={ratio.id}
                          variant={aspectRatio === ratio.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setAspectRatio(ratio.id);
                            setHasChanges(true);
                          }}
                          className={aspectRatio === ratio.id ? 'bg-violet-600 hover:bg-violet-700' : ''}
                        >
                          <span className="mr-1.5">{ratio.icon}</span>
                          {ratio.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    disabled={!hasChanges || isProcessing}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Changes
                  </Button>
                  
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!hasChanges || isProcessing || !ffmpegLoaded || !!ffmpegError}
                    className="bg-violet-600 hover:bg-violet-700"
                    title={ffmpegError ? 'Video editor failed to load' : !ffmpegLoaded ? 'Loading editor...' : ''}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : ffmpegLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Editor...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Modal */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-violet-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wand2 className="w-8 h-8 text-violet-400 animate-pulse" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">Processing Video</h3>
              <p className="text-slate-400 text-sm mb-6">{processStage}</p>
              
              <Progress value={processProgress} className="h-2 mb-2" />
              <p className="text-sm text-violet-400 font-mono">{processProgress}%</p>
              
              <p className="text-xs text-slate-500 mt-6">
                Please don't close this window. This may take a few minutes.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Changes
            </DialogTitle>
            <DialogDescription>
              This action will <strong>permanently replace</strong> the original video. 
              The edited version will be used everywhere (embed, wall of love, dashboard).
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Warning:</strong> This action cannot be undone. Make sure you're happy with your edits.
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-violet-600 hover:bg-violet-700"
              onClick={processVideo}
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoStudioTab;
