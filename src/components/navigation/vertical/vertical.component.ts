import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    booleanAttribute,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    Renderer2,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';


import { filter, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { UtilsService } from '../../../app/core/auth/services/utils/utils.service';
import { NavigationService } from '../navigation.service';
import { AppVerticalNavigationAsideItemComponent } from './components/aside/aside.component';
import { AppVerticalNavigationBasicItemComponent } from './components/basic/basic.component';
import { AppVerticalNavigationCollapsableItemComponent } from './components/collapsable/collapsable.component';
import { AppVerticalNavigationDividerItemComponent } from './components/divider/divider.component';
import { AppVerticalNavigationGroupItemComponent } from './components/group/group.component';
import { AppVerticalNavigationSpacerItemComponent } from './components/spacer/spacer.component';
import { NavigationItem, VerticalNavigationAppearance, VerticalNavigationMode, VerticalNavigationPosition } from '../navigation.types';

const FADE_DURATION = 300;
const FADE_EASING = 'cubic-bezier(0.25, 0.8, 0.25, 1)';

@Component({
    selector: 'app-vertical-navigation',
    templateUrl: './vertical.component.html',
    styleUrls: ['./vertical.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'appVerticalNavigation',
    imports: [
        AppVerticalNavigationAsideItemComponent,
        AppVerticalNavigationBasicItemComponent,
        AppVerticalNavigationCollapsableItemComponent,
        AppVerticalNavigationDividerItemComponent,
        AppVerticalNavigationGroupItemComponent,
        AppVerticalNavigationSpacerItemComponent,
    ],
})
export class AppVerticalNavigationComponent
    implements OnChanges, OnInit, AfterViewInit, OnDestroy
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _document = inject(DOCUMENT);
    private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private _renderer2 = inject(Renderer2);
    private _router = inject(Router);
    private _scrollStrategyOptions = inject(ScrollStrategyOptions);
    private _appNavigationService = inject(NavigationService);
    private _appUtilsService = inject(UtilsService);

    @Input() appearance: VerticalNavigationAppearance = 'default';
    @Input({ transform: booleanAttribute }) autoCollapse: boolean = true;
    @Input({ transform: booleanAttribute }) inner: boolean = false;
    @Input() mode: VerticalNavigationMode = 'side';
    @Input() name: string = this._appUtilsService.randomId();
    @Input() navigation: NavigationItem[] = [];
    @Input({ transform: booleanAttribute }) opened: boolean = true;
    @Input() position: VerticalNavigationPosition = 'left';
    @Input({ transform: booleanAttribute }) transparentOverlay: boolean = false;


    @Output() readonly appearanceChanged =
        new EventEmitter<VerticalNavigationAppearance>();
    @Output() readonly modeChanged =
        new EventEmitter<VerticalNavigationAppearance>();
    @Output() readonly openedChanged = new EventEmitter<boolean>();
    @Output() readonly positionChanged =
        new EventEmitter<VerticalNavigationPosition>();

    @ViewChild('navigationContent')
    private _navigationContentEl?: ElementRef<HTMLElement>;

    activeAsideItemId: string | null = null;

    onCollapsableItemCollapsed = new ReplaySubject<NavigationItem>(1);
    onCollapsableItemExpanded = new ReplaySubject<NavigationItem>(1);
    onRefreshed = new ReplaySubject<boolean>(1);

    private _animationsEnabled = false;
    private _asideOverlay: HTMLElement | null = null;
    private _overlay: HTMLElement | null = null;
    private _hovered = false;
    private _mutationObserver: MutationObserver | null = null;
    private _scrollStrategy: ScrollStrategy =
        this._scrollStrategyOptions.block();
    private _unsubscribeAll = new Subject<void>();

    private readonly _handleAsideOverlayClick = (): void => this.closeAside();
    private readonly _handleOverlayClick = (): void => this.close();

    // -------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------

    @HostBinding('class') get classList(): Record<string, boolean> {
        return {
            'app-vertical-navigation-animations-enabled':
                this._animationsEnabled,
            [`app-vertical-navigation-appearance-${this.appearance}`]: true,
            'app-vertical-navigation-hover': this._hovered,
            'app-vertical-navigation-inner': this.inner,
            'app-vertical-navigation-mode-over': this.mode === 'over',
            'app-vertical-navigation-mode-side': this.mode === 'side',
            'app-vertical-navigation-opened': this.opened,
            'app-vertical-navigation-position-left': this.position === 'left',
            'app-vertical-navigation-position-right':
                this.position === 'right',
        };
    }

    @HostBinding('style.visibility') get visibility(): string {
        return this.opened ? 'visible' : 'hidden';
    }

    // -------------------------------------------------------------------
    // Host listeners
    // -------------------------------------------------------------------

    @HostListener('mouseenter')
    onMouseenter(): void {
        this._enableAnimations();
        this._hovered = true;
    }

    @HostListener('mouseleave')
    onMouseleave(): void {
        this._enableAnimations();
        this._hovered = false;
    }

    // -------------------------------------------------------------------
    // Lifecycle hooks
    // -------------------------------------------------------------------

    ngOnChanges(changes: SimpleChanges): void {
        if ('appearance' in changes) {
            this.appearanceChanged.next(changes['appearance'].currentValue);
        }

        if ('mode' in changes) {
            const currentMode = changes['mode'].currentValue;
            const previousMode = changes['mode'].previousValue;

            this._disableAnimations();

            if (previousMode === 'over' && currentMode === 'side') {
                this._hideOverlay();
            }

            if (previousMode === 'side' && currentMode === 'over') {
                this.closeAside();
                if (this.opened) {
                    this._showOverlay();
                }
            }

            this.modeChanged.next(currentMode);

            // Must be longer than the CSS transition-duration
            setTimeout(() => this._enableAnimations(), 500);
        }

        if ('navigation' in changes) {
            this._changeDetectorRef.markForCheck();
        }

        if ('opened' in changes) {
            this._toggleOpened(this.opened);
        }

        if ('position' in changes) {
            this.positionChanged.next(changes['position'].currentValue);
        }
    }

    ngOnInit(): void {
        if (this.name === '') {
            this.name = this._appUtilsService.randomId();
        }

        this._appNavigationService.registerComponent(this.name, this);

        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => {
                if (this.mode === 'over' && this.opened) {
                    this.close();
                }
                if (this.mode === 'side' && this.activeAsideItemId) {
                    this.closeAside();
                }
            });
    }

    ngAfterViewInit(): void {
        // Firefox fix: 'position: sticky' breaks inside a 'position: fixed' parent
        // when '.cdk-global-scrollblock' is added to <html>.
        this._mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName !== 'class') {
                    continue;
                }
                const target = mutation.target as HTMLElement;
                if (target.classList.contains('cdk-global-scrollblock')) {
                    const top = parseInt(target.style.top, 10) || 0;
                    this._renderer2.setStyle(
                        this._elementRef.nativeElement,
                        'margin-top',
                        `${Math.abs(top)}px`
                    );
                } else {
                    this._renderer2.removeStyle(
                        this._elementRef.nativeElement,
                        'margin-top'
                    );
                }
            }
        });

        this._mutationObserver.observe(this._document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        // Scroll the active item into view (native, no scrollbar lib)
        setTimeout(() => {
            const activeItem =
                this._navigationContentEl?.nativeElement.querySelector(
                    '.app-vertical-navigation-item-active'
                );
            activeItem?.scrollIntoView({ block: 'center' });
        });
    }

    ngOnDestroy(): void {
        this._mutationObserver?.disconnect();

        this.close();
        this.closeAside();

        this._appNavigationService.deregisterComponent(this.name);

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    refresh(): void {
        this._changeDetectorRef.markForCheck();
        this.onRefreshed.next(true);
    }

    open(): void {
        if (this.opened) {
            return;
        }
        this._toggleOpened(true);
    }

    close(): void {
        if (!this.opened) {
            return;
        }
        this.closeAside();
        this._toggleOpened(false);
    }

    toggle(): void {
        this.opened ? this.close() : this.open();
    }

    openAside(item: NavigationItem): void {
        if (item.disabled || !item.id) {
            return;
        }
        this.activeAsideItemId = item.id;
        this._showAsideOverlay();
        this._changeDetectorRef.markForCheck();
    }

    closeAside(): void {
        this.activeAsideItemId = null;
        this._hideAsideOverlay();
        this._changeDetectorRef.markForCheck();
    }

    toggleAside(item: NavigationItem): void {
        this.activeAsideItemId === item.id
            ? this.closeAside()
            : this.openAside(item);
    }

    trackByFn(index: number, item: NavigationItem): string | number {
        return item.id || index;
    }

    // -------------------------------------------------------------------
    // Private methods
    // -------------------------------------------------------------------

    private _enableAnimations(): void {
        this._animationsEnabled = true;
    }

    private _disableAnimations(): void {
        this._animationsEnabled = false;
    }

    /** Native Web Animations API fade (replaces AnimationBuilder) */
    private _fade(el: HTMLElement, from: number, to: number): Animation {
        return el.animate([{ opacity: from }, { opacity: to }], {
            duration: FADE_DURATION,
            easing: FADE_EASING,
            fill: 'forwards',
        });
    }

    private _showOverlay(): void {
        if (this._overlay) {
            return;
        }

        const overlay: HTMLElement = this._renderer2.createElement('div');
        overlay.classList.add('app-vertical-navigation-overlay');

        if (this.transparentOverlay) {
            overlay.classList.add(
                'app-vertical-navigation-overlay-transparent'
            );
        }

        this._renderer2.appendChild(
            this._elementRef.nativeElement.parentElement,
            overlay
        );

        this._overlay = overlay;
        this._scrollStrategy.enable();
        this._fade(overlay, 0, 1);
        overlay.addEventListener('click', this._handleOverlayClick);
    }

    private _hideOverlay(): void {
        const overlay = this._overlay;
        if (!overlay) {
            return;
        }

        this._fade(overlay, 1, 0).onfinish = () => {
            overlay.removeEventListener('click', this._handleOverlayClick);
            overlay.remove();
            if (this._overlay === overlay) {
                this._overlay = null;
            }
            this._scrollStrategy.disable();
        };
    }

    private _showAsideOverlay(): void {
        if (this._asideOverlay) {
            return;
        }

        const overlay: HTMLElement = this._renderer2.createElement('div');
        overlay.classList.add('app-vertical-navigation-aside-overlay');

        this._renderer2.appendChild(
            this._elementRef.nativeElement.parentElement,
            overlay
        );

        this._asideOverlay = overlay;
        this._fade(overlay, 0, 1);
        overlay.addEventListener('click', this._handleAsideOverlayClick);
    }

    private _hideAsideOverlay(): void {
        const overlay = this._asideOverlay;
        if (!overlay) {
            return;
        }

        this._fade(overlay, 1, 0).onfinish = () => {
            overlay.removeEventListener('click', this._handleAsideOverlayClick);
            overlay.remove();
            if (this._asideOverlay === overlay) {
                this._asideOverlay = null;
            }
        };
    }

    private _toggleOpened(open: boolean): void {
        this.opened = open;
        this._enableAnimations();

        if (this.mode === 'over') {
            open ? this._showOverlay() : this._hideOverlay();
        }

        this.openedChanged.next(open);
    }
}