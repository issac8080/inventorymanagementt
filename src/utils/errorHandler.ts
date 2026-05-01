/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public recoverable: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export enum ErrorCode {
  // Database errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  
  // Product errors
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_ALREADY_EXISTS = 'PRODUCT_ALREADY_EXISTS',
  INVALID_PRODUCT_DATA = 'INVALID_PRODUCT_DATA',
  
  // Barcode/QR errors
  BARCODE_SCAN_FAILED = 'BARCODE_SCAN_FAILED',
  BARCODE_LOOKUP_FAILED = 'BARCODE_LOOKUP_FAILED',
  QR_SCAN_FAILED = 'QR_SCAN_FAILED',
  
  // Warranty errors
  WARRANTY_UPLOAD_FAILED = 'WARRANTY_UPLOAD_FAILED',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  INVALID_WARRANTY_DATE = 'INVALID_WARRANTY_DATE',
  
  // File errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_READ_FAILED = 'FILE_READ_FAILED',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // Permission errors
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/** Readable message from Error, PostgREST errors, or unknown values */
export function extractErrorMessage(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    const m = (error as { message: unknown }).message;
    return typeof m === 'string' ? m : String(m);
  }
  return String(error);
}

/**
 * True when the browser could not complete the HTTP request (offline, DNS, TLS, CORS, blocked, wrong URL).
 * Firestore/HTTPS clients often surface this as "TypeError: Failed to fetch".
 */
export function isCloudNetworkError(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('econnrefused') ||
    msg.includes('err_connection') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('cors policy') ||
    msg.includes('blocked by cors') ||
    msg.includes('net::err') ||
    (msg.includes('typeerror') && msg.includes('fetch'))
  );
}

/** @deprecated Use isCloudNetworkError */
export const isSupabaseUnreachableError = isCloudNetworkError;

/** User-facing copy when cloud APIs fail to connect */
export const CLOUD_NETWORK_FAILED_HINT =
  'Could not reach the cloud service. Check your internet and VPN. Confirm Firebase config in .env (VITE_FIREBASE_*), ' +
  'restart the dev server after changes, and ensure ad blockers are not blocking Google/Firebase endpoints.';

/** @deprecated Use CLOUD_NETWORK_FAILED_HINT */
export const SUPABASE_CONNECTION_FAILED_HINT = CLOUD_NETWORK_FAILED_HINT;

export function handleError(error: unknown, context?: string): AppError {
  // Log error for debugging
  console.error(`[Error Handler] ${context || 'Unknown context'}:`, error);
  
  // If already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle specific error types
  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('QuotaExceededError') || error.message.includes('quota')) {
      return new AppError(
        error.message,
        ErrorCode.DB_CONNECTION_FAILED,
        'Storage limit reached. Please free up some space.',
        false,
        { originalError: error.message, context }
      );
    }
    
    // Network errors
    if (isCloudNetworkError(error)) {
      return new AppError(
        error.message,
        ErrorCode.NETWORK_ERROR,
        CLOUD_NETWORK_FAILED_HINT,
        true,
        { originalError: error.message, context }
      );
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AppError(
        error.message,
        ErrorCode.NETWORK_ERROR,
        'Network error. Please check your internet connection.',
        true,
        { originalError: error.message, context }
      );
    }
    
    // Permission errors
    if (error.message.includes('Permission') || error.message.includes('permission')) {
      return new AppError(
        error.message,
        ErrorCode.CAMERA_PERMISSION_DENIED,
        'Permission denied. Please allow camera access in your browser settings.',
        true,
        { originalError: error.message, context }
      );
    }
    
    // Generic error
    return new AppError(
      error.message,
      ErrorCode.UNKNOWN_ERROR,
      'An unexpected error occurred. Please try again.',
      true,
      { originalError: error.message, context }
    );
  }
  
  // Handle non-Error objects
  return new AppError(
    String(error),
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred. Please try again.',
    true,
    { originalError: error, context }
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context?: string
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, context);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw handleError(lastError, context || 'Retry failed');
}

/**
 * Safe async wrapper that catches and handles errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: string,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = handleError(error, context);
    if (onError) {
      onError(appError);
    }
    return null;
  }
}

