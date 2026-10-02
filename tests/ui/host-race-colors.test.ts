import { describe, expect, it } from 'vitest';
import { colorForRunner } from '../../src/features/lobby/host-race-colors';

describe('room runner colors', () => {
  it('assigns distinct colors to all 42 class participants, including identical ID hash buckets', () => {
    const colors = Array.from({ length: 42 }, (_, index) => colorForRunner('room-a', index + 1));
    expect(new Set(colors).size).toBe(42);
  });
  it('keeps colors fixed through rank changes, removed participants and reloads', () => {
    const original = [1, 2, 3, 4].map(order => colorForRunner('room-a', order));
    expect([4, 2].map(order => colorForRunner('room-a', order))).toEqual([original[3], original[1]]);
    expect(colorForRunner('room-a', 5)).not.toBe(original[1]);
    expect([1, 2, 3, 4].map(order => colorForRunner('room-a', order))).toEqual(original);
  });
  it('shuffles the palette independently for each random room ID', () => {
    const colors = (room: string) => Array.from({ length: 42 }, (_, index) => colorForRunner(room, index + 1));
    expect(colors('room-a')).not.toEqual(colors('room-b'));
    expect([...colors('room-a')].sort()).toEqual([...colors('room-b')].sort());
  });
  it('does not recycle occupied colors when removals allow more than 42 lifetime joins', () => {
    const colors = Array.from({ length: 10000 }, (_, index) => colorForRunner('room-a', index + 1));
    expect(new Set(colors).size).toBe(10000);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
