import { Pipe, PipeTransform } from '@angular/core';
import { BorderToken } from '../tokens/border-token';
import { ColorToken } from '../tokens/color-token';

type CssVarToken = ColorToken | BorderToken;
export type CssColorVar<T extends CssVarToken> = `var(--${T})`;
export const toCssVar = <T extends CssVarToken>(token: T): CssColorVar<T> => `var(--${token})`;

@Pipe({
    name: 'cssVar',
    standalone: true
})
export class CssVarPipe implements PipeTransform {
    transform(token: CssVarToken): string {
        return toCssVar(token);
    }
}
