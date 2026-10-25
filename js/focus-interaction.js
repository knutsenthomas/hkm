import '../css/focus-interaction.css';

// Native focus-visible can remain active on editable controls after a mouse click.
// Track navigation method so pointer users avoid extra rings and keyboard users retain them.
if (!document.documentElement.dataset.hkmFocusInitialized) {
    document.documentElement.dataset.hkmFocusInitialized = 'true';
    document.documentElement.dataset.hkmFocus = 'keyboard';
    window.addEventListener('pointerdown', () => {
        document.documentElement.dataset.hkmFocus = 'pointer';
    }, { capture: true, passive: true });
    window.addEventListener('keydown', event => {
        if (['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            document.documentElement.dataset.hkmFocus = 'keyboard';
        }
    }, { capture: true });
}
