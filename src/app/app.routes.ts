
import { Route } from '@angular/router';

import { NoAuthGuard } from './core/auth/guards/noAuth.guard';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const appRoutes: Route[] = [

    // Redirección inicial
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sign-in',
    },

    // Redirección después de iniciar sesión
    {
        path: 'signed-in-redirect',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },

    // Rutas para usuarios NO autenticados
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: { layout: 'empty' },
        children: [
            {
                path: 'sign-in',
                loadChildren: () =>
                    import('app/modules/auth/sign-in/sign-in.routes'),
            },
        ],
    },

    // Rutas para usuarios autenticados
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        children: [
            {
                path: 'dashboard',
                loadChildren: () =>
                    import('app/modules/dashboard/dashboard.routes'),
            },
        ],
    },

    // Ruta no encontrada
    {
        path: '**',
        redirectTo: '404-not-found',
    },
];
