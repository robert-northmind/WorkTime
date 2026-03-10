export const getInitials = (displayName: string | null, email: string | null): string => {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
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
