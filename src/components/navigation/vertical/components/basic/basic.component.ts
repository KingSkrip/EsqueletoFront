
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    IsActiveMatchOptions,
    RouterLink,
    RouterLinkActive,
} from '@angular/router';

import { Subject, takeUntil } from 'rxjs';
import { NavigationService } from '../../../navigation.service';
import { UtilsService } from '../../../../../app/core/auth/services/utils/utils.service';
import { NavigationItem } from '../../../navigation.types';
import { AppVerticalNavigationComponent } from '../../vertical.component';

@Component({
    selector: 'app-vertical-navigation-basic-item',
    templateUrl: './basic.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        RouterLink,
        RouterLinkActive,
        MatTooltipModule,
        NgTemplateOutlet,
        MatIconModule,
    ],
})
export class AppVerticalNavigationBasicItemComponent
    implements OnInit, OnDestroy
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _appNavigationService = inject(NavigationService);
    private _appUtilsService = inject(UtilsService);

    @Input() item!: NavigationItem;
    @Input() name!: string;

    // Set the equivalent of { exact: false } as default
    // for active match options.
    isActiveMatchOptions: IsActiveMatchOptions =
        this._appUtilsService.subsetMatchOptions;

    private _appVerticalNavigationComponent!: AppVerticalNavigationComponent;
    private _unsubscribeAll = new Subject<void>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {
        // Set active match options
        this.isActiveMatchOptions =
            this.item.isActiveMatchOptions ??
            (this.item.exactMatch
                ? this._appUtilsService.exactMatchOptions
                : this._appUtilsService.subsetMatchOptions);

        // Get the parent navigation component
        this._appVerticalNavigationComponent =
            this._appNavigationService.getComponent(this.name);

        // Mark for check
        this._changeDetectorRef.markForCheck();

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
}
