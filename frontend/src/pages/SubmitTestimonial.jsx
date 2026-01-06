import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { Heart, Video, FileText, Star, Loader2, CheckCircle, Camera, RotateCcw, Upload, ArrowLeft, User, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

const SubmitTestimonial = () => {
  const { slug } = useParams();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('welcome'); // welcome, video, text, details, uploading, success
  const [testimonialType, setTestimonialType] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  
  // Respondent Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(''); 
  const [avatarFile, setAvatarFile] = useState(null); 
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchSpace();
    return () => {
      // Cleanup camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [slug]);

  const fetchSpace = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setSpace(data);
    } catch (error) {
      console.error('Error fetching space:', error);
      toast({
        title: 'Space not found',
        description: 'This collection link may be invalid.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Camera & Video Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera and microphone access to record a video.',
        variant: 'destructive',
      });
      setStep('welcome');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    // Timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const retakeVideo = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    startCamera();
  };

  const selectVideoType = () => {
    setTestimonialType('video');
    setStep('video');
    setTimeout(startCamera, 100);
  };

  const selectTextType = () => {
    setTestimonialType('text');
    setStep('text');
  };

  const proceedToDetails = () => {
    if (testimonialType === 'text' && !content.trim()) {
      toast({
        title: 'Please add your testimonial',
        variant: 'destructive',
      });
      return;
    }
    if (testimonialType === 'video' && !recordedBlob) {
      toast({
        title: 'Please record a video',
        variant: 'destructive',
      });
      return;
    }
    stopCamera();
    setStep('details');
  };

  // --- Avatar Handler ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const submitTestimonial = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    setStep('uploading');

    try {
      let videoUrl = null;
      let avatarUrl = null;
      let progress = 0;

      // Helper to update progress
      const updateProgress = (increment) => {
        progress += increment;
        setUploadProgress(Math.min(progress, 90));
      };

      // 1. Upload Avatar if exists (Updated Bucket Name)
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const avatarFileName = `${space.id}/avatars/${uuidv4()}.${fileExt}`;
        
        const { error: avatarError } = await supabase.storage
          .from('respondent_photo') // <--- UPDATED HERE
          .upload(avatarFileName, avatarFile);

        if (avatarError) throw avatarError;

        const { data: { publicUrl } } = supabase.storage
          .from('respondent_photo') // <--- UPDATED HERE
          .getPublicUrl(avatarFileName);
        
        avatarUrl = publicUrl;
        updateProgress(30);
      } else {
        updateProgress(30);
      }

      // 2. Upload Video if exists
      if (testimonialType === 'video' && recordedBlob) {
        const fileName = `${space.id}/${uuidv4()}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, recordedBlob, {
            contentType: 'video/webm',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);
        
        videoUrl = publicUrl;
        updateProgress(40);
      } else {
        updateProgress(40);
      }

      // 3. Insert testimonial
      const { error: insertError } = await supabase
        .from('testimonials')
        .insert({
          id: uuidv4(),
          space_id: space.id,
          type: testimonialType,
          content: testimonialType === 'text' ? content : null,
          video_url: videoUrl,
          rating: space.collect_star_rating ? rating : null,
          respondent_name: name,
          respondent_email: email,
          respondent_role: role, 
          respondent_photo_url: avatarUrl, 
          is_liked: false,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      setStep('success');
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: 'Submission failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setStep('details');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
          <p className="text-muted-foreground">This collection link may be invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    {space.logo_url ? (
                      <img src={space.logo_url} alt={space.space_name} className="w-16 h-16 mx-auto mb-4 rounded-xl" />
                    ) : (
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <Star className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <h1 className="text-2xl font-bold mb-2">{space.header_title}</h1>
                    <p className="text-muted-foreground">{space.custom_message}</p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={selectVideoType}
                      className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Record a Video
                    </Button>
                    <Button 
                      onClick={selectTextType}
                      variant="outline"
                      className="w-full h-14 text-lg"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Write Text
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Video Recording Step */}
          {step === 'video' && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => { stopCamera(); setStep('welcome'); }}>
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">Record Your Video</h2>
                  </div>

                  <div className="relative aspect-[9/16] max-h-[400px] bg-black rounded-xl overflow-hidden mb-4">
                    {recordedUrl ? (
                      <video 
                        src={recordedUrl} 
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <video 
                        ref={videoRef}
                        autoPlay 
                        muted 
                        playsInline
                        className="w-full h-full object-cover mirror"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                    )}
                    
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        {formatTime(recordingTime)} / 1:00
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center gap-3">
                    {recordedUrl ? (
                      <>
                        <Button variant="outline" onClick={retakeVideo}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retake
                        </Button>
                        <Button 
                          onClick={proceedToDetails}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600"
                        >
                          Use This Video
                        </Button>
                      </>
                    ) : isRecording ? (
                      <Button 
                        onClick={stopRecording}
                        variant="destructive"
                        size="lg"
                        className="rounded-full w-16 h-16"
                      >
                        <span className="w-6 h-6 bg-white rounded-sm" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={startRecording}
                        size="lg"
                        className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                      >
                        <Camera className="w-6 h-6" />
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Maximum 60 seconds
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Text Step */}
          {step === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setStep('welcome')}>
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">Write Your Testimonial</h2>
                  </div>

                  {space.collect_star_rating && (
                    <div className="mb-6">
                      <Label className="mb-2 block">Your Rating</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star 
                              className={`w-8 h-8 transition-colors ${
                                star <= (hoverRating || rating) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="content">Your Testimonial</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Share your experience..."
                        rows={5}
                        className="mt-2"
                      />
                    </div>

                    <Button 
                      onClick={proceedToDetails}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
                    >
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Details Step */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setStep(testimonialType === 'video' ? 'video' : 'text')}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">Your Details</h2>
                  </div>

                  <form onSubmit={submitTestimonial} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Your Name *</Label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          required
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Your Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your email won't be displayed publicly
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="role">Job Title / Role (Optional)</Label>
                      <div className="relative mt-2">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="CEO at Company, Software Engineer, etc."
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="avatar">Profile Photo (Optional)</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="flex-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 mt-4"
                    >
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Submit Testimonial
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Uploading Step */}
          {step === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-violet-600 mb-4 animate-bounce" />
                  <h2 className="text-lg font-semibold mb-2">Uploading...</h2>
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your testimonial has been submitted successfully.
                  </p>
                  <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <p className="text-sm">
                      Want to collect testimonials like this?
                    </p>
                    <a 
                      href="/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-600 font-medium hover:underline"
                    >
                      Create your own Wall of Love →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Powered by */}
        <div className="text-center mt-6">
          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by <span className="font-medium text-violet-600">TrustFlow</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default SubmitTestimonial;