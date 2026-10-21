import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { SceneManager } from '../../three/SceneManager';
import { fontsReady } from '../../utils/fonts';

/** Hosts the Three.js scene. React owns the element; SceneManager owns everything inside it. */
export function CasinoCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let manager: SceneManager | null = null;
    let cancelled = false;
    void fontsReady().then(() => {
      if (cancelled || !hostRef.current) return;
      try {
        manager = new SceneManager(hostRef.current, useGameStore);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to start the 3D scene', error);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
      manager?.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className={`casino-canvas is-${status}`}>
      {status === 'error' && <p className="casino-canvas__error">WebGL is required to display the table.</p>}
    </div>
  );
}
