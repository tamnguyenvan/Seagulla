import { describe, expect, it, vi } from 'vitest';
import { ReorderGate } from './staging';

describe('ReorderGate', () => {
  it('applies after the idle window when the pointer never moves', async () => {
    const gate = new ReorderGate(50);
    const applied = vi.fn();
    gate.request(applied);
    expect(applied).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 90));
    expect(applied).toHaveBeenCalledOnce();
  });

  it('defers while the pointer keeps moving', async () => {
    const gate = new ReorderGate(60);
    const applied = vi.fn();

    // The realistic sequence: the user is already moving toward the results when the
    // ranked batch arrives.
    gate.pointerMoved();
    gate.request(applied);

    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 30));
      gate.pointerMoved();
    }
    expect(applied).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 110));
    expect(applied).toHaveBeenCalledOnce();
  });

  it('applies promptly when the pointer is already at rest', async () => {
    const gate = new ReorderGate(400);
    const applied = vi.fn();
    gate.request(applied);
    await new Promise((r) => setTimeout(r, 20));
    expect(applied).toHaveBeenCalledOnce();
  });

  it('applies immediately on flush', () => {
    const gate = new ReorderGate(1000);
    const applied = vi.fn();
    gate.request(applied);
    gate.flush();
    expect(applied).toHaveBeenCalledOnce();
  });

  it('keeps only the most recent request', async () => {
    const gate = new ReorderGate(30);
    const first = vi.fn();
    const second = vi.fn();
    gate.request(first);
    gate.request(second);
    await new Promise((r) => setTimeout(r, 70));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('reports whether work is pending', async () => {
    const gate = new ReorderGate(30);
    expect(gate.hasPending).toBe(false);
    gate.request(() => {});
    expect(gate.hasPending).toBe(true);
    await new Promise((r) => setTimeout(r, 70));
    expect(gate.hasPending).toBe(false);
  });

  it('cancels pending work on dispose', async () => {
    const gate = new ReorderGate(30);
    const applied = vi.fn();
    gate.request(applied);
    gate.dispose();
    await new Promise((r) => setTimeout(r, 70));
    expect(applied).not.toHaveBeenCalled();
  });

  it('ignores pointer movement when nothing is pending', () => {
    const gate = new ReorderGate(30);
    expect(() => gate.pointerMoved()).not.toThrow();
    expect(gate.hasPending).toBe(false);
  });
});
