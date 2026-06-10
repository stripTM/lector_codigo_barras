const BEEP_FREQUENCY_HZ = 1800;
const BEEP_DURATION_S = 0.15;
const BEEP_VOLUME = 0.1;

let audioContext: AudioContext | null = null;

/**
 * Pitido corto estilo caja de supermercado, generado con la Web Audio API.
 * Si el navegador bloquea el audio (falta de interacción previa) o no lo
 * soporta, falla en silencio.
 */
export function playBeep(): void {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = BEEP_FREQUENCY_HZ;
    gain.gain.setValueAtTime(BEEP_VOLUME, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + BEEP_DURATION_S);

    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + BEEP_DURATION_S);
  } catch {
    // Sin audio disponible: el beep es un extra, no debe romper la app.
  }
}
