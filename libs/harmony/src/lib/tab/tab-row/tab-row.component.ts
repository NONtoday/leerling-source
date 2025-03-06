import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, input, OnChanges, OnInit, output, SimpleChanges } from '@angular/core';
import { isBoolean, isEqual } from 'lodash-es';
import { isObservable, Observable, take } from 'rxjs';
import { isPresent } from '../../operators/is-present.operator';
import { TabComponent, TabMode } from '../tab.component';
import { TabInput } from '../tab.model';

@Component({
    selector: 'hmy-tab-row',
    imports: [CommonModule, TabComponent],
    templateUrl: './tab-row.component.html',
    styleUrls: ['./tab-row.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabRowComponent implements OnChanges, OnInit {
    @Input({ required: true }) tabs: ReadonlyArray<TabInput>;
    @Input() activeTabLabel: string | undefined = undefined;
    @Input() tabMode: TabMode = 'default';
    activeTabChange = output<string>();

    canDeactivate = input<boolean | Observable<boolean>>();

    ngOnInit(): void {
        this.activeTabLabel ||= this.tabs[0]?.label;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['activeTabLabel']?.currentValue && changes['activeTabLabel'].currentValue !== changes['activeTabLabel'].previousValue) {
            this.setActiveTab(changes['activeTabLabel'].currentValue);
        }
    }

    setActiveTab(tabLabel: string) {
        if (isEqual(tabLabel, this.activeTabLabel)) return;

        const updateTab = () => {
            this.activeTabLabel = tabLabel;
            this.activeTabChange.emit(tabLabel);
        };

        const canDeactivate = this.canDeactivate();
        if (!isPresent(canDeactivate)) {
            updateTab();
        } else if (isBoolean(canDeactivate) && canDeactivate) {
            updateTab();
        } else if (isObservable(canDeactivate)) {
            canDeactivate.pipe(take(1)).subscribe((result) => {
                if (result) {
                    updateTab();
                }
            });
        }
    }

    trackByLabel(index: number, tab: TabInput) {
        return tab.label;
    }
}
