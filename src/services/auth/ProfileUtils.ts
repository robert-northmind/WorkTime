export const getInitials = (displayName: string | null, email: string | null): string => {
  if (displayName) {
    const letterParts = displayName.trim().split(/\s+/).filter((p) => /^[a-zA-Z]/.test(p));
    if (letterParts.length >= 2) return (letterParts[0][0] + letterParts[1][0]).toUpperCase();
    if (letterParts.length === 1) return letterParts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

export const hashEmail = async (email: string): Promise<string> => {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getGravatarUrl = (emailHash: string, size = 200): string =>
  `https://gravatar.com/avatar/${emailHash}?s=${size}&d=404`;

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
