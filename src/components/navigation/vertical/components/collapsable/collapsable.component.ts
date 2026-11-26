
import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    forwardRef,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router } from '@angular/router';

import { Subject, filter, takeUntil } from 'rxjs';
import { AppVerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { AppVerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { AppVerticalNavigationGroupItemComponent } from '../group/group.component';
import { AppVerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';
import { NavigationService } from '../../../navigation.service';
import { NavigationItem } from '../../../navigation.types';
import { AppVerticalNavigationComponent } from '../../vertical.component';
import { appAnimations } from '../../../../animations/public-api';

@Component({
    selector: 'app-vertical-navigation-collapsable-item',
    templateUrl: './collapsable.component.html',
    animations: appAnimations,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        MatTooltipModule,
        MatIconModule,
        AppVerticalNavigationBasicItemComponent,
        forwardRef(() => AppVerticalNavigationCollapsableItemComponent),
        AppVerticalNavigationDividerItemComponent,
        AppVerticalNavigationGroupItemComponent,
        AppVerticalNavigationSpacerItemComponent,
    ],
})
export class AppVerticalNavigationCollapsableItemComponent
    implements OnInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_autoCollapse: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _router = inject(Router);
    private _appNavigationService = inject(NavigationService);

    @Input() autoCollapse!: boolean;
    @Input() item!: NavigationItem;
    @Input() name!: string;

    isCollapsed = true;
    isExpanded = false;

    private _appVerticalNavigationComponent!: AppVerticalNavigationComponent;
    private _unsubscribeAll = new Subject<void>();

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Host binding for component classes
     */
    @HostBinding('class')
    get classList(): Record<string, boolean> {
        return {
            'app-vertical-navigation-item-collapsed': this.isCollapsed,
            'app-vertical-navigation-item-expanded': this.isExpanded,
        };
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {
        // Get the parent navigation component
        this._appVerticalNavigationComponent =
            this._appNavigationService.getComponent(this.name);

        // If the item has a child matching the current URL, expand
        if (this._hasActiveChild(this.item, this._router.url)) {
            this.expand();
        } else if (this.autoCollapse) {
            this.collapse();
        }

        // Listen for collapsed items
        this._appVerticalNavigationComponent.onCollapsableItemCollapsed
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((collapsedItem) => {
                if (collapsedItem === null) {
                    return;
                }

                if (this._isChildrenOf(collapsedItem, this.item)) {
                    this.collapse();
                }
            });

        // Listen for expanded items when autoCollapse is enabled
        if (this.autoCollapse) {
            this._appVerticalNavigationComponent.onCollapsableItemExpanded
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((expandedItem) => {
                    if (expandedItem === null) {
                        return;
                    }

                    if (this._isChildrenOf(this.item, expandedItem)) {
                        return;
                    }

                    if (this._hasActiveChild(this.item, this._router.url)) {
                        return;
                    }

                    if (this.item === expandedItem) {
                        return;
                    }

                    this.collapse();
                });
        }

        // Listen for NavigationEnd events
        this._router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd =>
                        event instanceof NavigationEnd
                ),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe((event) => {
                if (
                    this._hasActiveChild(
                        this.item,
                        event.urlAfterRedirects
                    )
                ) {
                    this.expand();
                } else if (this.autoCollapse) {
                    this.collapse();
                }
            });

        // Subscribe to onRefreshed
        this._appVerticalNavigationComponent.onRefreshed
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Collapse
     */
    collapse(): void {
        if (this.item.disabled || this.isCollapsed) {
            return;
        }

        this.isCollapsed = true;
        this.isExpanded = false;

        this._changeDetectorRef.markForCheck();

        this._appVerticalNavigationComponent.onCollapsableItemCollapsed.next(
            this.item
        );
    }

    /**
     * Expand
     */
    expand(): void {
        if (this.item.disabled || !this.isCollapsed) {
            return;
        }

        this.isCollapsed = false;
        this.isExpanded = true;

        this._changeDetectorRef.markForCheck();

        this._appVerticalNavigationComponent.onCollapsableItemExpanded.next(
            this.item
        );
    }

    /**
     * Toggle collapsable
     */
    toggleCollapsable(): void {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    /**
     * Track by function for ngFor loops
     */
    trackByFn(index: number, item: NavigationItem): string | number {
        return item.id || index;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Check if the given item has the given URL in one of its children
     */
    private _hasActiveChild(
        item: NavigationItem,
        currentUrl: string
    ): boolean {
        const children = item.children;

        if (!children) {
            return false;
        }

        for (const child of children) {
            if (child.children) {
                if (this._hasActiveChild(child, currentUrl)) {
                    return true;
                }
            }

            if (
                child.link &&
                this._router.isActive(child.link, child.exactMatch || false)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this is a child of the given item
     */
    private _isChildrenOf(
        parent: NavigationItem,
        item: NavigationItem
    ): boolean {
        const children = parent.children;

        if (!children) {
            return false;
        }

        if (children.indexOf(item) > -1) {
            return true;
        }

        for (const child of children) {
            if (child.children) {
                if (this._isChildrenOf(child, item)) {
                    return true;
                }
            }
        }

        return false;
    }
}
