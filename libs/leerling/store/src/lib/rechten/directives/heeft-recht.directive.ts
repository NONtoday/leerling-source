import { ChangeDetectorRef, DestroyRef, Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPresent } from 'harmony';
import { isArray, isEmpty } from 'lodash-es';
import { combineLatest } from 'rxjs';
import { SRechten } from '../rechten-model';
import { RechtenService } from '../rechten.service';

export type Optional<T> = T | undefined | null;

export type AccountRecht = { [P in keyof SRechten]: SRechten[P] extends Optional<boolean> ? P : never }[keyof SRechten];
type Operation = 'AND' | 'OR';

@Directive({
    selector: '[slHeeftRecht]',
    standalone: true
})
export class HeeftRechtDirective implements OnInit {
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _templateRef = inject(TemplateRef);
    private _viewContainerRef = inject(ViewContainerRef);
    private _rechtenService = inject(RechtenService);
    private _destroyRef = inject(DestroyRef);

    private accountRechten: SRechten;
    private accountIsVerzorger: boolean;
    private requireRechten: AccountRecht | AccountRecht[] | undefined;
    private requireVerzorger = false;
    private operation: Operation = 'AND';
    private inverse = false;
    private isVisible = false;

    ngOnInit() {
        combineLatest({
            rechten: this._rechtenService.getCurrentAccountRechten(),
            isVerzorger: this._rechtenService.currentAccountIsVerzorger()
        })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(({ rechten, isVerzorger }) => {
                this.accountRechten = rechten;
                this.accountIsVerzorger = isVerzorger;
                this.updateView();
                this._changeDetectorRef.detectChanges();
            });
    }

    @Input() set slHeeftRecht(rechten: AccountRecht | AccountRecht[] | undefined) {
        this.requireRechten = rechten;
    }

    @Input() set slHeeftRechtOperation(operation: Operation) {
        this.operation = operation;
    }

    @Input() set slHeeftRechtInverse(inverse: boolean) {
        this.inverse = inverse;
    }

    @Input() set slHeeftRechtVerzorger(verzorger: boolean) {
        this.requireVerzorger = verzorger;
    }

    private updateView() {
        const rechtenNotUndefined = this.requireRechten || [];
        const rechten = isArray(rechtenNotUndefined) ? rechtenNotUndefined.filter(isPresent) : [rechtenNotUndefined];
        let heeftRecht: boolean;
        if (isEmpty(rechten) || Object.keys(this.accountRechten).length === 0) {
            heeftRecht = true;
        } else {
            heeftRecht =
                this.operation === 'AND'
                    ? rechten.every((recht) => this.accountRechten[recht])
                    : rechten.some((recht) => this.accountRechten[recht]);
        }
        heeftRecht = this.inverse ? !heeftRecht : heeftRecht;
        if (this.requireVerzorger && !this.accountIsVerzorger) {
            heeftRecht = false;
        }
        if (heeftRecht) {
            if (!this.isVisible) {
                this.isVisible = true;
                this._viewContainerRef.createEmbeddedView(this._templateRef);
            }
        } else {
            this.isVisible = false;
            this._viewContainerRef.clear();
        }
    }
}
