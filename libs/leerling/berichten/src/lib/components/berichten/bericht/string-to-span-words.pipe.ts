import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'stringToSpanWords',
    standalone: true
})
export class stringToSpanWordsPipe implements PipeTransform {
    transform(value: string): string {
        if (!value) {
            return value;
        }
        return value.replace(/\S+(?=\s|$)/g, (word, offset, string) => {
            return offset + word.length === string.length ? `<span>${word}</span>` : `<span>${word}&nbsp;</span>`;
        });
    }
}
