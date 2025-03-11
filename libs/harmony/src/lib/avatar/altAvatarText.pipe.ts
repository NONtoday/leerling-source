import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'altAvatarText', standalone: true })
export class AltAvatarText implements PipeTransform {
    transform(naam?: string): string {
        return naam ? `Profielfoto van ${naam}` : 'Profielfoto';
    }
}
