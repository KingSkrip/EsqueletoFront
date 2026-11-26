import { DOCUMENT } from '@angular/common';
import {
    Component,
    DestroyRef,
    OnInit,
    ViewEncapsulation,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { combineLatest, map } from 'rxjs';

import { ConfigService } from '../core/auth/services/config/config.service';
import { MediaWatcherService } from '../core/auth/services/media-watcher';

// TODO: cuando tengamos el menú lateral
// import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
    selector: 'layout',
    templateUrl: './layout.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [
        RouterOutlet,
        // SidebarComponent,
    ],
})
export class LayoutComponent implements OnInit {
    private readonly _document = inject(DOCUMENT);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _configService = inject(ConfigService);
    private readonly _mediaWatcher = inject(MediaWatcherService);

    /** Menú lateral abierto (por defecto abierto solo en pantallas grandes). */
    readonly sidebarOpen = signal(
        typeof window !== 'undefined' && window.innerWidth >= 1024,
    );

    readonly currentYear = new Date().getFullYear();

    ngOnInit(): void {
        this._watchScheme();
    }

    toggleSidebar(): void {
        this.sidebarOpen.update((open) => !open);
    }

    closeSidebar(): void {
        this.sidebarOpen.set(false);
    }

    /** Aplica .light / .dark (y theme-*) al body según la configuración. */
    private _watchScheme(): void {
        combineLatest([
            this._configService.config$,
            this._mediaWatcher.onMediaQueryChange$([
                '(prefers-color-scheme: dark)',
                '(prefers-color-scheme: light)',
            ]),
        ])
            .pipe(
                map(([config, mql]) => ({
                    scheme:
                        config.scheme === 'auto'
                            ? mql?.breakpoints?.['(prefers-color-scheme: dark)']
                                ? 'dark'
                                : 'light'
                            : config.scheme,
                    theme: config.theme as string,
                })),
                takeUntilDestroyed(this._destroyRef),
            )
            .subscribe(({ scheme, theme }) => {
                const body = this._document.body;
                if (!body) {
                    return;
                }

                body.classList.remove('light', 'dark');
                body.classList.add(scheme);

                Array.from(body.classList)
                    .filter((c) => c.startsWith('theme-'))
                    .forEach((c) => body.classList.remove(c));

                if (theme) {
                    body.classList.add(theme);
                }
            });
    }
}