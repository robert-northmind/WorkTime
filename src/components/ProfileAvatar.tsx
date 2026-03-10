import React from 'react';
import { getInitials } from '../services/auth/ProfileUtils';

interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<ProfileAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoURL,
  displayName,
  email,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(displayName ?? null, email ?? null);
  const sizeClass = sizeClasses[size];

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName ?? email ?? 'Profile'}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-blue-600 flex items-center justify-center text-white font-bold select-none ${sizeClass} ${className}`}
    >
      {initials}
    </div>
  );
};
