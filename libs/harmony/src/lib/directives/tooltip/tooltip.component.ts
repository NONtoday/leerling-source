import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    OnDestroy,
    OnInit,
    output,
    TemplateRef,
    viewChild,
    ViewContainerRef
} from '@angular/core';

export const harmonyTooltipSelector = 'hmy-tooltip';
@Component({
    selector: harmonyTooltipSelector,
    standalone: true,
    templateUrl: './tooltip.component.html',
    styleUrl: './tooltip.component.scss',
    host: {
        class: harmonyTooltipSelector,
        '[attr.align-center]': 'alignCenter() ? true : undefined',
        '[attr.visible]': 'visible() ? true : undefined',
        '[style.--horizontal-padding]': 'styleHorizontalPadding()',
        '[style.--vertical-padding]': 'styleVerticalPadding()',
        '[style.top]': 'styleTop()',
        '[style.left]': 'styleLeft()',
        '[style.max-width]': 'styleMaxWidth()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TooltipComponent implements OnInit, AfterViewInit, OnDestroy {
    private container = viewChild('container', { read: ViewContainerRef });
    private resizeObserver: ResizeObserver;
    private viewContainerRef = inject(ViewContainerRef);

    protected hasTemplate = computed(() => typeof this.content() !== 'string');
    protected styleHorizontalPadding = computed(() => `${this.horizontalPadding()}px`);
    protected styleVerticalPadding = computed(() => `${this.verticalPadding()}px`);
    protected styleTop = computed(() => `${this.top()}px`);
    protected styleLeft = computed(() => `${this.left()}px`);
    protected styleMaxWidth = computed(() => `${this.maxWidth()}px`);

    /**
     * A switch for using 'legacy rendering', where the innerHTML is set by the directive.
     *
     * When true, no content will be rendered in the component because it is not necessary - the directive handles the content instead.
     *
     * @deprecated Legacy rendering only exists for compatibility and should not be used in new tooltips.
     */
    public useLegacyRendering = input.required<boolean>();
    public content = input.required<TemplateRef<any> | string>();
    public alignCenter = input.required<boolean>();
    public visible = input.required<boolean>();
    public horizontalPadding = input.required<number>();
    public verticalPadding = input.required<number>();
    public top = input.required<number>();
    public left = input.required<number>();
    public maxWidth = input.required<number>();

    public onResize = output<void>();

    constructor() {
        effect(() => {
            if (this.hasTemplate()) {
                this.container()?.clear();
                this.container()?.createEmbeddedView(this.content() as TemplateRef<any>);
            }
        });
    }

    public ngOnInit(): void {
        this.resizeObserver = new ResizeObserver(() => this.onResize.emit());
        this.resizeObserver.observe(this.viewContainerRef.element.nativeElement);
    }

    public ngAfterViewInit(): void {
        if (this.hasTemplate()) {
            this.container()?.createEmbeddedView(this.content() as TemplateRef<any>);
        }
    }

    public ngOnDestroy(): void {
        this.resizeObserver.disconnect();
    }
}
