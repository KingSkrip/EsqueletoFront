import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
    forwardRef,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Subject, takeUntil } from 'rxjs';
import { AppHorizontalNavigationBasicItemComponent } from '../basic/basic.component';
import { AppHorizontalNavigationDividerItemComponent } from '../divider/divider.component';
import { NavigationService } from '../../../navigation.service';
import { NavigationItem } from '../../../navigation.types';
import { AppHorizontalNavigationComponent } from '../../horizontal.component';

@Component({
    selector: 'app-horizontal-navigation-branch-item',
    templateUrl: './branch.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        MatMenuModule,
        NgTemplateOutlet,
        AppHorizontalNavigationBasicItemComponent,
        forwardRef(() => AppHorizontalNavigationBranchItemComponent),
        AppHorizontalNavigationDividerItemComponent,
        MatTooltipModule,
        MatIconModule,
    ],
})
export class AppHorizontalNavigationBranchItemComponent
    implements OnInit, OnDestroy {
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_child: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _appNavigationService = inject(NavigationService);

    @Input() child: boolean = false;
    @Input() item!: NavigationItem;
    @Input() name!: string;
    @ViewChild('matMenu', { static: true }) matMenu!: MatMenu;

    private _appHorizontalNavigationComponent!: AppHorizontalNavigationComponent;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Get the parent navigation component
        this._appHorizontalNavigationComponent =
            this._appNavigationService.getComponent(this.name);

        // Subscribe to onRefreshed on the navigation component
        this._appHorizontalNavigationComponent.onRefreshed
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Trigger the change detection
     */
    triggerChangeDetection(): void {
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
}
