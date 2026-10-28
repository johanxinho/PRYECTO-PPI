// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { authService, sanitizeSignupRole } from '../services/authService';

describe('authService', () => {
  describe('sanitizeSignupRole', () => {
    it('rejects staff roles submitted by a public signup client', () => {
      expect(sanitizeSignupRole('profesor')).toBe('estudiante');
      expect(sanitizeSignupRole('administrador')).toBe('estudiante');
    });

    it('keeps the self-service roles supported by the signup form', () => {
      expect(sanitizeSignupRole('madre')).toBe('madre');
      expect(sanitizeSignupRole('estudiante')).toBe('estudiante');
    });
  });

  describe('translateAuthError', () => {
    it('should translate already registered error', () => {
      const error = { message: 'User already registered', code: 'user_already_exists' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('ya está registrado');
    });

    it('should translate invalid credentials error', () => {
      const error = { message: 'Invalid login credentials', code: 'invalid_credentials' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('incorrectos');
    });

    it('should translate email not confirmed error', () => {
      const error = { message: 'Email not confirmed', code: 'email_not_confirmed' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('confirmar tu correo');
    });

    it('should translate rate limit error', () => {
      const error = { message: 'Rate limit exceeded', code: 'rate_limit' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('Demasiados intentos');
    });

    it('should translate network error', () => {
      const error = { message: 'Network error', code: 'network' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('No fue posible conectar');
    });

    it('should return generic error for unknown error', () => {
      const error = { message: 'Some unknown error' };
      const result = authService.translateAuthError(error);
      expect(result).toContain('No fue posible completar');
    });

    it('should handle error with Spanish message', () => {
      const error = { message: 'El usuario ya existe' };
      const result = authService.translateAuthError(error);
      expect(result).toBe('El usuario ya existe');
    });

    it('should handle empty error', () => {
      const error = {};
      const result = authService.translateAuthError(error);
      expect(result).toContain('Ocurrió un error');
    });
  });
});
