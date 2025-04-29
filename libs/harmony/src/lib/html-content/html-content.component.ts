import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'hmy-html-content',
    imports: [CommonModule],
    template: `<div class="content" [innerHTML]="innerHtml()"></div>`,
    styleUrl: './html.content.component.scss'
})
export class HtmlContentComponent {
    public content = input.required<string>();

    // bewaar de witregels
    public innerHtml = computed(() => this.content().replace(/<p><\/p>/g, '<p>&nbsp;</p>'));
}
