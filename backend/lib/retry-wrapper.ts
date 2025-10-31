/**
 * Retry wrapper with exponential backoff for handling transient failures
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @param initialDelay - Initial delay in milliseconds (default: 1000ms)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000ms)
 * @returns The result of the function call
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    operation?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    operation = 'Operation'
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      // Log success if this was a retry
      if (attempt > 0) {
        console.log(`${operation} succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is ServiceUnavailable from Convex
      const isServiceUnavailable =
        error?.message?.includes('ServiceUnavailable') ||
        error?.message?.includes('Service temporarily unavailable') ||
        error?.code === 'ServiceUnavailable';

      // Don't retry if it's not a service unavailable error
      if (!isServiceUnavailable) {
        console.error(`${operation} failed with non-retryable error:`, error?.message || error);
        throw error;
      }

      // If we've exhausted retries, throw
      if (attempt === maxRetries) {
        console.error(`${operation} failed after ${maxRetries} retries. Last error:`, error?.message || error);
        throw new Error(`${operation} failed after ${maxRetries} retries: ${error?.message || error}`);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      console.warn(
        `${operation} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error?.message || error}. ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw above, but TypeScript needs it
  throw lastError || new Error(`${operation} failed after retries`);
}

/**
 * Helper to determine if an error should be retried
 */
export function isRetryableError(error: any): boolean {
  return (
    error?.message?.includes('ServiceUnavailable') ||
    error?.message?.includes('Service temporarily unavailable') ||
    error?.message?.includes('ECONNREFUSED') ||
    error?.message?.includes('ETIMEDOUT') ||
    error?.message?.includes('ENOTFOUND') ||
    error?.code === 'ServiceUnavailable' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ENOTFOUND'
  );
}
