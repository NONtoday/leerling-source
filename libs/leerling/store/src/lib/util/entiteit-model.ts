import { Link, Linkable } from 'leerling-codegen';
import { toLocalDateTime } from './date-util';

export interface SEntiteit {
    id: number;
}

export const DEFAULT_STRING = 'Onbekend';
export const DEFAULT_BOOLEAN = false;
export const DEFAULT_NUMBER = 0;

export function getEntiteitId(linkable: Linkable): number {
    return (
        (linkable.links?.find((x) => x.rel === 'self')?.id as number) ?? (linkable.links?.find((x) => x.rel === 'koppeling')?.id as number)
    );
}

export function createLinks(id: number, type: string, rel = 'self'): Link[] {
    return [
        {
            id,
            rel,
            type
        }
    ];
}

export function getType(linkable: Linkable): string | undefined {
    return linkable.links?.find((x) => x.rel === 'self')?.type ?? linkable.links?.find((x) => x.rel === 'koppeling')?.type;
}

export function parseOptionalDate(dateString?: string): Date | undefined {
    if (dateString) return toLocalDateTime(dateString);
    else return undefined;
}

export function getAdditionalString(linkable: Linkable, key: string): string | undefined {
    if (!linkable.additionalObjects) {
        return undefined;
    }

    return linkable.additionalObjects[key];
}

export function getAdditionalNumber(linkable: Linkable, key: string): number | undefined {
    if (!linkable.additionalObjects) {
        return undefined;
    }

    return linkable.additionalObjects[key] as number;
}
