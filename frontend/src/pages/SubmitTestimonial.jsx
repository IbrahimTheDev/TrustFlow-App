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
import { 
  Video, FileText, Star, Loader2, CheckCircle, Camera, RotateCcw, 
  Upload, ArrowLeft, User, Briefcase, Trash2, Image as ImageIcon, AlertCircle, AlertTriangle, Plus, X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

const SubmitTestimonial = () => {
  const { slug } = useParams();
  const [space, setSpace] = useState(null);
  const [formSettings, setFormSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Steps: welcome, video, photo, text, details, uploading, success
  const [step, setStep] = useState('welcome'); 
  const [testimonialType, setTestimonialType] = useState(null); // 'video', 'text', 'photo'
  
  // Data State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  
  // Photo State (Multi-image)
  const [attachedImages, setAttachedImages] = useState([]); // Array of { file, preview }
  const [isPhotoCameraOpen, setIsPhotoCameraOpen] = useState(false);
  
  // Respondent Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(''); 
  const [avatarFile, setAvatarFile] = useState(null); 
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Validation & Error State
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const photoVideoRef = useRef(null); // Separate ref for photo camera

  // --- THEME CONSTANTS ---
  const DEFAULT_THEME_CONFIG = {
    theme: 'light', 
    accentColor: 'violet', 
    customColor: '#8b5cf6',
    pageBackground: 'gradient-violet', 
    viewMode: 'mobile'
  };

  const accentColors = {
    violet: 'from-violet-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    rose: 'from-rose-600 to-pink-600',
    emerald: 'from-emerald-600 to-teal-600',
    custom: 'custom' 
  };

  const pageBackgrounds = {
    white: 'bg-white',
    dark: 'bg-slate-950',
    'gradient-violet': 'bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20',
    'gradient-blue': 'bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20',
  };

  useEffect(() => {
    fetchSpace();
    return () => {
      cleanupMedia();
    };
  }, [slug]);

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const fetchSpace = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select(`*, space_form_settings (*)`)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      let fetchedSettings = {};
      if (Array.isArray(data.space_form_settings) && data.space_form_settings.length > 0) {
        fetchedSettings = data.space_form_settings[0];
      } else if (data.space_form_settings && typeof data.space_form_settings === 'object') {
        fetchedSettings = data.space_form_settings;
      }

      const mergedSettings = {
        header_title: fetchedSettings.header_title || data.header_title || '',
        custom_message: fetchedSettings.custom_message || data.custom_message || '',
        collect_star_rating: fetchedSettings.collect_star_rating ?? true,
        collect_video: fetchedSettings.collect_video ?? true,
        collect_photo: fetchedSettings.collect_photo ?? false,
        thank_you_title: fetchedSettings.thank_you_title || 'Thank you!',
        thank_you_message: fetchedSettings.thank_you_message || 'Your testimonial has been submitted.',
        theme_config: {
          ...DEFAULT_THEME_CONFIG,
          ...(fetchedSettings.theme_config || {})
        }
      };

      setSpace(data);
      setFormSettings(mergedSettings);

    } catch (error) {
      console.error('Error fetching space:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic Style Helpers ---
  const getThemeClasses = () => {
    if (!formSettings) return {};
    const isDark = formSettings.theme_config.theme === 'dark';
    return {
      card: isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-white text-slate-900',
      input: isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      textHeader: isDark ? 'text-white' : 'text-slate-900',
    };
  };

  const getButtonStyle = () => {
    if (!formSettings) return {};
    const { accentColor, customColor } = formSettings.theme_config;
    if (accentColor === 'custom') return { background: customColor, color: '#fff' };
    return {}; 
  };
  
  const getButtonClass = () => {
    if (!formSettings) return '';
    const { accentColor } = formSettings.theme_config;
    if (accentColor === 'custom') return `w-full shadow-md hover:opacity-90 transition-opacity text-white`;
    return `w-full shadow-md bg-gradient-to-r ${accentColors[accentColor]} hover:opacity-90 transition-opacity text-white`;
  };

  // --- Flows ---
  const startVideoFlow = () => {
    setTestimonialType('video');
    setStep('video');
    setTimeout(startCamera, 100);
  };

  const startPhotoFlow = () => {
    setTestimonialType('photo');
    setStep('photo');
  };

  const startTextFlow = () => {
    setTestimonialType('text');
    setStep('text');
  };

  // --- Navigation Logic ---
  const handleNextFromMedia = () => {
    // Enforcement: Must have media
    if (testimonialType === 'video' && !recordedBlob) {
      setSubmissionError('Please record a video to continue.');
      return;
    }
    if (testimonialType === 'photo' && attachedImages.length === 0) {
      setSubmissionError('Please upload at least one photo.');
      return;
    }
    
    setSubmissionError(null);
    stopCamera();
    // Video/Photo flow ALWAYS goes to Text step next
    setStep('text');
  };

  const handleNextFromText = () => {
    // Enforcement: Text is mandatory ONLY if testimonialType is 'text'
    if (testimonialType === 'text' && !content.trim()) {
      setSubmissionError('Please write your testimonial.');
      return;
    }
    setSubmissionError(null);
    setStep('details');
  };

  const handleSkipText = () => {
    // Only allowed for video/photo flows
    setStep('details');
  };

  // --- Video Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      setSubmissionError('Camera access denied. Please check permissions.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) { stopRecording(); return prev; }
        return prev + 1;
      });
    }, 1000);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsPhotoCameraOpen(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const retakeVideo = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    startCamera();
  };

  // --- Photo Logic (Multi-Image) ---
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + attachedImages.length > 4) {
      setSubmissionError("Maximum 4 photos allowed.");
      return;
    }
    setSubmissionError(null);

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setAttachedImages([...attachedImages, ...newImages]);
  };

  const startPhotoCamera = async () => {
    try {
      setIsPhotoCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      // Slight delay to ensure ref is mounted
      setTimeout(() => {
        if (photoVideoRef.current) photoVideoRef.current.srcObject = stream;
      }, 100);
    } catch (error) {
      setSubmissionError('Camera access denied.');
    }
  };

  const capturePhoto = () => {
    if (!photoVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = photoVideoRef.current.videoWidth;
    canvas.height = photoVideoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(photoVideoRef.current, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (attachedImages.length >= 4) {
        setSubmissionError("Maximum 4 photos allowed.");
        stopCamera();
        return;
      }
      setAttachedImages([...attachedImages, { file, preview: URL.createObjectURL(blob) }]);
      stopCamera(); // Close camera after taking one photo
    }, 'image/jpeg');
  };

  const removeAttachedImage = (index) => {
    const newImages = [...attachedImages];
    newImages.splice(index, 1);
    setAttachedImages(newImages);
  };

  // --- Avatar Logic ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // --- Validation ---
  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleEmailBlur = () => {
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: "Email is required" }));
    } else if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
    }
  };

  const handleEmailFocus = () => {
    setErrors(prev => ({ ...prev, email: null }));
  };

  // --- Submit Logic ---
  const submitTestimonial = async (e) => {
    e.preventDefault();
    
    // Final Validation check
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!validateEmail(email)) newErrors.email = "Invalid email address";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setStep('uploading');

    try {
      let videoUrl = null;
      let avatarUrl = null;
      let imageUrls = [];
      let progress = 0;
      
      const updateProgress = (increment) => {
        progress += increment;
        setUploadProgress(Math.min(progress, 90));
      };

      // 1. Upload Avatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${space.id}/avatars/${uuidv4()}.${fileExt}`;
        const { error: avatarError } = await supabase.storage.from('respondent_photo').upload(fileName, avatarFile);
        if (avatarError) throw avatarError;
        const { data: { publicUrl } } = supabase.storage.from('respondent_photo').getPublicUrl(fileName);
        avatarUrl = publicUrl;
        updateProgress(20);
      }

      // 2. Upload Video
      if (testimonialType === 'video' && recordedBlob) {
        const fileName = `${space.id}/${uuidv4()}.webm`;
        const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, recordedBlob, { contentType: 'video/webm' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
        videoUrl = publicUrl;
        updateProgress(30);
      }

      // 3. Upload Attached Images (Multiple)
      if (testimonialType === 'photo' && attachedImages.length > 0) {
        for (const imgObj of attachedImages) {
          const fileExt = imgObj.file.name.split('.').pop() || 'jpg';
          const fileName = `${space.id}/attached/${uuidv4()}.${fileExt}`;
          const { error: imgError } = await supabase.storage.from('respondent_photo').upload(fileName, imgObj.file);
          if (!imgError) {
             const { data: { publicUrl } } = supabase.storage.from('respondent_photo').getPublicUrl(fileName);
             imageUrls.push(publicUrl);
          }
        }
        updateProgress(30);
      }
      
      updateProgress(10); // Final buffer

      // 4. Insert DB
      const { error: insertError } = await supabase
        .from('testimonials')
        .insert({
          id: uuidv4(),
          space_id: space.id,
          type: testimonialType,
          content: content,
          video_url: videoUrl,
          rating: formSettings.collect_star_rating ? rating : null,
          respondent_name: name,
          respondent_email: email,
          respondent_role: role, 
          respondent_photo_url: avatarUrl,
          // Storing array of images if schema allows, otherwise just handling as uploaded
          // Note: If you have an 'images' column, uncomment:
          // images: imageUrls, 
          is_liked: false,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      setStep('success');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    } catch (error) {
      console.error('Error submitting:', error);
      setSubmissionError('Upload failed. Please check your connection.');
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>;
  if (!space) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Space Not Found</h1><p className="text-muted-foreground">Invalid link.</p></div></div>;

  const themeClasses = getThemeClasses();
  const themeConfig = formSettings.theme_config;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${pageBackgrounds[themeConfig.pageBackground]}`}>
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: WELCOME */}
          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    {space.logo_url ? (
                      <img src={space.logo_url} alt="Logo" className="w-16 h-16 mx-auto mb-4 object-contain" />
                    ) : (
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Star className="w-8 h-8 text-white" /></div>
                    )}
                    <h1 className={`text-2xl font-bold mb-2 ${themeClasses.textHeader}`}>{formSettings.header_title}</h1>
                    <p className={`${themeClasses.textMuted}`}>{formSettings.custom_message}</p>
                  </div>

                  <div className="space-y-3">
                    {formSettings.collect_video && (
                      <Button onClick={startVideoFlow} className={`w-full h-14 text-lg ${getButtonClass()}`} style={getButtonStyle()}>
                        <Video className="w-5 h-5 mr-2" /> Record a Video
                      </Button>
                    )}
                    
                    {formSettings.collect_photo && (
                       <Button onClick={startPhotoFlow} className={`w-full h-14 text-lg ${getButtonClass()}`} style={getButtonStyle()}>
                          <ImageIcon className="w-5 h-5 mr-2" /> Upload Photo
                       </Button>
                    )}

                    <Button onClick={startTextFlow} variant={(!formSettings.collect_video && !formSettings.collect_photo) ? "default" : "outline"}
                      className={`w-full h-14 text-lg ${(!formSettings.collect_video && !formSettings.collect_photo) ? getButtonClass() : `${themeClasses.input} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
                      style={(!formSettings.collect_video && !formSettings.collect_photo) ? getButtonStyle() : {}}
                    >
                      <FileText className="w-5 h-5 mr-2" /> Write Text
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: VIDEO */}
          {step === 'video' && (
            <motion.div key="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => { stopCamera(); setStep('welcome'); }} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Record Video</h2>
                  </div>
                  <div className="relative aspect-[9/16] max-h-[400px] bg-black rounded-xl overflow-hidden mb-4">
                    {recordedUrl ? <video src={recordedUrl} className="w-full h-full object-cover" controls /> : <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />}
                    {isRecording && <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm"><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {formatTime(recordingTime)} / 1:00</div>}
                  </div>
                  {/* Validation Error Banner */}
                  {submissionError && <div className="mb-4 text-center text-red-500 text-sm bg-red-50 p-2 rounded">{submissionError}</div>}
                  
                  <div className="flex justify-center gap-3">
                    {recordedUrl ? (
                      <>
                        <Button variant="outline" onClick={retakeVideo} className={themeClasses.input}><RotateCcw className="w-4 h-4 mr-2" /> Retake</Button>
                        <Button onClick={handleNextFromMedia} className={getButtonClass()} style={getButtonStyle()}>Use This Video</Button>
                      </>
                    ) : isRecording ? (
                      <Button onClick={stopRecording} variant="destructive" size="lg" className="rounded-full w-16 h-16"><span className="w-6 h-6 bg-white rounded-sm" /></Button>
                    ) : (
                      <Button onClick={startRecording} size="lg" className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"><Camera className="w-6 h-6" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: PHOTO (Multi-Select + Camera) */}
          {step === 'photo' && (
            <motion.div key="photo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <Button variant="ghost" size="icon" onClick={() => setStep('welcome')} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                      <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Upload Photos</h2>
                   </div>

                   {/* Camera View */}
                   {isPhotoCameraOpen ? (
                     <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4 flex flex-col items-center justify-end pb-4">
                        <video ref={photoVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
                        <div className="relative z-10 flex gap-4">
                          <Button variant="ghost" onClick={stopCamera} className="text-white bg-black/50 hover:bg-black/70 rounded-full">Cancel</Button>
                          <Button onClick={capturePhoto} size="icon" className="h-14 w-14 rounded-full border-4 border-white bg-transparent hover:bg-white/20"></Button>
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-4 mb-6">
                        {/* Options */}
                        {attachedImages.length < 4 && (
                          <div className="grid grid-cols-2 gap-3">
                            <Label className="aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                               <Upload className="w-6 h-6 text-slate-400 mb-1" />
                               <span className={`text-xs ${themeClasses.textMuted}`}>Upload</span>
                               <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                            </Label>
                            <div onClick={startPhotoCamera} className="aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                               <Camera className="w-6 h-6 text-slate-400 mb-1" />
                               <span className={`text-xs ${themeClasses.textMuted}`}>Camera</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Preview Grid */}
                        {attachedImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                             {attachedImages.map((img, idx) => (
                               <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                  <img src={img.preview} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                                  <button onClick={() => removeAttachedImage(idx)} className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                               </div>
                             ))}
                          </div>
                        )}
                        {attachedImages.length === 0 && <p className="text-center text-xs text-muted-foreground">Max 4 photos</p>}
                     </div>
                   )}
                   
                   {submissionError && <div className="mb-4 text-center text-red-500 text-sm bg-red-50 p-2 rounded">{submissionError}</div>}

                   {!isPhotoCameraOpen && (
                     <Button onClick={handleNextFromMedia} className={`w-full ${getButtonClass()}`} style={getButtonStyle()}>Continue</Button>
                   )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: TEXT (With Skip Logic) */}
          {step === 'text' && (
            <motion.div key="text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setStep(testimonialType === 'photo' ? 'photo' : (testimonialType === 'video' ? 'video' : 'welcome'))} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Write Testimonial</h2>
                  </div>
                  {formSettings.collect_star_rating && (
                    <div className="mb-6">
                      <Label className={`mb-2 block ${themeClasses.textHeader}`}>Your Rating</Label>
                      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-110"><Star className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} /></button>))}</div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <Label htmlFor="content" className={themeClasses.textHeader}>Your Testimonial</Label>
                    <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your experience..." rows={5} className={`mt-2 ${themeClasses.input}`} />
                    
                    {submissionError && <div className="text-red-500 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {submissionError}</div>}

                    <div className="flex flex-col gap-2">
                       <Button onClick={handleNextFromText} className={`w-full ${getButtonClass()}`} style={getButtonStyle()}>Continue</Button>
                       {/* Show SKIP if type is NOT text (meaning we have video/photo) */}
                       {testimonialType !== 'text' && (
                         <Button variant="ghost" onClick={handleSkipText} className={`w-full ${themeClasses.textMuted}`}>Skip</Button>
                       )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 5: DETAILS (With Premium Validation) */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setStep('text')} className={themeClasses.textHeader}><ArrowLeft className="w-5 h-5" /></Button>
                    <h2 className={`text-lg font-semibold ${themeClasses.textHeader}`}>Your Details</h2>
                  </div>

                  {submissionError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {submissionError}
                    </div>
                  )}

                  <form onSubmit={submitTestimonial} className="space-y-5">
                    {/* Profile Photo */}
                    {formSettings.collect_photo && (
                       <div className="flex flex-col items-center justify-center mb-6">
                          <div className="relative group">
                            <Label htmlFor="avatar-upload" className="cursor-pointer">
                              <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300 ${avatarPreview ? 'border-transparent shadow-md' : 'border-slate-300 hover:border-violet-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'}`}>
                                {avatarPreview ? (
                                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center text-center p-2">
                                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Photo</span>
                                  </div>
                                )}
                              </div>
                            </Label>
                            <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            {avatarPreview && (
                              <button type="button" onClick={removeAvatar} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-10"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </div>
                       </div>
                    )}

                    <div>
                      <Label htmlFor="name" className={themeClasses.textHeader}>Your Name *</Label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input id="name" value={name} onChange={(e) => { setName(e.target.value); setErrors({...errors, name: null}) }} placeholder="John Doe" className={`pl-9 ${themeClasses.input} ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                      </div>
                      {errors.name && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="email" className={themeClasses.textHeader}>Your Email *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        onBlur={handleEmailBlur} // Validate on Leave
                        onFocus={handleEmailFocus} // Clear on Enter
                        placeholder="john@example.com" 
                        className={`mt-2 ${themeClasses.input} ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                      />
                      {errors.email ? (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>
                      ) : (
                        <p className={`text-xs mt-1 ${themeClasses.textMuted}`}>Your email won't be displayed publicly</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role" className={themeClasses.textHeader}>Job Title (Optional)</Label>
                      <div className="relative mt-2">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="CEO at Company" className={`pl-9 ${themeClasses.input}`} />
                      </div>
                    </div>

                    <Button type="submit" disabled={submitting} className={`w-full mt-4 ${getButtonClass()}`} style={getButtonStyle()}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Submit Testimonial
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 6: UPLOADING */}
          {step === 'uploading' && (
            <motion.div key="uploading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-8 text-center">
                  <Upload className={`w-12 h-12 mx-auto mb-4 animate-bounce ${formSettings.theme_config.accentColor === 'custom' ? 'text-black dark:text-white' : 'text-violet-600'}`} />
                  <h2 className={`text-lg font-semibold mb-2 ${themeClasses.textHeader}`}>Uploading...</h2>
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className={`text-sm ${themeClasses.textMuted}`}>{uploadProgress}%</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 7: SUCCESS */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className={`overflow-hidden shadow-xl border-0 ${themeClasses.card}`}>
                <CardContent className="p-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}><CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" /></motion.div>
                  <h2 className={`text-2xl font-bold mb-2 ${themeClasses.textHeader}`}>{formSettings.thank_you_title}</h2>
                  <p className={`mb-6 ${themeClasses.textMuted}`}>{formSettings.thank_you_message}</p>
                  <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300">Want to collect testimonials like this?</p>
                    <a href="/" target="_blank" rel="noopener noreferrer" className="text-violet-600 font-medium hover:underline">Create your own Wall of Love →</a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
        <div className="text-center mt-6">
          <a href="/" target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline transition-colors ${themeClasses.textMuted}`}>Powered by <span className="font-medium text-violet-600">TrustFlow</span></a>
        </div>
      </motion.div>
    </div>
  );
};

export default SubmitTestimonial;