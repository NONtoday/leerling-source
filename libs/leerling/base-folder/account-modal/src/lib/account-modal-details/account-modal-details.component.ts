import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, ViewChild, inject, output } from '@angular/core';
import { AccountModalHeaderComponent, HeaderAction } from '../account-modal-header/account-modal-header.component';

@Component({
    selector: 'sl-account-modal-details',
    imports: [CommonModule, AccountModalHeaderComponent],
    templateUrl: './account-modal-details.component.html',
    styleUrls: ['./account-modal-details.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountModalDetailsComponent {
    private _elementRef = inject(ElementRef);
    private _changeDetector = inject(ChangeDetectorRef);

    @ViewChild('content', { read: ElementRef, static: true }) contentRef: ElementRef;
    @ViewChild(AccountModalHeaderComponent, { static: false }) accountModalHeader: AccountModalHeaderComponent;

    @Input() titel: string | undefined;

    headerActionClicked = output<HeaderAction>();

    public get elementRef(): ElementRef {
        return this._elementRef;
    }

    public setTitle(newtitle: string) {
        this.titel = newtitle;
        this._changeDetector.detectChanges();
    }
}
