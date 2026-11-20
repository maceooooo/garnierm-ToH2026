import { of, Subject } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { revealInitialList } from './progressive-list';

describe('revealInitialList', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reveal the first snapshot every 200 ms and apply later snapshots immediately', () => {
    vi.useFakeTimers();
    const snapshots = new Subject<string[]>();
    const received: string[][] = [];
    const onInitialListRevealed = vi.fn();

    revealInitialList(snapshots, 200, onInitialListRevealed).subscribe((items) => {
      received.push(items);
    });

    snapshots.next(['one', 'two']);
    vi.advanceTimersByTime(0);
    expect(received).toEqual([['one']]);
    expect(onInitialListRevealed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(received).toEqual([['one']]);

    vi.advanceTimersByTime(1);
    expect(received).toEqual([['one'], ['one', 'two']]);
    expect(onInitialListRevealed).toHaveBeenCalledOnce();

    snapshots.next(['three', 'four']);
    expect(received).toEqual([['one'], ['one', 'two'], ['three', 'four']]);
    expect(onInitialListRevealed).toHaveBeenCalledOnce();
  });

  it('should emit an empty initial snapshot and complete its callback', () => {
    const onInitialListRevealed = vi.fn();
    const received: string[][] = [];

    revealInitialList(of([]), 200, onInitialListRevealed).subscribe((items) => {
      received.push(items);
    });

    expect(received).toEqual([[]]);
    expect(onInitialListRevealed).toHaveBeenCalledOnce();
  });
});
