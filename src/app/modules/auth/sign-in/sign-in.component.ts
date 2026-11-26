import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth/auth.service';
import { APP_ASSETS } from 'app/core/config/app-assets.config';
import { MatIconModule } from '@angular/material/icon';
import { APP_CONFIG } from 'app/core/config/app-config';

type SignInMethod = 'password' | 'biometric' | 'qr';

@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatIconModule
    ],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.scss',
})
export class SignInComponent implements OnInit, OnDestroy {

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _authService = inject(AuthService);
    private readonly _router = inject(Router);
    private readonly _cdr = inject(ChangeDetectorRef);
    readonly methods: { id: SignInMethod; label: string; icon: string }[] = [
        { id: 'password', label: 'Clave', icon: 'heroicons_outline:lock-closed' },
        { id: 'biometric', label: 'Huella', icon: 'heroicons_outline:finger-print' },
        // { id: 'qr',        label: 'QR',     icon: 'heroicons_outline:qr-code' },
    ];
    
    @ViewChild('video') private _videoRef?: ElementRef<HTMLVideoElement>;
    readonly appConfig = APP_CONFIG;
    readonly appName = APP_CONFIG.appName;
    readonly currentYear = new Date().getFullYear();
    readonly assets = APP_ASSETS;
    method: SignInMethod = 'password';
    loading = false;
    showPassword = false;
    showAlert = false;
    alertMessage = '';

    biometricSupported = false;
    cameraActive = false;

    private _stream?: MediaStream;
    private _scanFrame?: number;

    signInForm = this._formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        rememberMe: [false],
    });

    // ------------------------------------------------------------
    // Ciclo de vida
    // ------------------------------------------------------------
    async ngOnInit(): Promise<void> {
        // ¿El teléfono tiene huella / rostro / patrón disponible para el navegador?
        try {
            this.biometricSupported =
                !!window.PublicKeyCredential &&
                (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
        } catch {
            this.biometricSupported = false;
        }
        this._cdr.markForCheck();
    }

    ngOnDestroy(): void {
        this.stopQrScan();
    }

    // ------------------------------------------------------------
    // Cambio de método
    // ------------------------------------------------------------
    setMethod(method: SignInMethod): void {
        if (this.method === method) return;

        this.method = method;
        this.showAlert = false;

        // La cámara solo vive mientras la pestaña QR esté activa.
        if (method !== 'qr') {
            this.stopQrScan();
        }
    }

    // ------------------------------------------------------------
    // 1) Correo + contraseña
    // ------------------------------------------------------------
    signIn(): void {

        if (this.signInForm.invalid) {
            this.signInForm.markAllAsTouched();
            return;
        }

        if (this.loading) return;

        this.loading = true;
        this.showAlert = false;

        this._authService
            .signIn(this.signInForm.getRawValue())
            .pipe(
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: () => {

                    // Redirección inicial después de autenticar.
                    // Posteriormente la determinaremos por rol.
                    this._router.navigateByUrl('/dashboard');
                },

                error: (error) => {

                    console.error('Error de autenticación:', error);

                    this._showError(
                        error?.error?.message ??
                        'Usuario o contraseña incorrectos.'
                    );

                    this.signInForm.controls.password.reset();
                },
            });
    }

    // ------------------------------------------------------------
    // 2) Huella / rostro / patrón del teléfono (WebAuthn / Passkeys)
    //
    //    El teléfono guarda la clave privada y la desbloquea con la
    //    huella o el patrón. Al servidor solo llega una firma, nunca
    //    datos biométricos.
    //
    //    Flujo (requiere backend):
    //      a) GET  /auth/webauthn/options  -> challenge + allowCredentials
    //      b) navigator.credentials.get()  -> firma
    //      c) POST /auth/webauthn/verify   -> token de sesión
    //
    //    El registro (navigator.credentials.create) se hace una vez
    //    desde el perfil del guardia, ya autenticado.
    // ------------------------------------------------------------
    async signInWithBiometric(): Promise<void> {

        if (this.loading || !this.biometricSupported) return;

        this.loading = true;
        this.showAlert = false;

        try {
            // TODO: reemplazar por el challenge real del backend.
            // const options = await firstValueFrom(this._authService.getWebAuthnOptions());
            //
            // const credential = await navigator.credentials.get({
            //     publicKey: {
            //         challenge: base64UrlToBuffer(options.challenge),
            //         allowCredentials: options.allowCredentials.map(c => ({
            //             ...c, id: base64UrlToBuffer(c.id),
            //         })),
            //         userVerification: 'required',
            //         timeout: 60_000,
            //     },
            // });
            //
            // await firstValueFrom(this._authService.verifyWebAuthn(credential));
            // this._router.navigateByUrl('/dashboard');

            this._showError('El acceso con huella aún no está habilitado en el servidor.');

        } catch (error: unknown) {
            const name = (error as DOMException)?.name;

            // El usuario canceló el diálogo del sistema: no es un error real.
            if (name !== 'NotAllowedError') {
                console.error('Error biométrico:', error);
                this._showError('No pudimos validar tu huella. Intenta de nuevo o usa tu contraseña.');
            }
        } finally {
            this.loading = false;
            this._cdr.markForCheck();
        }
    }

    // ------------------------------------------------------------
    // 3) Código QR del gafete
    // ------------------------------------------------------------
    async startQrScan(): Promise<void> {

        this.showAlert = false;

        // BarcodeDetector: Chrome / Edge / Android. Safari iOS aún no.
        // Si necesitas iOS, agrega una librería (p. ej. @zxing/browser o jsQR).
        const Detector = (window as any).BarcodeDetector;

        if (!Detector) {
            this._showError('Tu navegador no soporta el escaneo QR. Usa tu contraseña o huella.');
            return;
        }

        try {
            this._stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
        } catch {
            this._showError('No pudimos acceder a la cámara. Revisa los permisos del navegador.');
            return;
        }

        const video = this._videoRef?.nativeElement;
        if (!video) return;

        video.srcObject = this._stream;
        await video.play();

        this.cameraActive = true;
        this._cdr.markForCheck();

        const detector = new Detector({ formats: ['qr_code'] });

        const tick = async () => {
            if (!this.cameraActive) return;

            try {
                const codes = await detector.detect(video);
                if (codes.length > 0) {
                    this.stopQrScan();
                    this._handleQrCode(codes[0].rawValue);
                    return;
                }
            } catch {
                // frame no listo todavía, seguimos intentando
            }

            this._scanFrame = requestAnimationFrame(tick);
        };

        this._scanFrame = requestAnimationFrame(tick);
    }

    stopQrScan(): void {
        if (this._scanFrame) {
            cancelAnimationFrame(this._scanFrame);
            this._scanFrame = undefined;
        }

        this._stream?.getTracks().forEach((track) => track.stop());
        this._stream = undefined;

        const video = this._videoRef?.nativeElement;
        if (video) video.srcObject = null;

        this.cameraActive = false;
    }

    private _handleQrCode(code: string): void {
        this.loading = true;

        // TODO: conectar con el backend, por ejemplo:
        // this._authService.signInWithQr(code)
        //     .pipe(finalize(() => (this.loading = false)))
        //     .subscribe({
        //         next: () => this._router.navigateByUrl('/dashboard'),
        //         error: () => this._showError('Código QR inválido o vencido.'),
        //     });

        console.log('QR leído:', code);
        this.loading = false;
        this._showError('El acceso con QR aún no está habilitado en el servidor.');
        this._cdr.markForCheck();
    }

    // ------------------------------------------------------------
    // Utilidad
    // ------------------------------------------------------------
    private _showError(message: string): void {
        this.alertMessage = message;
        this.showAlert = true;
    }
}