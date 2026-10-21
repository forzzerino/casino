import { memo, useState } from 'react';
import { symbolBlurImage, symbolImage } from '../../assets/manifest';
import { SYMBOL_RARITY, type SymbolId } from '../../game/config/symbols';
import { useT } from '../../i18n';

interface SymbolArtProps {
  readonly symbol: SymbolId;
  readonly blurred?: boolean;
  readonly multiplier?: number;
  /** Decorative copies (spinning fillers) are hidden from assistive technology. */
  readonly decorative?: boolean;
}

/** A symbol's artwork, with a styled fallback if the image is missing. */
export const SymbolArt = memo(function SymbolArt({ symbol, blurred = false, multiplier, decorative = false }: SymbolArtProps) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const name = t(`symbol.${symbol}`);
  return (
    <span className={`cs-symbol is-${SYMBOL_RARITY[symbol]} is-${symbol}`} aria-hidden={decorative || undefined}>
      {failed ? (
        <span className="cs-symbol__fallback" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name}>
          {name}
        </span>
      ) : (
        <img
          className="cs-symbol__image"
          src={blurred ? symbolBlurImage(symbol) : symbolImage(symbol)}
          alt={decorative ? '' : name}
          draggable={false}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {multiplier !== undefined && !blurred && <span className="cs-symbol__multiplier">×{multiplier}</span>}
    </span>
  );
});
