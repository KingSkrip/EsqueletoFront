import {
    ApplicationConfig,
    inject,
    provideBrowserGlobalErrorListeners,
    provideEnvironmentInitializer,
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { appRoutes } from './app.routes';
import { APP_CONFIG_SERVICE } from './core/auth/services/config/config.constants';
import { IconsService } from './core/auth/services/icons/icons.service';


export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),

        provideRouter(appRoutes),

        provideAnimationsAsync(),

        provideHttpClient(withFetch()),

        // Registra los sets de heroicons al arrancar la app
        provideEnvironmentInitializer(() => inject(IconsService)),

        {
            provide: APP_CONFIG_SERVICE,
            useValue: {
                layout: 'classy',
                scheme: 'light',
                theme: 'theme-default',
                isDark: false,
            },
        },
    ],
};