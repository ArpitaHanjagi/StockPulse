// Green/red pulse layered over a tile when its live value moves. Keyed by
// the flash counter so only this overlay remounts to restart the animation.
const FlashOverlay = ({ flash }: { flash: { cls: '' | 'flash-up' | 'flash-down'; n: number } }) =>
    flash.cls ? <span key={flash.n} aria-hidden className={`flash-overlay ${flash.cls === 'flash-up' ? 'up' : 'down'}`} /> : null;

export default FlashOverlay;
