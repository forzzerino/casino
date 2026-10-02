import { useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { connectSoundBridge } from '../audio/soundBridge';
import { useGameStore } from '../state/gameStore';

export function useSoundBridge(): void {
  useEffect(() => connectSoundBridge(audioEngine, useGameStore), []);
}
