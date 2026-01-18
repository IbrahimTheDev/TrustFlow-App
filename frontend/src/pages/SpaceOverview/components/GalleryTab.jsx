// ============================================
// TRUSTFLOW - GALLERY TAB COMPONENT
// Widget Presets + Card Layouts Selection
// ============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sparkles, TrendingUp, Zap, Crown, Palette, MousePointer, 
  Briefcase, Check, ChevronRight, Star, Grid3X3,
  LayoutGrid, Play, Loader2, Layers, CreditCard, Heart,
  MessageSquare, MessageCircle, Video, Twitter, Quote, User, Clock, Building2,
  BadgeCheck, Eye, Monitor, Save, X, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { 
  WIDGET_PRESETS, 
  PRESET_CATEGORIES, 
  PRESET_THUMBNAILS,
  CARD_LAYOUT_PRESETS,
  COMBO_PRESETS,
  COMBO_CATEGORIES,
  getPresetsByCategory,
  getPresetById,
  getCardLayoutById,
  getComboPresetsByCategory
} from './widgetPresets';

// Icon mapping for categories
const CATEGORY_ICONS = {
  Sparkles, TrendingUp, Zap, Crown, Palette, MousePointer, Briefcase, Video, MessageCircle
};

// === MINI PREVIEW COMPONENT FOR PRESET CARDS ===
const MiniPreview = ({ preset }) => {
  const theme = PRESET_THUMBNAILS[preset.thumbnail] || PRESET_THUMBNAILS['minimalist'];
  const { layout } = preset.settings;
  
  return (
    <div className={`w-full h-32 rounded-lg ${theme.bg} p-3 relative overflow-hidden`}>
      {/* Layout-specific preview */}
      {layout === 'grid' && (
        <div className="grid grid-cols-3 gap-1.5 h-full">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`${theme.cardBg} rounded-md shadow-sm flex flex-col p-1.5`}
              style={{ opacity: 0.9 - (i * 0.1) }}
            >
              <div className={`w-full h-1 ${theme.accent} rounded-full mb-1`} />
              <div className={`flex-1 ${theme.accent} opacity-30 rounded`} />
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-3 h-3 ${theme.accent} rounded-full`} />
                <div className={`flex-1 h-1 ${theme.accent} rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {layout === 'carousel' && (
        <div className="flex items-center justify-center h-full gap-2 px-4">
          {[0.6, 1, 0.6].map((scale, i) => (
            <motion.div 
              key={i}
              className={`${theme.cardBg} rounded-lg shadow-lg flex flex-col p-2`}
              style={{ 
                width: i === 1 ? '45%' : '30%', 
                height: i === 1 ? '85%' : '70%',
                opacity: scale
              }}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`flex-1 ${theme.accent} opacity-30 rounded mb-1`} />
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 ${theme.accent} rounded-full`} />
                <div className={`flex-1 h-1 ${theme.accent} rounded-full`} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {layout === 'masonry' && (
        <div className="flex gap-1.5 h-full">
          {[0, 1, 2].map(col => (
            <div key={col} className="flex-1 flex flex-col gap-1.5">
              {[...Array(col === 1 ? 3 : 2)].map((_, i) => (
                <div 
                  key={i}
                  className={`${theme.cardBg} rounded-md shadow-sm flex-1 p-1.5`}
                  style={{ minHeight: col === 1 ? '25%' : '35%' }}
                >
                  <div className={`w-full h-1 ${theme.accent} rounded-full mb-1`} />
                  <div className={`h-2/3 ${theme.accent} opacity-30 rounded`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {layout === 'list' && (
        <div className="flex flex-col gap-1.5 h-full justify-center">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className={`${theme.cardBg} rounded-md shadow-sm flex items-center gap-2 p-2`}
              style={{ opacity: 0.95 - (i * 0.15) }}
            >
              <div className={`w-6 h-6 ${theme.accent} rounded-full flex-shrink-0`} />
              <div className="flex-1">
                <div className={`w-2/3 h-1.5 ${theme.accent} rounded-full mb-1`} />
                <div className={`w-full h-1 ${theme.accent} opacity-50 rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Popular Badge */}
      {preset.popular && (
        <div className="absolute top-1.5 right-1.5">
          <Badge className="bg-amber-500 text-white text-[8px] px-1.5 py-0 font-medium">
            <Star className="w-2 h-2 mr-0.5 fill-white" />
            Popular
          </Badge>
        </div>
      )}
      
      {/* Premium/Pro Badge */}
      {(preset.isPremium || preset.isPro) && (
        <div className="absolute top-1.5 left-1.5">
          <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[8px] px-1.5 py-0 font-medium border-0">
            <Crown className="w-2 h-2 mr-0.5" />
            PRO
          </Badge>
        </div>
      )}
    </div>
  );
};

// === PRESET CARD COMPONENT ===
const PresetCard = ({ preset, isSelected, onSelect, isApplying }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-violet-500 ring-offset-2 shadow-lg shadow-violet-500/20' 
            : 'hover:shadow-xl border-slate-200'
        }`}
        onClick={() => !isApplying && onSelect(preset)}
      >
        {/* Selection Indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-3 left-3 z-10 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        <CardContent className="p-0">
          {/* Mini Preview */}
          <div className="relative">
            <MiniPreview preset={preset} />
            
            {/* Hover Overlay */}
            <AnimatePresence>
              {isHovered && !isApplying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2"
                >
                  <Button 
                    size="sm" 
                    className="bg-white text-slate-900 hover:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(preset);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Applied
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Apply
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Preset Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                {preset.name}
                {preset.isDefault && (
                  <Badge variant="outline" className="text-[9px] border-green-200 bg-green-50 text-green-700 px-1">
                    DEFAULT
                  </Badge>
                )}
                {preset.isPro && (
                  <Badge className="text-[8px] bg-gradient-to-r from-violet-500 to-purple-500 text-white px-1 py-0 border-0">
                    PRO
                  </Badge>
                )}
              </h3>
              <Badge variant="secondary" className="text-[10px] capitalize bg-slate-100">
                {preset.settings.layout}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{preset.description}</p>
            
            {/* Custom Heading Preview */}
            {(preset.customHeading || preset.settings?.headingText) && (
              <div className="mt-2 p-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-md border border-violet-100">
                <p className="text-[9px] text-violet-400 uppercase tracking-wide font-medium">Preview Text</p>
                <p className="text-[11px] font-semibold text-violet-800 truncate">
                  {preset.customHeading || preset.settings?.headingText}
                </p>
                {(preset.customSubheading || preset.settings?.subheadingText) && (
                  <p className="text-[10px] text-violet-600 truncate">
                    {preset.customSubheading || preset.settings?.subheadingText}
                  </p>
                )}
              </div>
            )}
            
            {/* Quick Info Tags */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {preset.settings.autoScroll && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  Auto-scroll
                </span>
              )}
              {preset.settings.smoothContinuousScroll && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                  Smooth Flow
                </span>
              )}
              {preset.settings.popupsEnabled && (
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Popups
                </span>
              )}
              {preset.settings.theme === 'dark' && (
                <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full">
                  Dark
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// === CARD LAYOUT PREVIEW COMPONENT ===
const CardLayoutPreview = ({ layout, theme = 'light' }) => {
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  
  // Structure-based mini previews
  const renderStructure = () => {
    switch (layout.structure) {
      case 'profile-rating-content':
        // Testimonial.to style
        return (
          <div className={`${bgClass} rounded-lg p-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Profile top */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <div className="flex-1">
                <div className={`h-2 w-16 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded mb-1`} />
                <div className={`h-1.5 w-12 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            </div>
            {/* Rating */}
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            {/* Content with highlight */}
            <div className="flex-1 space-y-1">
              <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-3/4 bg-violet-200 rounded`} />
              <div className={`h-2 w-5/6 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
            </div>
          </div>
        );
        
      case 'profile-content-brand':
        // Mixpanel style
        return (
          <div className={`${bgClass} rounded-lg p-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Profile top */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`} />
              <div className="flex-1">
                <div className={`h-2.5 w-20 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded mb-1`} />
                <div className={`h-1.5 w-24 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
            </div>
            {/* Content with highlight */}
            <div className="flex-1 space-y-1.5 mb-3">
              <div className={`h-2 w-full bg-violet-300 rounded`} />
              <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-4/5 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
            </div>
            {/* Brand logo bottom */}
            <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded ${isDark ? 'bg-purple-600' : 'bg-purple-500'}`} />
                <div className={`h-2 w-12 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded`} />
              </div>
            </div>
          </div>
        );
        
      case 'video-overlay-profile':
        // Video hero style
        return (
          <div className="relative h-full rounded-lg overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
            {/* Bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-white/30" />
                <div className="h-2 w-16 bg-white/50 rounded" />
              </div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            {/* Hearts */}
            <Heart className="absolute top-2 right-2 w-4 h-4 text-rose-400 fill-rose-400" />
          </div>
        );
        
      case 'profile-content-timestamp':
        // Twitter style
        return (
          <div className={`${bgClass} rounded-lg p-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Profile row */}
            <div className="flex items-start gap-2 mb-2">
              <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className={`h-2.5 w-16 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded`} />
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                </div>
                <div className={`h-1.5 w-20 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 space-y-1.5 mb-2">
              <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-5/6 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-3/4 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
            </div>
            {/* Timestamp */}
            <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex items-center`}>
              <Clock className={`w-3 h-3 ${mutedClass} mr-1`} />
              <div className={`h-1.5 w-20 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
            </div>
          </div>
        );
        
      case 'quote-signature':
        // Large quote style
        return (
          <div className={`${bgClass} rounded-lg p-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <Quote className={`w-6 h-6 ${isDark ? 'text-violet-400' : 'text-violet-500'} mb-2 opacity-50`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-3 w-5/6 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-3 w-4/5 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
            </div>
            {/* Signature footer */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <div className="text-right">
                <div className={`h-1 w-8 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded mb-1`} />
                <div className={`h-2 w-16 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded`} />
              </div>
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-slate-600' : 'bg-violet-200'}`} />
            </div>
          </div>
        );
        
      case 'split-avatar-content':
        // Modern split
        return (
          <div className={`${bgClass} rounded-lg overflow-hidden h-full flex shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Left avatar area */}
            <div className={`w-1/3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
              <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-slate-600' : 'bg-violet-200'}`} />
            </div>
            {/* Right content */}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
                <div className={`h-2 w-4/5 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              </div>
              <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className={`h-2 w-20 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded mb-1`} />
                <div className={`h-1.5 w-14 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
            </div>
          </div>
        );
        
      case 'floating-avatar-content':
        // Floating badge
        return (
          <div className="relative pt-6 h-full">
            {/* Floating avatar */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full ${isDark ? 'bg-slate-600 border-slate-800' : 'bg-gradient-to-br from-amber-400 to-orange-500 border-white'} border-4 shadow-lg z-10`} />
            {/* Card body */}
            <div className={`${bgClass} rounded-lg pt-8 pb-3 px-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="text-center mb-2">
                <div className={`h-2.5 w-20 mx-auto ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded mb-1`} />
                <div className={`h-1.5 w-16 mx-auto ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
              <div className="flex justify-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="flex-1 space-y-1 text-center">
                <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
                <div className={`h-2 w-5/6 mx-auto ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              </div>
            </div>
          </div>
        );
        
      default:
        // Default TrustFlow style
        return (
          <div className={`${bgClass} rounded-lg p-3 h-full flex flex-col shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Rating top */}
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 space-y-1.5 mb-3">
              <div className={`h-2 w-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-5/6 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
              <div className={`h-2 w-4/5 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} rounded`} />
            </div>
            {/* Profile bottom */}
            <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-dashed border-slate-200'} flex items-center gap-2`}>
              <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-slate-600' : 'bg-violet-200'}`} />
              <div>
                <div className={`h-2 w-16 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded mb-1`} />
                <div className={`h-1.5 w-12 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} rounded`} />
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="w-full h-36 p-2">
      {renderStructure()}
    </div>
  );
};

// === CARD LAYOUT CARD COMPONENT ===
const CardLayoutCard = ({ layout, isSelected, onSelect, isApplying, theme }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'ring-2 ring-violet-500 ring-offset-2 shadow-lg shadow-violet-500/20' 
            : 'hover:shadow-xl border-slate-200'
        }`}
        onClick={() => !isApplying && onSelect(layout)}
      >
        {/* Selection Indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-3 left-3 z-10 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Premium/Pro Badge */}
        {(layout.isPremium || layout.isPro) && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[8px] px-1.5 py-0 font-medium border-0">
              <Crown className="w-2 h-2 mr-0.5" />
              PRO
            </Badge>
          </div>
        )}

        <CardContent className="p-0">
          {/* Layout Preview */}
          <div className="relative bg-slate-50">
            <CardLayoutPreview layout={layout} theme={theme} />
            
            {/* Hover Overlay */}
            <AnimatePresence>
              {isHovered && !isApplying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2"
                >
                  <Button 
                    size="sm" 
                    className="bg-white text-slate-900 hover:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(layout);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Applied
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Apply
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Layout Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <span className="text-base">{layout.icon}</span>
                {layout.name}
                {layout.isDefault && (
                  <Badge variant="outline" className="text-[9px] border-green-200 bg-green-50 text-green-700 px-1">
                    DEFAULT
                  </Badge>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{layout.description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// === MAIN GALLERY TAB COMPONENT ===
const GalleryTab = ({ 
  spaceId, 
  widgetSettings, 
  setWidgetSettings, 
  saveWidgetSettings,
  savedWidgetSettings, // Pass saved settings from parent for comparison
  setSavedWidgetSettings, // Update saved settings after save
  setActiveTab,
  testimonials = []
}) => {
  const [selectedSection, setSelectedSection] = useState('presets');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLayoutCategory, setSelectedLayoutCategory] = useState('all');
  const [selectedComboCategory, setSelectedComboCategory] = useState('all');
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sample testimonial for preview
  const sampleTestimonial = testimonials[0] || {
    id: 'sample',
    respondent_name: 'Sarah Johnson',
    respondent_role: 'Product Manager',
    respondent_photo_url: null,
    content: 'This product has completely transformed how we handle customer feedback. Highly recommended!',
    rating: 5,
    created_at: new Date().toISOString()
  };

  // Detect current preset from settings
  const currentPresetId = useMemo(() => {
    if (!widgetSettings) return 'default';
    return widgetSettings.presetId || 'default';
  }, [widgetSettings]);

  // Detect current card layout from settings
  const currentCardStyle = useMemo(() => {
    if (!widgetSettings) return 'default';
    return widgetSettings.cardStyle || 'default';
  }, [widgetSettings]);

  // LIVE PREVIEW CARD COMPONENT
  const LivePreviewCard = () => {
    const cardStyle = widgetSettings?.cardStyle || 'default';
    const isDark = widgetSettings?.cardTheme === 'dark';
    const corners = widgetSettings?.corners || 'default';
    const shadow = widgetSettings?.shadow || 'default';
    
    const cornerClass = corners === 'sharp' ? 'rounded-none' : corners === 'round' ? 'rounded-3xl' : 'rounded-xl';
    const shadowClass = shadow === 'none' ? '' : shadow === 'light' ? 'shadow-sm' : shadow === 'strong' ? 'shadow-xl' : 'shadow-md';
    
    const StarRating = ({ rating }) => (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i < (rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    );

    const BrandingBadge = ({ position = 'top-right' }) => {
      if (widgetSettings?.showBranding === false) return null;
      
      const positionClasses = {
        'top-right': 'absolute top-2 right-2',
        'top-left': 'absolute top-2 left-2',
        'bottom-right': 'absolute bottom-2 right-2',
        'bottom-left': 'absolute bottom-2 left-2',
        'bottom-center': 'absolute bottom-2 left-1/2 -translate-x-1/2'
      };
      
      return (
        <div className={`${positionClasses[position] || positionClasses['top-right']} z-10`}>
          <span className={`text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 sm:gap-1 backdrop-blur-sm border ${isDark ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-white/80 text-slate-600 border-slate-200'}`}>
            <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-violet-500 text-violet-500" /> TrustFlow
          </span>
        </div>
      );
    };

    const baseCardClass = `relative p-3 sm:p-5 flex flex-col transition-all duration-300 ${cornerClass} ${shadowClass} ${
      isDark ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800 border border-slate-200'
    }`;

    // Testimonial Classic Style - branding bottom-right to avoid heart icon conflict
    if (cardStyle === 'testimonial-classic') {
      return (
        <div className={baseCardClass}>
          <BrandingBadge position="bottom-right" />
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white shadow-md">
                <AvatarImage src={sampleTestimonial.respondent_photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-xs">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-xs sm:text-sm">{sampleTestimonial.respondent_name}</div>
                <div className={`text-[9px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sampleTestimonial.respondent_role}</div>
              </div>
            </div>
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 fill-rose-400" />
          </div>
          <div className="mb-2"><StarRating rating={sampleTestimonial.rating} /></div>
          <p className="text-xs sm:text-sm leading-relaxed line-clamp-3">{sampleTestimonial.content}</p>
        </div>
      );
    }

    // Mixpanel Style - branding top-right for consistency
    if (cardStyle === 'mixpanel-style') {
      return (
        <div className={baseCardClass}>
          <BrandingBadge position="top-right" />
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white shadow-lg">
              <AvatarImage src={sampleTestimonial.respondent_photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-sm sm:text-base">{sampleTestimonial.respondent_name}</div>
              <div className={`text-[10px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sampleTestimonial.respondent_role}</div>
            </div>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed line-clamp-3 mb-3">{sampleTestimonial.content}</p>
          <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex items-center gap-2`}>
            <div className={`w-4 h-4 rounded ${isDark ? 'bg-purple-600' : 'bg-purple-500'} flex items-center justify-center`}>
              <span className="text-white text-[7px] font-bold">✓</span>
            </div>
            <span className={`text-[10px] sm:text-xs font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Verified Review</span>
          </div>
        </div>
      );
    }

    // Twitter Style - branding top-right for consistency
    if (cardStyle === 'twitter-style') {
      return (
        <div className={baseCardClass}>
          <BrandingBadge position="top-right" />
          <div className="flex items-start gap-2 sm:gap-3 mb-2">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
              <AvatarImage src={sampleTestimonial.respondent_photo_url} />
              <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs sm:text-sm truncate">{sampleTestimonial.respondent_name}</span>
                <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 fill-blue-500 flex-shrink-0" />
              </div>
              <div className={`text-[9px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sampleTestimonial.respondent_role}</div>
            </div>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed line-clamp-3 mb-2">{sampleTestimonial.content}</p>
          <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex items-center gap-2`}>
            <Clock className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={`text-[9px] sm:text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Just now</span>
            <div className="ml-auto"><StarRating rating={sampleTestimonial.rating} /></div>
          </div>
        </div>
      );
    }

    // Quote Card Style - branding top-right, works well with quote icon on left
    if (cardStyle === 'quote-card') {
      return (
        <div className={baseCardClass}>
          <BrandingBadge position="top-right" />
          <Quote className={`w-6 h-6 sm:w-8 sm:h-8 ${isDark ? 'text-violet-400' : 'text-violet-500'} opacity-40 mb-2`} />
          <p className="text-sm sm:text-base font-serif italic leading-relaxed line-clamp-3 mb-3">"{sampleTestimonial.content}"</p>
          <div className="mb-3"><StarRating rating={sampleTestimonial.rating} /></div>
          <div className="flex items-center justify-end gap-2">
            <div className="text-right">
              <div className={`text-[8px] sm:text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-0.5`}>— Signed by</div>
              <div className="font-bold text-xs sm:text-sm">{sampleTestimonial.respondent_name}</div>
            </div>
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-violet-200">
              <AvatarImage src={sampleTestimonial.respondent_photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-xs">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      );
    }

    // Modern Split Style - branding bottom-right in the content area
    if (cardStyle === 'modern-split') {
      return (
        <div className={`${baseCardClass} !p-0 overflow-hidden`}>
          <div className="flex h-full">
            <div className={`w-1/3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center p-3 sm:p-4`}>
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                <AvatarImage src={sampleTestimonial.respondent_photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-lg">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between relative">
              <BrandingBadge position="bottom-right" />
              <div className="mb-2"><StarRating rating={sampleTestimonial.rating} /></div>
              <p className="text-xs sm:text-sm leading-relaxed line-clamp-3 mb-2">{sampleTestimonial.content}</p>
              <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className="font-bold text-xs sm:text-sm">{sampleTestimonial.respondent_name}</div>
                <div className={`text-[9px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sampleTestimonial.respondent_role}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Floating Badge Style - branding top-right for consistency
    if (cardStyle === 'floating-badge') {
      return (
        <div className={`${baseCardClass} pt-8 sm:pt-10`}>
          <BrandingBadge position="top-right" />
          <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-10">
            <Avatar className="w-10 h-10 sm:w-14 sm:h-14 border-3 sm:border-4 border-white shadow-xl">
              <AvatarImage src={sampleTestimonial.respondent_photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-base sm:text-xl">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center pt-2">
            <div className="font-bold text-sm sm:text-base mb-0.5">{sampleTestimonial.respondent_name}</div>
            <div className={`text-[9px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{sampleTestimonial.respondent_role}</div>
            <div className="flex justify-center mb-2"><StarRating rating={sampleTestimonial.rating} /></div>
            <p className="text-xs sm:text-sm leading-relaxed line-clamp-3 text-center">{sampleTestimonial.content}</p>
          </div>
        </div>
      );
    }

    // Default Style - branding top-right for standard layout
    return (
      <div className={baseCardClass}>
        <BrandingBadge position="top-right" />
        <div className="mb-2"><StarRating rating={sampleTestimonial.rating} /></div>
        <p className="text-xs sm:text-sm leading-relaxed line-clamp-3 mb-3">{sampleTestimonial.content}</p>
        <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-dashed border-gray-200/30">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/20">
            <AvatarImage src={sampleTestimonial.respondent_photo_url} />
            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{sampleTestimonial.respondent_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold text-xs sm:text-sm flex items-center gap-1">
              {sampleTestimonial.respondent_name}
              <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-blue-500" />
            </div>
            <div className="text-[9px] sm:text-[10px] opacity-70">{sampleTestimonial.respondent_role}</div>
          </div>
        </div>
      </div>
    );
  };

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    return getPresetsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Filter card layouts by category
  const filteredLayouts = useMemo(() => {
    if (selectedLayoutCategory === 'all') return CARD_LAYOUT_PRESETS;
    return CARD_LAYOUT_PRESETS.filter(l => l.category === selectedLayoutCategory);
  }, [selectedLayoutCategory]);

  // Filter combo presets by category
  const filteredCombos = useMemo(() => {
    if (selectedComboCategory === 'all') return COMBO_PRESETS;
    return COMBO_PRESETS.filter(c => c.category === selectedComboCategory);
  }, [selectedComboCategory]);

  // Handle Combo Preset Selection & Apply
  const handleApplyComboPreset = async (combo) => {
    if (isApplying) return;
    
    setIsApplying(true);

    try {
      // Get the base preset settings
      const basePreset = getPresetById(combo.presetId);
      if (!basePreset) {
        throw new Error('Base preset not found');
      }

      // COMPLETELY REPLACE settings with preset settings + card style (no merge with old settings)
      const newSettings = {
        ...basePreset.settings,  // Start fresh with preset settings only
        presetId: combo.presetId,
        cardStyle: combo.cardStyle,
        // Override with combo's custom heading/subheading if defined
        ...(combo.customHeading && { 
          showHeading: true,
          headingText: combo.customHeading,
          customHeading: combo.customHeading 
        }),
        ...(combo.customSubheading && { 
          showSubheading: true,
          subheadingText: combo.customSubheading,
          customSubheading: combo.customSubheading 
        })
      };

      // Update local state immediately for instant preview
      setWidgetSettings(newSettings);
      setHasUnsavedChanges(true);

      // Light feedback (no confetti until saved)
      toast.success(`"${combo.name}" combo previewing!`, {
        description: 'Click "Save Changes" to apply to your live widget.',
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to apply combo preset:', error);
      toast.error('Failed to apply combo preset', {
        description: 'Please try again or check your connection.'
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Handle Preset Selection & Apply
  const handleApplyPreset = (preset) => {
    if (isApplying) return;
    
    setIsApplying(true);

    try {
      // COMPLETELY REPLACE settings with preset settings (no merge with old settings)
      // Only preserve current cardStyle so user can keep their card layout choice
      const currentCardStyle = widgetSettings?.cardStyle || 'default';
      
      const newSettings = {
        ...preset.settings,  // Start fresh with preset settings only
        presetId: preset.id,
        cardStyle: currentCardStyle, // Preserve user's card layout choice
        // If preset has custom heading/subheading, apply them
        ...(preset.customHeading && { 
          showHeading: true,
          headingText: preset.customHeading,
          customHeading: preset.customHeading 
        }),
        ...(preset.customSubheading && { 
          showSubheading: true,
          subheadingText: preset.customSubheading,
          customSubheading: preset.customSubheading 
        })
      };

      // Update local state immediately for instant PREVIEW only
      setWidgetSettings(newSettings);
      setHasUnsavedChanges(true);

      // Light feedback (no confetti until saved)
      toast.success(`"${preset.name}" preset previewing!`, {
        description: 'Click "Save Changes" to apply to your live widget.',
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to apply preset:', error);
      toast.error('Failed to apply preset');
    } finally {
      setIsApplying(false);
    }
  };

  // Handle Card Layout Selection & Apply (merges with current preset settings)
  const handleApplyCardLayout = (layout) => {
    if (isApplying) return;
    
    setIsApplying(true);

    try {
      // Card layouts MERGE with current preset settings (only update cardStyle)
      const newSettings = {
        ...widgetSettings,
        cardStyle: layout.id
      };

      // Update local state immediately for preview
      setWidgetSettings(newSettings);
      setHasUnsavedChanges(true);

      toast.success(`"${layout.name}" card style previewing!`, {
        description: 'Click "Save Changes" to apply to your live widget.',
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to apply card layout:', error);
      toast.error('Failed to apply card layout');
    } finally {
      setIsApplying(false);
    }
  };

  // Handle Save Changes - saves to database
  const handleSaveChanges = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      await saveWidgetSettings(widgetSettings);
      
      // Update saved settings in parent so Discard works correctly
      if (setSavedWidgetSettings) {
        setSavedWidgetSettings(widgetSettings);
      }
      
      setHasUnsavedChanges(false);
      
      // Success confetti
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#8b5cf6', '#a78bfa']
      });
      
      toast.success('Changes saved!', {
        description: 'Your widget is now live with the new settings.'
      });
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast.error('Failed to save changes', {
        description: 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Discard Changes - revert to saved settings
  const handleDiscardChanges = () => {
    if (savedWidgetSettings) {
      setWidgetSettings(savedWidgetSettings);
    }
    setHasUnsavedChanges(false);
    toast.info('Changes discarded', {
      description: 'Reverted to last saved settings.'
    });
  };

  // Layout category options
  const layoutCategories = [
    { id: 'all', name: 'All', icon: Grid3X3 },
    { id: 'default', name: 'Default', icon: Star },
    { id: 'social', name: 'Social', icon: Twitter },
    { id: 'professional', name: 'Professional', icon: Building2 },
    { id: 'video', name: 'Video', icon: Video },
    { id: 'premium', name: 'Premium', icon: Crown }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Floating Save Button - appears when there are unsaved changes */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              className="bg-white shadow-lg border-slate-300 hover:bg-slate-50"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Discard
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl shadow-violet-500/30"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Unsaved Changes Indicator */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-500" />
              Design Gallery
              {hasUnsavedChanges && (
                <Badge className="ml-2 bg-amber-500 text-white text-[9px] animate-pulse">
                  UNSAVED
                </Badge>
              )}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Choose presets and card layouts • Changes preview instantly
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {currentPresetId && currentPresetId !== 'default' && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-violet-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-violet-200">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" />
                <span className="text-xs sm:text-sm text-violet-700 font-medium">
                  {getPresetById(currentPresetId)?.name || 'Custom'}
                </span>
              </div>
            )}
            {currentCardStyle && currentCardStyle !== 'default' && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-emerald-200">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                <span className="text-xs sm:text-sm text-emerald-700 font-medium">
                  {getCardLayoutById(currentCardStyle)?.name || 'Custom'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview Section - Redesigned with Preset + Card Preview */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 border-0 overflow-hidden shadow-2xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left Side - Preset Theme Preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Theme Preview</h4>
                  <p className="text-[10px] text-slate-400">Current preset settings</p>
                </div>
              </div>
              
              {/* Mini Theme Preview */}
              <div className={`rounded-xl p-4 border ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Heading Preview */}
                {(widgetSettings?.showHeading || widgetSettings?.headingText) && (
                  <div className="text-center mb-3">
                    <h5 
                      className="text-sm font-bold truncate"
                      style={{ 
                        color: widgetSettings?.headingColor || (widgetSettings?.cardTheme === 'dark' ? '#fff' : '#1e293b'),
                        fontFamily: widgetSettings?.headingFont || 'Inter'
                      }}
                    >
                      {widgetSettings?.headingText || widgetSettings?.customHeading || 'Your Heading'}
                    </h5>
                    {(widgetSettings?.showSubheading || widgetSettings?.subheadingText) && (
                      <p 
                        className="text-[10px] truncate mt-1"
                        style={{ 
                          color: widgetSettings?.subheadingColor || (widgetSettings?.cardTheme === 'dark' ? '#94a3b8' : '#64748b'),
                          fontFamily: widgetSettings?.subheadingFont || 'Inter'
                        }}
                      >
                        {widgetSettings?.subheadingText || widgetSettings?.customSubheading || 'Your subheading'}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Layout Preview */}
                <div className="flex gap-2 justify-center">
                  {widgetSettings?.layout === 'carousel' ? (
                    <div className="flex items-center gap-1">
                      {[0.6, 1, 0.6].map((opacity, i) => (
                        <div 
                          key={i} 
                          className={`rounded ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                          style={{ width: i === 1 ? 40 : 28, height: i === 1 ? 50 : 40, opacity }}
                        />
                      ))}
                    </div>
                  ) : widgetSettings?.layout === 'masonry' ? (
                    <div className="flex gap-1">
                      {[40, 50, 35].map((h, i) => (
                        <div 
                          key={i} 
                          className={`w-6 rounded ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                          style={{ height: h }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {[...Array(6)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-5 h-5 rounded ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Settings Tags */}
                <div className="flex flex-wrap gap-1 mt-3 justify-center">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {widgetSettings?.layout || 'grid'}
                  </span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {widgetSettings?.corners || 'smooth'}
                  </span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${widgetSettings?.cardTheme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {widgetSettings?.shadow || 'medium'} shadow
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Card Preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Card Preview</h4>
                  <p className="text-[10px] text-slate-400">How testimonials appear</p>
                </div>
              </div>
              
              <motion.div
                key={`${currentCardStyle}-${currentPresetId}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <LivePreviewCard />
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Tabs - Premium Styled */}
      <Tabs value={selectedSection} onValueChange={setSelectedSection} className="w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-slate-200 shadow-sm mb-4 sm:mb-6 inline-flex">
          <TabsList className="bg-transparent gap-1 h-auto p-0">
            <TabsTrigger 
              value="presets" 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/25 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Widget</span> Presets
            </TabsTrigger>
            <TabsTrigger 
              value="cards" 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Card</span> Layouts
            </TabsTrigger>
            <TabsTrigger 
              value="combos" 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 transition-all"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Combo</span> Packs
              <Badge className="hidden xs:flex ml-0.5 sm:ml-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[7px] sm:text-[8px] px-1.5 py-0.5 border-0">
                HOT
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PRESETS SECTION */}
        <TabsContent value="presets" className="space-y-4 sm:space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {PRESET_CATEGORIES.map((category) => {
              const IconComponent = CATEGORY_ICONS[category.icon];
              const isActive = selectedCategory === category.id;
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`transition-all text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 ${
                    isActive 
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md' 
                      : 'hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />}
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.slice(0, 3)}</span>
                  {category.id === 'popular' && (
                    <Badge className="ml-1 sm:ml-1.5 bg-amber-500 text-white text-[8px] sm:text-[9px] px-1 py-0">
                      HOT
                    </Badge>
                  )}
                  {category.id === 'premium' && (
                    <Badge className="ml-1 sm:ml-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[8px] sm:text-[9px] px-1 py-0 border-0">
                      PRO
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Presets Grid */}
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={currentPresetId === preset.id}
                  onSelect={handleApplyPreset}
                  isApplying={isApplying}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredPresets.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No presets found</h3>
              <p className="text-slate-500 text-sm">Try selecting a different category</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSelectedCategory('all')}
              >
                View all presets
              </Button>
            </div>
          )}
        </TabsContent>

        {/* CARD LAYOUTS SECTION */}
        <TabsContent value="cards" className="space-y-4 sm:space-y-6">
          {/* Layout Category Filter */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {layoutCategories.map((category) => {
              const IconComponent = category.icon;
              const isActive = selectedLayoutCategory === category.id;
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLayoutCategory(category.id)}
                  className={`transition-all text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 ${
                    isActive 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                      : 'hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />}
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.slice(0, 3)}</span>
                  {category.id === 'premium' && (
                    <Badge className="ml-1 sm:ml-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[8px] sm:text-[9px] px-1 py-0 border-0">
                      PRO
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Card Layouts Grid */}
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredLayouts.map((layout) => (
                <CardLayoutCard
                  key={layout.id}
                  layout={layout}
                  isSelected={currentCardStyle === layout.id}
                  onSelect={handleApplyCardLayout}
                  isApplying={isApplying}
                  theme={widgetSettings?.cardTheme || 'light'}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredLayouts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No layouts found</h3>
              <p className="text-slate-500 text-sm">Try selecting a different category</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSelectedLayoutCategory('all')}
              >
                View all layouts
              </Button>
            </div>
          )}
        </TabsContent>

        {/* COMBO PRESETS SECTION */}
        <TabsContent value="combos" className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Combo Packs</h3>
              <p className="text-xs text-slate-500">Pre-matched theme + card layout combinations</p>
            </div>
            <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] sm:text-[10px] px-2 border-0">
              {COMBO_PRESETS.length} Combos
            </Badge>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {COMBO_CATEGORIES.map((category) => {
              const isActive = selectedComboCategory === category.id;
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedComboCategory(category.id)}
                  className={`transition-all text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 ${
                    isActive 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md' 
                      : 'hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.slice(0, 4)}</span>
                </Button>
              );
            })}
          </div>

          {/* Combo Grid */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredCombos.map((combo) => {
                const theme = PRESET_THUMBNAILS[combo.thumbnail] || PRESET_THUMBNAILS['minimalist'];
                const basePreset = getPresetById(combo.presetId);
                const cardLayout = getCardLayoutById(combo.cardStyle);
                const isCurrentCombo = widgetSettings?.presetId === combo.presetId && 
                                       widgetSettings?.cardStyle === combo.cardStyle;
                
                return (
                  <motion.div
                    key={combo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer ${
                        isCurrentCombo 
                          ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-100' 
                          : 'hover:ring-2 hover:ring-amber-200'
                      }`}
                      onClick={() => !isApplying && handleApplyComboPreset(combo)}
                    >
                      {/* Premium Badge */}
                      {combo.isPro && (
                        <div className="absolute top-2 right-2 z-20">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 border-0 shadow-md">
                            <Crown className="w-2.5 h-2.5 mr-0.5" />
                            PRO
                          </Badge>
                        </div>
                      )}

                      {/* Selected Indicator */}
                      {isCurrentCombo && (
                        <div className="absolute top-2 left-2 z-20">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Combo Preview */}
                      <div className={`relative h-28 sm:h-32 ${theme.bg} p-3 overflow-hidden`}>
                        {/* Mini card preview */}
                        <div className="absolute inset-2 flex items-center justify-center">
                          <div className={`${theme.cardBg} rounded-lg shadow-lg p-3 w-4/5 h-4/5 flex flex-col justify-between`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 ${theme.accent} rounded-full`} />
                              <div className="flex-1 space-y-1">
                                <div className={`h-2 w-3/4 ${theme.accent} rounded`} />
                                <div className={`h-1.5 w-1/2 ${theme.accent} opacity-50 rounded`} />
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-2 h-2 fill-yellow-400 text-yellow-400`} />
                              ))}
                            </div>
                            <div className={`h-8 ${theme.accent} opacity-30 rounded`} />
                          </div>
                        </div>

                        {/* Combo Label */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                            <span className="text-[8px] sm:text-[9px] text-white/80">{cardLayout?.icon}</span>
                            <span className="text-[8px] sm:text-[9px] text-white font-medium truncate">{cardLayout?.name}</span>
                            <span className="text-[8px] sm:text-[9px] text-white/60">+</span>
                            <span className="text-[8px] sm:text-[9px] text-white/80 truncate">{basePreset?.name?.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-3 sm:p-4">
                        <div className="mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {combo.name}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {combo.description}
                          </p>
                        </div>

                        {/* Custom Heading Preview */}
                        {combo.customHeading && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-md">
                            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wide">Heading</p>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-700 truncate">{combo.customHeading}</p>
                          </div>
                        )}

                        {/* Apply Button */}
                        <Button 
                          size="sm" 
                          className={`w-full mt-3 text-xs sm:text-sm h-8 sm:h-9 ${
                            isCurrentCombo 
                              ? 'bg-amber-500 hover:bg-amber-600' 
                              : 'bg-slate-900 hover:bg-slate-800'
                          }`}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <>
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 animate-spin" />
                              Applying...
                            </>
                          ) : isCurrentCombo ? (
                            <>
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                              Apply Combo
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          {filteredCombos.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No combos found</h3>
              <p className="text-slate-500 text-sm">Try selecting a different category</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSelectedComboCategory('all')}
              >
                View all combos
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pro Tip Card */}
      <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 text-xs sm:text-sm">Pro Tip</h4>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                  After applying a preset or card layout, go to the <strong>Widget Designer</strong> tab to fine-tune 
                  colors, fonts, animations, and other settings.
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-violet-600 hover:text-violet-700 flex-shrink-0 text-xs sm:text-sm h-7 sm:h-8 w-full sm:w-auto"
              onClick={() => setActiveTab('widget')}
            >
              <span className="mr-1">Go to Designer</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GalleryTab;
