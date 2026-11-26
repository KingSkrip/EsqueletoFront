import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AppConfigtypes } from '../../../core/auth/types/config/config.types';
import { ConfigService } from '../../../core/auth/services/config/config.service';

type Scheme = AppConfigtypes['scheme'];
type Theme = AppConfigtypes['theme'];

@Component({
    selector: 'settings',
    templateUrl: './settings.component.html',
    styles: [
        `
            settings {
                position: static;
                display: block;
                flex: none;
                width: auto;
            }

            @media screen and (min-width: 1280px) {
                empty-layout + settings .settings-cog {
                    right: 0 !important;
                }
            }
        `,
    ],
    encapsulation: ViewEncapsulation.None,
    imports: [MatIconModule, MatButtonModule, NgClass, MatTooltipModule],
})
export class SettingsComponent implements OnInit, OnDestroy {
    config!: AppConfigtypes;
    layout = '';
    scheme: Scheme = 'light';
    theme: Theme = '' as Theme;
    themes: { id: string; name: string }[] = [];

    /** Reemplaza el estado de fuse-drawer */
    opened = false;

    private _unsubscribeAll = new Subject<void>();

    constructor(
        private _router: Router,
        private _appConfigService: ConfigService,
    ) {}

    ngOnInit(): void {
        this._appConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: AppConfigtypes) => {
                this.config = config;
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    toggleDrawer(): void {
        this.opened = !this.opened;
    }

    closeDrawer(): void {
        this.opened = false;
    }

    setLayout(layout: string): void {
        // Limpia el query param 'layout' para permitir el cambio
        this._router
            .navigate([], {
                queryParams: { layout: null },
                queryParamsHandling: 'merge',
            })
            .then(() => {
                this._appConfigService.config = { layout };
            });
    }

    setScheme(scheme: Scheme): void {
        this._appConfigService.config = { scheme };
    }

    setTheme(theme: Theme): void {
        this._appConfigService.config = { theme };
    }
}