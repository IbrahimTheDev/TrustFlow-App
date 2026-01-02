import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Star } from 'lucide-react';

const WallOfLove = () => {
  const [searchParams] = useSearchParams();
  const spaceId = searchParams.get('spaceId');
  const theme = searchParams.get('theme') || 'light';
  const layout = searchParams.get('layout') || 'grid';

  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spaceId) {
      fetchTestimonials();
    }
  }, [spaceId]);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_liked', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`animate-pulse p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className={`p-8 text-center ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
        <p>No testimonials yet</p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`grid gap-4 ${
        layout === 'carousel' 
          ? 'grid-flow-col auto-cols-[300px] overflow-x-auto' 
          : layout === 'masonry'
          ? 'columns-1 md:columns-2 lg:columns-3 space-y-4'
          : 'md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className={`p-6 rounded-xl shadow-sm transition-all hover:shadow-md ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            } ${layout === 'masonry' ? 'break-inside-avoid mb-4' : ''}`}
          >
            {/* Rating */}
            {testimonial.rating && (
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < testimonial.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Content */}
            {testimonial.type === 'video' && testimonial.video_url ? (
              <video
                src={testimonial.video_url}
                controls
                className="w-full rounded-lg mb-4 aspect-video object-cover"
              />
            ) : (
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                "{testimonial.content}"
              </p>
            )}

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                theme === 'dark' 
                  ? 'bg-violet-900/50 text-violet-300' 
                  : 'bg-violet-100 text-violet-600'
              }`}>
                {testimonial.respondent_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {testimonial.respondent_name}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallOfLove;
