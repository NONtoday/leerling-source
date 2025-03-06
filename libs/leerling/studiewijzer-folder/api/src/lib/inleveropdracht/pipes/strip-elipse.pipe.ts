import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'stripAndElipsePipe',
    standalone: true
})
export class StripAndElipsePipe implements PipeTransform {
    transform(text: string): string | undefined {
        if (!text) return undefined;

        const hasMultipleParagraphs = (text.match(/<p>/g) || []).length > 1;

        if (hasMultipleParagraphs) {
            return text.replace(/<p><\/p>/g, '').match(/<p>(.*?)<\/p>/)?.[1] + '...';
        } else {
            return text;
        }
    }
}
