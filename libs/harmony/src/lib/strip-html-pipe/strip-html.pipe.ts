import { Pipe, PipeTransform } from '@angular/core';
import { decode } from 'he';

@Pipe({
    name: 'stripHTML',
    standalone: true
})
export class StripHTMLPipe implements PipeTransform {
    transform(value: string | undefined | null) {
        return stripHtml(value);
    }
}

export function stripHtml(value: string | undefined | null): string {
    const stripped = value?.replace(/<[^>]*>?/gm, '') ?? '';
    // TODO: he package is 6 jaar oud. Mogelijk alternatief?
    return decode(stripped);
}
