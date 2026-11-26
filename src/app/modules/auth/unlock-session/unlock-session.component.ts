import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth/auth.service';
import { UserService } from '../../../core/auth/services/users/user.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-unlock-session',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './unlock-session.component.html',
})
export class UnlockSessionComponent {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _authService = inject(AuthService);
  private readonly _userService = inject(UserService);
  private readonly _router = inject(Router);
  private readonly _activatedRoute = inject(ActivatedRoute);

  loading = false;
  showPassword = false;
  showAlert = false;

  alertMessage = '';

  name = '';
  private _email = '';

  unlockSessionForm = this._formBuilder.nonNullable.group({
    name: [{ value: '', disabled: true }],
    password: ['', Validators.required],
  });

  constructor() {
    this._userService.user$.subscribe({
      next: (user) => {
        this.name = user?.name ?? '';
        this._email = user?.email ?? '';

        this.unlockSessionForm.controls.name.setValue(this.name);
      },
    });
  }

  unlock(): void {
    if (this.unlockSessionForm.invalid) {
      this.unlockSessionForm.markAllAsTouched();
      return;
    }

    if (this.loading) return;

    this.loading = true;
    this.showAlert = false;

    this._authService
      .unlockSession({
        email: this._email,
        password: this.unlockSessionForm.controls.password.value,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          const redirectURL =
            this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/dashboard';

          this._router.navigateByUrl(redirectURL);
        },

        error: (error) => {
          console.error('Error al desbloquear sesión:', error);

          this.alertMessage =
            error?.error?.message ?? 'Contraseña incorrecta. Inténtalo nuevamente.';

          this.showAlert = true;

          this.unlockSessionForm.controls.password.reset();
        },
      });
  }
}
