
import { HttpClient } from '@angular/common/http';
import {
    Inject,
    Injectable,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
    catchError,
    finalize,
    from,
    map,
    Observable,
    of,
    shareReplay,
    switchMap,
    throwError,
} from 'rxjs';

import { AuthUtils } from '../../types/users/auth.utils';
import { UserService } from '../users/user.service';
import { APP_CONFIG } from '../../../config/app-config';
import { DeviceInfoService } from '../../../../shared/devicesInfo/device-info.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _authenticated = false;
    private apiUrl = APP_CONFIG.apiUrl;

    /**
     * Identifica si el código se está ejecutando en el navegador.
     * Evita errores de localStorage durante SSR.
     */
    private readonly isBrowser: boolean;

    /**
     * Evita múltiples peticiones simultáneas de validación.
     */
    private _checkInFlight$: Observable<boolean> | null = null;

    constructor(
        private _httpClient: HttpClient,
        private _userService: UserService,
        private _deviceInfoService: DeviceInfoService,
        @Inject(PLATFORM_ID) platformId: Object,
    ) {
        this.isBrowser = isPlatformBrowser(platformId);

        // La sesión local solamente se valida en el navegador.
        if (this.isBrowser) {
            const token = this.encrypt;

            if (!token || AuthUtils.isTokenExpired(token)) {
                this.clearSession();
            }
        }
    }

    // --------------------------------------------------
    // SESSION MANAGEMENT
    // --------------------------------------------------

    /**
     * Limpia la sesión local y marca todo como inactivo.
     */
    private clearSession(): void {
        if (this.isBrowser) {
            localStorage.removeItem('encrypt');
        }

        this._authenticated = false;
        this._userService.user = null;
        this._checkInFlight$ = null;
    }

    get authenticated(): boolean {
        return this._authenticated;
    }

    // --------------------------------------------------
    // ACCESSORS
    // --------------------------------------------------

    set encrypt(token: string) {
        if (!this.isBrowser) {
            return;
        }

        localStorage.setItem('encrypt', token);
    }

    get encrypt(): string {
        if (!this.isBrowser) {
            return '';
        }

        return localStorage.getItem('encrypt') ?? '';
    }

    // --------------------------------------------------
    // PASSWORD RECOVERY
    // --------------------------------------------------

    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post(
            `${this.apiUrl}auth/forgot-password`,
            { email },
        );
    }

    resetPassword(data: {
        token: string;
        email: string;
        password: string;
    }): Observable<any> {
        return this._httpClient.post(
            `${this.apiUrl}auth/reset-password`,
            data,
        );
    }

    // --------------------------------------------------
    // SIGN IN
    // --------------------------------------------------


    signIn(credentials: {
        email: string;
        password: string;
    }): Observable<any> {
        if (this._authenticated) {
            return throwError(
                () => new Error('User is already logged in.'),
            );
        }

        return from(this._deviceInfoService.getDeviceInfo()).pipe(
            switchMap((deviceInfo) => {
                const payload = {
                    ...credentials,
                    device: deviceInfo,
                };

                return this._httpClient
                    .post<any>(`${this.apiUrl}auth/login`, payload)
                    .pipe(
                        map((response) => {
                            const data = response.data;

                            if (!data?.token || !data?.user) {
                                throw new Error(
                                    'Respuesta de autenticación inválida.',
                                );
                            }

                            this.encrypt = data.token;
                            this._authenticated = true;
                            this._userService.user = data.user;

                            return data;
                        }),
                    );
            }),
        );
    }

    /**
     * Genera y conserva un UUID por navegador/dispositivo.
     */
    private getOrCreateDeviceUuid(): string {
        if (!this.isBrowser) {
            throw new Error('No se puede identificar el dispositivo fuera del navegador.');
        }

        const storageKey = 'vigix_device_uuid';
        let uuid = localStorage.getItem(storageKey);

        if (!uuid) {
            uuid = crypto.randomUUID();
            localStorage.setItem(storageKey, uuid);
        }

        return uuid;
    }


    // --------------------------------------------------
    // SIGN OUT
    // --------------------------------------------------

    signOut(): Observable<any> {
        const token = this.encrypt;

        if (!token) {
            this.clearSession();
            return of(true);
        }

        return this._httpClient
            .post(`${this.apiUrl}auth/logout`, {})
            .pipe(
                catchError(() => of(true)),
                finalize(() => {
                    this.clearSession();
                }),
            );
    }

    // --------------------------------------------------
    // SIGN UP
    // --------------------------------------------------

    signUp(user: {
        name: string;
        email: string;
        password: string;
        company: string;
    }): Observable<any> {
        return this._httpClient.post(
            `${this.apiUrl}auth/sign-up`,
            user,
        );
    }

    // --------------------------------------------------
    // UNLOCK SESSION
    // --------------------------------------------------

    unlockSession(credentials: {
        email: string;
        password: string;
    }): Observable<any> {
        return this._httpClient.post(
            `${this.apiUrl}auth/unlock-session`,
            credentials,
        );
    }

    // --------------------------------------------------
    // CHECK AUTHENTICATION
    // --------------------------------------------------

    check(): Observable<boolean> {
        // SSR no debe consultar sesiones del navegador.
        if (!this.isBrowser) {
            return of(false);
        }

        const token = this.encrypt;

        if (!token) {
            this.clearSession();
            return of(false);
        }

        if (AuthUtils.isTokenExpired(token)) {
            this.clearSession();
            return of(false);
        }

        if (this._authenticated) {
            return of(true);
        }

        if (this._checkInFlight$) {
            return this._checkInFlight$;
        }

        this._checkInFlight$ = this.validateSession().pipe(
            finalize(() => {
                this._checkInFlight$ = null;
            }),
            shareReplay(1),
        );

        return this._checkInFlight$;
    }

    /**
     * Valida la sesión contra el backend usando /dash/me.
     * No rota el JWT; confirma que sigue vigente y actualiza
     * los datos del usuario.
     */
    private validateSession(): Observable<boolean> {
        const token = this.encrypt;

        if (!token) {
            this.clearSession();
            return of(false);
        }

        return this._userService.fetchMe().pipe(
            switchMap(() => {
                this._authenticated = true;
                return of(true);
            }),
            catchError(() => {
                this.clearSession();
                return of(false);
            }),
        );
    }

    // --------------------------------------------------
    // USER ROLE
    // --------------------------------------------------

    getUserRole(): Observable<{
        roleId: number | null;
        subRoleId: number | null;
    }> {
        return this._userService.user$.pipe(
            map((user) => {
                if (!user || !user.permissions?.length) {
                    return {
                        roleId: null,
                        subRoleId: null,
                    };
                }

                return {
                    roleId: user.permissions[0],
                    subRoleId: user.sub_permissions?.[0] ?? null,
                };
            }),
        );
    }

    // --------------------------------------------------
    // USER FLAGS
    // --------------------------------------------------

    getUserFlags(): Observable<{
        esRh: boolean;
        esGerente: boolean;
        esJefeArea: boolean;
        esJefeAuxiliar: boolean;
        identityId: number | null;
        puestoNombre: string | null;
        areaNombre: string | null;
    }> {
        return this._userService.user$.pipe(
            map((user) => {
                const puesto = user?.USER_PUESTO?.PUESTO ?? null;
                const area = user?.USER_PUESTO?.AREA ?? null;

                const rawId = user?.identity_id ?? user?.id ?? null;

                const identityId =
                    rawId != null ? Number(rawId) : null;

                return {
                    esRh: !!puesto?.ES_RH,
                    esGerente: !!puesto?.ES_GERENTE,
                    esJefeArea: !!puesto?.ES_JEFE_AREA,
                    esJefeAuxiliar: !!user?.ES_JEFE_AUXILIAR,

                    identityId:
                        identityId != null && !Number.isNaN(identityId)
                            ? identityId
                            : null,

                    puestoNombre: puesto?.NOMBRE ?? null,
                    areaNombre: area?.NOMBRE ?? null,
                };
            }),
        );
    }

    getUser() {
        return this._userService.user;
    }

    // --------------------------------------------------
    // SESSION ACTIVITY
    // --------------------------------------------------

    pauseSession(): Observable<any> {
        const token = this.encrypt;

        if (!token) {
            return of(true);
        }

        return this._httpClient
            .post(`${this.apiUrl}auth/session/pause`, {
                encrypt: token,
            })
            .pipe(
                catchError(() => of(true)),
            );
    }

    resumeSession(): Observable<any> {
        const token = this.encrypt;

        if (!token) {
            return of(true);
        }

        return this._httpClient
            .post(`${this.apiUrl}auth/session/resume`, {
                encrypt: token,
            })
            .pipe(
                catchError(() => of(true)),
            );
    }

    heartbeat(): Observable<any> {
        const token = this.encrypt;

        if (!token) {
            return of(true);
        }

        return this._httpClient
            .post(`${this.apiUrl}auth/session/heartbeat`, {
                encrypt: token,
            })
            .pipe(
                catchError(() => of(true)),
            );
    }
}
