import { registerSchema } from './schemas/register.schema';
import { loginSchema } from './schemas/login.schema';
import { encrypt, decrypt } from '../../shared/utils/crypto.utils';

describe('Auth Module Pure Logic', () => {
  describe('Register Schema Validation', () => {
    it('should fail if email and username are missing', () => {
      const result = registerSchema.safeParse({
        password: 'Password123!',
        role: 'CANDIDATE',
      });
      expect(result.success).toBe(false);
    });

    it('should fail with weak password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        role: 'CANDIDATE',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((e) =>
            e.message.includes('Password must contain'),
          ),
        ).toBe(true);
      }
    });

    it('should succeed with strong password and email', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'StrongPassword123!',
        role: 'CANDIDATE',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Login Schema Validation', () => {
    it('should require identifier and password', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Crypto Utilities', () => {
    const testKey =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const originalText = 'Secret Message 123';

    it('should encrypt and decrypt correctly', () => {
      const encrypted = encrypt(originalText, testKey);
      expect(encrypted).not.toEqual(originalText);
      expect(encrypted.split(':').length).toBe(3);

      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toEqual(originalText);
    });

    it('should throw error with invalid key length', () => {
      expect(() => encrypt(originalText, 'short')).toThrow();
    });

    it('should throw error for tampered encrypted data', () => {
      const encrypted = encrypt(originalText, testKey);
      const tampered = encrypted.slice(0, -1) + 'X';
      // AES-GCM tag check should fail
      expect(() => decrypt(tampered, testKey)).toThrow();
    });
  });
});
