import { describe, expect, it } from 'vitest';
import { analyze } from './analysis';

const tone = (hz: number, rate = 16000, seconds = 1, offset = 0) =>
  Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) =>
    offset + .12 * Math.sin(2 * Math.PI * hz * i / rate));
const medianPitch = (samples: Float32Array, rate = 16000) => {
  const values = analyze(samples, rate).pitch.filter((v): v is number => v !== null).sort((a, b) => a - b);
  expect(values.length).toBeGreaterThan(15);
  return values[Math.floor(values.length / 2)];
};

describe('pitch measurement, not pronunciation grading', () => {
  it.each([80, 123.4, 200, 261.6, 350, 480])('does not choose an octave below %s Hz', hz => {
    expect(Math.abs(medianPitch(tone(hz)) / hz - 1)).toBeLessThan(.015);
  });
  it.each([8000, 16000, 44100, 48000])('works at %s Hz sample rate', rate => {
    expect(Math.abs(medianPitch(tone(187.3, rate), rate) / 187.3 - 1)).toBeLessThan(.015);
  });
  it('ignores a DC offset', () => {
    expect(Math.abs(medianPitch(tone(187.3, 16000, 1, .3)) / 187.3 - 1)).toBeLessThan(.015);
    expect(analyze(new Float32Array(16000).fill(.3), 16000).pitch.every(v => v === null)).toBe(true);
    expect(analyze(new Float32Array(16000).fill(.3), 16000).status).toBe('silent');
  });
  it('does not invent a pitch for deterministic broadband noise', () => {
    let state = 731;
    const noise = Float32Array.from({length:16000}, () => {
      state = (Math.imul(state,1664525) + 1013904223) >>> 0;
      return (state / 4294967296 - .5) * .2;
    });
    expect(analyze(noise, 16000).pitch.filter(v => v !== null)).toHaveLength(0);
  });
  it('tracks the fundamental under stronger second and third harmonics', () => {
    const samples = Float32Array.from({length:16000}, (_, i) => {
      const phase = 2 * Math.PI * 173 * i / 16000;
      return .035 * Math.sin(phase) + .10 * Math.sin(2*phase) + .08 * Math.sin(3*phase);
    });
    expect(Math.abs(medianPitch(samples) / 173 - 1)).toBeLessThan(.02);
  });
  it('preserves a rising contour instead of flattening it with a global pitch', () => {
    const samples = Float32Array.from({length:16000}, (_, i) => {
      const t = i / 16000;
      return .15 * Math.sin(2 * Math.PI * (110*t + 60*t*t));
    });
    const contour = analyze(samples,16000).pitch;
    expect(contour.filter(v => v !== null).length).toBeGreaterThan(20);
    expect(contour[2]!).toBeGreaterThan(110);
    expect(contour[22]!).toBeGreaterThan(contour[2]! + 80);
  });
  it('leaves an incomplete final frame unmeasured', () => {
    expect(analyze(tone(200,16000,.005),16000).pitch).toEqual([null]);
  });
});
