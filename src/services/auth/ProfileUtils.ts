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

const CROP_OUTPUT_SIZE = 200;

export const cropImageToDataUrl = (
  img: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
): string => {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const canvas = document.createElement('canvas');
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Circular clip
  ctx.beginPath();
  ctx.arc(CROP_OUTPUT_SIZE / 2, CROP_OUTPUT_SIZE / 2, CROP_OUTPUT_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    CROP_OUTPUT_SIZE,
    CROP_OUTPUT_SIZE,
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};

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
