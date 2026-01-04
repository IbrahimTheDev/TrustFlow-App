import React, { useState, useEffect } from 'react';
import { User, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a tailwind utility, or just remove 'cn' if not

const UserProfileImage = ({ src, alt, className, iconClassName }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the source URL changes (e.g. user uploads a new photo)
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // CONDITION 1: No Image URL provided
  // CONDITION 2: Image failed to load (onError triggered)
  if (!src || hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full overflow-hidden", 
          className
        )}
      >
        {/* You can choose User or UserCircle from lucide-react */}
        <User className={cn("w-1/2 h-1/2", iconClassName)} strokeWidth={2} />
      </div>
    );
  }

  // CONDITION 3: Show the actual image
  return (
    <img 
      src={src} 
      alt={alt || "Profile"} 
      className={cn("object-cover w-full h-full rounded-full", className)}
      onError={() => setHasError(true)} // This triggers the fallback
    />
  );
};

export default UserProfileImage;