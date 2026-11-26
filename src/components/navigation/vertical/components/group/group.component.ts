
import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
    forwardRef,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Subject, takeUntil } from 'rxjs';
import { AppVerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { AppVerticalNavigationCollapsableItemComponent } from '../collapsable/collapsable.component';
import { AppVerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { AppVerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';
import { NavigationService } from '../../../navigation.service';
import { NavigationItem } from '../../../navigation.types';
import { AppVerticalNavigationComponent } from '../../vertical.component';

@Component({
    selector: 'app-vertical-navigation-group-item',
    templateUrl: './group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        MatIconModule,
        AppVerticalNavigationBasicItemComponent,
        AppVerticalNavigationCollapsableItemComponent,
        AppVerticalNavigationDividerItemComponent,
        forwardRef(() => AppVerticalNavigationGroupItemComponent),
        AppVerticalNavigationSpacerItemComponent,
    ],
})
export class AppVerticalNavigationGroupItemComponent
    implements OnInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_autoCollapse: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _appNavigationService = inject(NavigationService);

    @Input() autoCollapse!: boolean;
    @Input() item!: NavigationItem;
    @Input() name!: string;

    private _appVerticalNavigationComponent!: AppVerticalNavigationComponent;
    private _unsubscribeAll = new Subject<void>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {
        // Get the parent navigation component
        this._appVerticalNavigationComponent =
            this._appNavigationService.getComponent(this.name);

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
     * Track by function for ngFor loops
     */
    trackByFn(index: number, item: NavigationItem): any {
        return item.id || index;
    }
}
