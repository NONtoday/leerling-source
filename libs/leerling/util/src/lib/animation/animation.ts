export function disableAnimations(): boolean {
    return (
        window &&
        ('Cypress' in window ||
            (window?.parent && 'Cypress' in window.parent) ||
            // let op: dit wordt bepaald door het OS van je device, dus als je onverwachts geen animaties ziet moet je dat even checken
            window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
}
