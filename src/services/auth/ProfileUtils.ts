export const getInitials = (displayName: string | null, email: string | null): string => {
  if (displayName) {
    const letterParts = displayName.trim().split(/\s+/).filter((p) => /^[a-zA-Z]/.test(p));
    if (letterParts.length >= 2) return (letterParts[0][0] + letterParts[1][0]).toUpperCase();
    if (letterParts.length === 1) return letterParts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

const MAX_PHOTO_SIZE = 200;

export const compressImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });

const PASSWORD_MIN_LENGTH = 6;

export const validatePasswordChange = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): string | null => {
  if (!currentPassword) return 'Current password is required.';
  if (newPassword !== confirmPassword) return 'New passwords do not match.';
  if (newPassword.length < PASSWORD_MIN_LENGTH)
    return `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  return null;
};

export const mapPasswordChangeError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : 'Failed to change password.';
  if (msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Current password is incorrect.';
  return msg;
};
