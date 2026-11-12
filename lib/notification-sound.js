let audioContext;
let resumePromise;
let resumeWarningShown = false;
let audioUnlocked = false;

export function prepareNotificationSound() {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  try {
    audioContext ||= new AudioContext();
    if (!audioUnlocked) {
      const source = audioContext.createBufferSource();
      const silentBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      source.buffer = silentBuffer;
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.start();
      audioUnlocked = true;
    }
    resumeAudioContext();
  } catch (error) {
    console.warn('Could not prepare notification sound', error);
  }
}

function playTone() {
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.setValueAtTime(988, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } catch (error) {
    console.warn('Could not play notification sound', error);
  }
}

function resumeAudioContext() {
  if (!audioContext || audioContext.state === 'running') return Promise.resolve();
  if (audioContext.state !== 'suspended') return Promise.resolve();
  if (!resumePromise) {
    resumePromise = audioContext.resume()
      .catch((error) => {
        if (!resumeWarningShown) {
          console.warn('Could not resume notification sound', error);
          resumeWarningShown = true;
        }
      })
      .finally(() => { resumePromise = null; });
  }
  return resumePromise;
}

export function playNotificationSound() {
  if (!audioContext || audioContext.state === 'closed') return;
  if (audioContext.state === 'running') {
    playTone();
    return;
  }
  resumeAudioContext().then(() => {
    if (audioContext?.state === 'running') playTone();
  });
}

export function startNotificationSound() {
  if (typeof window === 'undefined') return () => {};
  prepareNotificationSound();
  playNotificationSound();
  const interval = window.setInterval(playNotificationSound, 1200);
  return () => window.clearInterval(interval);
}
