import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { MediaWatcherService } from 'app/core/auth/services/media-watcher';
import { APP_CONFIG } from 'app/core/config/app-config';
import { Subject, takeUntil } from 'rxjs';
import { AppVerticalNavigationComponent, NavigationItem, NavigationService } from 'src/components/navigation';


@Component({
    selector: 'modern-layout',
    templateUrl: './modern.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatButtonModule,
        MatIconModule,
    ],
})
export class ModernLayoutComponent implements OnInit, OnDestroy {
    isScreenSmall = false;
    navigation: NavigationItem[] = [];
    appName = APP_CONFIG.appName;

    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _navigationService: NavigationService,
        private _mediaWatcherService: MediaWatcherService,
    ) {}

    // -------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------

    get currentYear(): number {
        return new Date().getFullYear();
    }

    // -------------------------------------------------------------------
    // Lifecycle hooks
    // -------------------------------------------------------------------

    ngOnInit(): void {
        // Navigation data
        this.navigation = this._navigationService.getNavigation('main') ?? [];

        this._navigationService.onNavigationChanged$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ key }) => {
                if (key === 'main') {
                    this.navigation =
                        this._navigationService.getNavigation('main') ?? [];
                }
            });

        // Media changes
        this._mediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    toggleNavigation(name: string): void {
        const navigation =
            this._navigationService.getComponent<AppVerticalNavigationComponent>(name);

        navigation?.toggle();
    }
}