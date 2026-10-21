/** Every sound Cosmic Spin can make, by category (each category is independently mixable). */
export type SoundCue =
  | 'click'
  | 'toggle'
  | 'spinStart'
  | 'reelStop'
  | 'scatterLand'
  | 'bonusLand'
  | 'symbolMatch'
  | 'winSmall'
  | 'winBig'
  | 'winMega'
  | 'jackpot'
  | 'coinTick'
  | 'freeSpinsIntro'
  | 'bonusIntro'
  | 'capsuleOpen'
  | 'bonusReward'
  | 'error';

/** Upper bound on simultaneous voices per cue — keeps fast play from turning into noise. */
export const CUE_POLYPHONY: Readonly<Partial<Record<SoundCue, number>>> = {
  reelStop: 5,
  coinTick: 2,
  click: 2,
  symbolMatch: 2,
};
