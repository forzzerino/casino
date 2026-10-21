import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { SLOT_CONFIG, type SlotConfig } from '../game/config/gameRules';
import { slotReducer, type SlotAction } from './gameReducer';
import type { SlotState } from './gameTypes';

export interface SlotStoreState extends SlotState {
  dispatch(action: SlotAction): void;
}

/** One store per mounted game; every change goes through the pure reducer. */
export function createSlotStore(initial: SlotState, config: SlotConfig = SLOT_CONFIG) {
  return createStore<SlotStoreState>()(
    subscribeWithSelector((set, get) => ({
      ...initial,
      dispatch(action) {
        const previous = get();
        const next = slotReducer(previous, action, config) as SlotStoreState;
        if (next === previous) {
          if (import.meta.env.DEV) console.debug(`[cosmic-spin] ignored "${action.type}" in phase "${previous.phase}"`);
          return;
        }
        set(next, true);
      },
    })),
  );
}

export type SlotStore = ReturnType<typeof createSlotStore>;

export const SlotStoreContext = createContext<SlotStore | null>(null);

export function useSlotStore(): SlotStore {
  const store = useContext(SlotStoreContext);
  if (!store) throw new Error('Cosmic Spin components must render inside <SlotStoreContext>');
  return store;
}

export function useSlot<T>(selector: (state: SlotState) => T): T {
  return useStore(useSlotStore(), selector);
}

export function useDispatch(): (action: SlotAction) => void {
  return useStore(useSlotStore(), (s) => s.dispatch);
}
