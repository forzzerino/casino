/**
 * Game time: real time minus every paused interval. Round phases, the wheel,
 * the ball, chip animations and spin sounds all read this clock, so pausing
 * freezes the whole table consistently and resuming continues exactly where it
 * stopped — the predetermined spin plays out unchanged.
 */
export class GameClock {
  private pausedAt: number | null = null;
  private pausedTotal = 0;

  constructor(private readonly source: () => number = () => performance.now()) {}

  /** Milliseconds, comparable with timestamps stored in game state. */
  now(): number {
    return (this.pausedAt ?? this.source()) - this.pausedTotal;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  pause(): void {
    if (this.pausedAt === null) this.pausedAt = this.source();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.pausedTotal += this.source() - this.pausedAt;
    this.pausedAt = null;
  }
}

export const gameClock = new GameClock();
