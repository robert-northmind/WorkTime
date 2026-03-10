import {
  getInitials,
  validatePasswordChange,
  mapPasswordChangeError,
} from '../../../src/services/auth/ProfileUtils';

describe('ProfileService', () => {
  describe('getInitials', () => {
    it('returns first letters of first and last name', () => {
      expect(getInitials('Jane Doe', null)).toBe('JD');
    });

    it('returns single letter when display name has one word', () => {
      expect(getInitials('Jane', null)).toBe('J');
    });

    it('uses first two words when display name has more than two', () => {
      expect(getInitials('Jane Marie Doe', null)).toBe('JM');
    });

    it('falls back to email initial when display name is null', () => {
      expect(getInitials(null, 'jane@example.com')).toBe('J');
    });

    it('falls back to email initial when display name is empty string', () => {
      expect(getInitials('', 'jane@example.com')).toBe('J');
    });

    it('returns ? when both display name and email are null', () => {
      expect(getInitials(null, null)).toBe('?');
    });

    it('uppercases the initials', () => {
      expect(getInitials('alice bob', null)).toBe('AB');
    });

    it('handles extra whitespace in display name', () => {
      expect(getInitials('  Alice   Bob  ', null)).toBe('AB');
    });

    it('ignores emoji words and uses the first letter-word', () => {
      expect(getInitials('Robert 👋 🧑', null)).toBe('R');
    });

    it('uses letter-words when emoji precede them', () => {
      expect(getInitials('👋 Alice Bob', null)).toBe('AB');
    });

    it('falls back to email initial when all words are emoji', () => {
      expect(getInitials('👋 🧑', 'jane@example.com')).toBe('J');
    });

    it('returns ? when name is all emoji and no email', () => {
      expect(getInitials('👋 🧑', null)).toBe('?');
    });
  });

  describe('validatePasswordChange', () => {
    it('returns null when all fields are valid', () => {
      expect(validatePasswordChange('current123', 'newpass123', 'newpass123')).toBeNull();
    });

    it('returns error when current password is empty', () => {
      expect(validatePasswordChange('', 'newpass123', 'newpass123')).toBe(
        'Current password is required.'
      );
    });

    it('returns error when new passwords do not match', () => {
      expect(validatePasswordChange('current123', 'newpass123', 'different')).toBe(
        'New passwords do not match.'
      );
    });

    it('returns error when new password is too short', () => {
      expect(validatePasswordChange('current123', 'abc', 'abc')).toBe(
        'New password must be at least 6 characters.'
      );
    });

    it('accepts new password at minimum length', () => {
      expect(validatePasswordChange('current123', 'abc123', 'abc123')).toBeNull();
    });

    it('prioritises current-password check over match check', () => {
      expect(validatePasswordChange('', 'abc123', 'different')).toBe(
        'Current password is required.'
      );
    });
  });

  describe('mapPasswordChangeError', () => {
    it('maps wrong-password error to friendly message', () => {
      expect(mapPasswordChangeError(new Error('auth/wrong-password'))).toBe(
        'Current password is incorrect.'
      );
    });

    it('maps invalid-credential error to friendly message', () => {
      expect(mapPasswordChangeError(new Error('auth/invalid-credential'))).toBe(
        'Current password is incorrect.'
      );
    });

    it('passes through unknown error messages unchanged', () => {
      expect(mapPasswordChangeError(new Error('Network error'))).toBe('Network error');
    });

    it('returns fallback string for non-Error values', () => {
      expect(mapPasswordChangeError('something went wrong')).toBe('Failed to change password.');
    });

    it('returns fallback string for null', () => {
      expect(mapPasswordChangeError(null)).toBe('Failed to change password.');
    });
  });
});
