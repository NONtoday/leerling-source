import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges, output } from '@angular/core';
import { TabComponent, TabMode } from '../tab.component';
import { TabInput } from '../tab.model';

@Component({
    selector: 'hmy-tab-row',
    standalone: true,
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

    ngOnInit(): void {
        this.activeTabLabel ||= this.tabs[0]?.label;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['activeTabLabel']?.currentValue && changes['activeTabLabel'].currentValue !== changes['activeTabLabel'].previousValue) {
            this.setActiveTab(changes['activeTabLabel'].currentValue);
        }
    }

    setActiveTab(tabLabel: string) {
        this.activeTabLabel = tabLabel;
        this.activeTabChange.emit(tabLabel);
    }

    trackByLabel(index: number, tab: TabInput) {
        return tab.label;
    }
}
