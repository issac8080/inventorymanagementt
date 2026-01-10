// Sound utility for beep notifications

/**
 * Plays a beep sound for user feedback
 * @param type - Type of beep: 'scan' for scanning, 'success' for success, 'error' for errors
 */
export function playBeep(type: 'scan' | 'success' | 'error' = 'success') {
  try {
    // Check if AudioContext is available
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return; // Silently fail if audio is not supported
    }

    const audioContext = new AudioContextClass();
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // Silently fail if resume fails
        return;
      });
    }
    
    let frequency: number;
    let duration: number;
    
    switch (type) {
      case 'scan':
        frequency = 800; // Higher pitch for scan
        duration = 100;
        break;
      case 'success':
        frequency = 600; // Medium pitch for success
        duration = 200;
        break;
      case 'error':
        frequency = 300; // Lower pitch for error
        duration = 300;
        break;
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    // Clean up after sound finishes
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch (error) {
    // Silently fail if audio playback fails
    console.debug('Audio playback failed:', error);
  }
}

