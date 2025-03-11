import { format } from 'date-fns';

export type DebugSource = 'authenticatie' | 'rooster' | 'huiswerk' | 'pushnotifications';

let loggingEnabled = false;

function _format(msg: string, source?: DebugSource): string {
    const formattedDate = format(new Date(), 'H:mm:ss.SSS');
    return `${formattedDate}: ${source ? '(' + source + ') ' : ''}${msg}`;
}

export function info(msg: string, source?: DebugSource): void {
    if (!loggingEnabled) return;

    console.log(_format(msg, source));
}

export function warn(msg: string, source?: DebugSource): void {
    if (!loggingEnabled) return;

    console.warn(_format(msg, source));
}

export function error(msg: string, source?: DebugSource): void {
    if (!loggingEnabled) return;

    console.error(_format(msg, source));
}

export function getIsLoggingEnabled(): boolean {
    return loggingEnabled;
}

export function setLoggingEnabled(isEnabled: boolean) {
    loggingEnabled = isEnabled;
}
