import React, { useCallback, useEffect, useState } from 'react';
import { getInitials, hashEmail, getGravatarUrl } from '../services/auth/ProfileUtils';

interface ProfileAvatarProps {
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

const resolveGravatarUrl = async (email: string | null | undefined): Promise<string | null> => {
  if (!email) return null;
  const hash = await hashEmail(email);
  return getGravatarUrl(hash);
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  displayName,
  email,
  size = 'md',
  className = '',
}) => {
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(displayName ?? null, email ?? null);
  const sizeClass = sizeClasses[size];

  useEffect(() => {
    let cancelled = false;
    resolveGravatarUrl(email).then((url) => {
      if (!cancelled) {
        setGravatarUrl(url);
        setImgFailed(false);
      }
    });
    return () => { cancelled = true; };
  }, [email]);

  const handleImgError = useCallback(() => setImgFailed(true), []);

  if (gravatarUrl && !imgFailed) {
    return (
      <img
        src={gravatarUrl}
        alt={displayName ?? email ?? 'Profile'}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        onError={handleImgError}
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
