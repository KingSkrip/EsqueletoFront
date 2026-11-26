import { NgClass } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { MediaWatcherService } from 'app/core/auth/services/media-watcher';
import { UserService } from 'app/core/auth/services/users/user.service';
import { APP_CONFIG } from 'app/core/config/app-config';
import { SubRoleEnum } from 'app/core/roles/dataroles';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppVerticalNavigationComponent, NavigationItem, NavigationService } from 'src/components/navigation';



@Component({
  selector: 'thin-layout',
  templateUrl: './thin.component.html',
  styleUrls: ['./thin.compnent.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
})
export class ThinLayoutComponent implements OnInit, OnDestroy {
  isScreenSmall = false;
  navigation: NavigationItem[] = [];
  isReportProdRoute = false;
  isJacobo = false;
  isNavOpen = false;
  isLoading = false;
  isFullscreen = false;
  appName = APP_CONFIG.appName;

  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _activatedRoute: ActivatedRoute,
    private _router: Router,
    private _mediaWatcherService: MediaWatcherService,
    private _navigationService: NavigationService,
    private _userService: UserService,
  ) {}

  get currentYear(): number {
    return new Date().getFullYear();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  ngOnInit(): void {
    this.navigation = this._navigationService.getNavigation('main') ?? [];

    this._navigationService.onNavigationChanged$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ key }) => {
        if (key === 'main') {
          this.navigation = this._navigationService.getNavigation('main') ?? [];
        }
      });

    // Barra de carga
    this._router.events.pipe(takeUntil(this._unsubscribeAll)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isLoading = false;
      }
    });

    // Detectar ruta reportprod + cerrar nav tras navegar
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this._unsubscribeAll),
      )
      .subscribe(() => {
        this.isReportProdRoute = this._router.url.includes('/reportprod');

        const nav =
          this._navigationService.getComponent<AppVerticalNavigationComponent>('mainNavigation');

        if (this.isJacobo && nav?.opened) {
          nav.close();
          this.isNavOpen = false;
          return;
        }

        if (this.isScreenSmall && nav?.opened) {
          nav.close();
          this.isNavOpen = false;
        }
      });

    this.isReportProdRoute = this._router.url.includes('/reportprod');

    this._mediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        this.isScreenSmall = !matchingAliases.includes('md');
        this.isNavOpen = this.isJacobo ? false : !this.isScreenSmall;
      });

    this._userService.user$.pipe(takeUntil(this._unsubscribeAll)).subscribe((user) => {
      if (!user) return;
      const subRoleId = user.sub_permissions?.[0] ?? null;
      this.isJacobo = subRoleId === SubRoleEnum.JACOBO;
      this.isNavOpen = this.isJacobo ? false : !this.isScreenSmall;
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  toggleNavigation(name: string): void {
    if (this.isReportProdRoute && this.isScreenSmall) return;

    const navigation = this._navigationService.getComponent<AppVerticalNavigationComponent>(name);
    navigation?.toggle();

    if (this.isScreenSmall && navigation?.opened) {
      const childNav =
        this._navigationService.getComponent<AppVerticalNavigationComponent>('reportProdNav');
      if (childNav?.opened) childNav.close();
    }
  }

  onNavOpenedChanged(opened: boolean): void {
    if (!opened || !this.isScreenSmall) return;

    const forceScrollTop = () => {
      const content = document.querySelector<HTMLElement>('.app-vertical-navigation-content');
      if (content) content.scrollTop = 0;
    };

    [0, 50, 150, 300].forEach((ms) => setTimeout(forceScrollTop, ms));
  }
}