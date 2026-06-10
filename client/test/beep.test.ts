import { afterEach, describe, expect, it, vi } from 'vitest';

function createAudioContextMock() {
  const oscillator = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(() => ({ connect: vi.fn() })),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  };
  return { context, oscillator };
}

describe('playBeep', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('plays a short tone through the Web Audio API', async () => {
    const { context, oscillator } = createAudioContextMock();
    vi.stubGlobal('AudioContext', vi.fn(() => context));

    const { playBeep } = await import('../src/shared/beep');
    playBeep();

    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
    expect(oscillator.frequency.value).toBeGreaterThan(0);
  });

  it('reuses the same AudioContext across beeps', async () => {
    const { context } = createAudioContextMock();
    const audioContextConstructor = vi.fn(() => context);
    vi.stubGlobal('AudioContext', audioContextConstructor);

    const { playBeep } = await import('../src/shared/beep');
    playBeep();
    playBeep();

    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
  });

  it('resumes the context when the browser suspended it', async () => {
    const { context } = createAudioContextMock();
    context.state = 'suspended';
    vi.stubGlobal('AudioContext', vi.fn(() => context));

    const { playBeep } = await import('../src/shared/beep');
    playBeep();

    expect(context.resume).toHaveBeenCalled();
  });

  it('does not throw when the Web Audio API is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined);

    const { playBeep } = await import('../src/shared/beep');

    expect(() => playBeep()).not.toThrow();
  });
});
