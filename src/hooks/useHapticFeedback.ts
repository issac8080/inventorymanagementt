/**
 * Haptic feedback hook for mobile devices
 * Provides tactile feedback for user actions
 */

export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Silently fail if vibration is not supported
        console.debug('Vibration not supported:', error);
      }
    }
  };

  const light = () => vibrate(10);
  const medium = () => vibrate(50);
  const heavy = () => vibrate(100);
  const success = () => vibrate([50, 30, 50]);
  const error = () => vibrate([100, 50, 100]);

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
  };
}

