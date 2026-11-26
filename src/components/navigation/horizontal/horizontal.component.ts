import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewEncapsulation,
    inject,
} from '@angular/core';

import { ReplaySubject, Subject } from 'rxjs';
import { AppHorizontalNavigationBasicItemComponent } from './components/basic/basic.component';
import { AppHorizontalNavigationBranchItemComponent } from './components/branch/branch.component';
import { AppHorizontalNavigationSpacerItemComponent } from './components/spacer/spacer.component';
import { appAnimations } from '../../animations/public-api';
import { NavigationService } from '../navigation.service';
import { UtilsService } from '../../../app/core/auth/services/utils/utils.service';
import { NavigationItem } from '../navigation.types';

@Component({
    selector: 'app-horizontal-navigation',
    templateUrl: './horizontal.component.html',
    styleUrls: ['./horizontal.component.scss'],
    animations: appAnimations,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'appHorizontalNavigation',
    imports: [
        AppHorizontalNavigationBasicItemComponent,
        AppHorizontalNavigationBranchItemComponent,
        AppHorizontalNavigationSpacerItemComponent,
    ],
})
export class AppHorizontalNavigationComponent
    implements OnChanges, OnInit, OnDestroy
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _appNavigationService = inject(NavigationService);
    private _appUtilsService = inject(UtilsService);

    @Input() name: string = this._appUtilsService.randomId();
    @Input() navigation!: NavigationItem[];

    onRefreshed: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void {
        // Navigation
        if ('navigation' in changes) {
            // Mark for check
            this._changeDetectorRef.markForCheck();
        }
    }

    /**
     * On init
     */
    ngOnInit(): void {
        // Make sure the name input is not an empty string
        if (this.name === '') {
            this.name = this._appUtilsService.randomId();
        }

        // Register the navigation component
        this._appNavigationService.registerComponent(this.name, this);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Deregister the navigation component from the registry
        this._appNavigationService.deregisterComponent(this.name);

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Refresh the component to apply the changes
     */
    refresh(): void {
        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Execute the observable
        this.onRefreshed.next(true);
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
