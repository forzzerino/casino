import { useEffect, useRef } from 'react';
import { gameEvents, type GameEvents } from '../game/events';

/** Subscribes a component to a transient game event. */
export function useGameEvent<K extends keyof GameEvents>(event: K, handler: (payload: GameEvents[K]) => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => gameEvents.on(event, (payload) => handlerRef.current(payload)), [event]);
}
