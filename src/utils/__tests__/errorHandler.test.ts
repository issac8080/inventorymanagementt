import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  ErrorCode,
  handleError,
  retryWithBackoff,
  safeAsync,
} from '../errorHandler';

describe('ErrorHandler - Unit Tests', () => {
  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.UNKNOWN_ERROR,
        'User message',
        true,
        { key: 'value' }
      );
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.userMessage).toBe('User message');
      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('handleError', () => {
    it('should return AppError if already an AppError', () => {
      const appError = new AppError('Test', ErrorCode.UNKNOWN_ERROR, 'Test');
      const result = handleError(appError);
      
      expect(result).toBe(appError);
    });

    it('should handle QuotaExceededError', () => {
      const error = new Error('QuotaExceededError');
      const result = handleError(error, 'Test context');
      
      expect(result.code).toBe(ErrorCode.DB_CONNECTION_FAILED);
      expect(result.userMessage).toContain('Storage limit');
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed');
      const result = handleError(error);
      
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.userMessage).toContain('Network error');
      expect(result.recoverable).toBe(true);
    });

    it('should handle permission errors', () => {
      const error = new Error('Permission denied');
      const result = handleError(error);
      
      expect(result.code).toBe(ErrorCode.CAMERA_PERMISSION_DENIED);
      expect(result.userMessage).toContain('Permission');
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic error');
      const result = handleError(error, 'Test context');
      
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.userMessage).toBeDefined();
      expect(result.context?.context).toBe('Test context');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const result = handleError(error);
      
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('String error');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      vi.useFakeTimers();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const promise = retryWithBackoff(fn, 3, 10); // Reduced delay from 100ms to 10ms
      
      // Fast-forward time
      await vi.advanceTimersByTimeAsync(10);
      await vi.advanceTimersByTimeAsync(20);
      
      const result = await promise;
      
      expect(result).toBe('success');
      vi.useRealTimers();
    });
  });

  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await safeAsync(fn, 'Test context');
      
      expect(result).toBe('success');
    });

    it('should return null on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      const result = await safeAsync(fn);
      
      expect(result).toBeNull();
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      
      await safeAsync(fn, 'Test', onError);
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(AppError);
    });
  });
});

