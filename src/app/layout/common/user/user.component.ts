import { NgClass } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app-config';
import { User } from '../../../core/auth/types/users/user.types';
import { AuthService } from '../../../core/auth/services/auth/auth.service';
import { UserService } from '../../../core/auth/services/users/user.service';

@Component({
  selector: 'user',
  templateUrl: './user.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'user',
  imports: [MatButtonModule, MatMenuModule, MatIconModule, NgClass, MatDividerModule],
})
export class UserComponent implements OnInit, OnDestroy {
  @Input({ transform: booleanAttribute }) showAvatar = true;

  user: User | null = null;
  apiBase = APP_CONFIG.apiBase;

  private _photoVersion = Date.now();
  private _lastPhoto = '';
  private _unsubscribeAll = new Subject<void>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _router: Router,
    private _authService: AuthService,
    private _userService: UserService,
  ) {}

  get photoUrl(): string {
    const photo = this.user?.photo;
    if (!photo) return '';

    // URL completa: úsala tal cual
    if (photo.startsWith('http')) {
      return `${photo}?v=${this._photoVersion}`;
    }

    const base = this.apiBase.endsWith('/') ? this.apiBase : `${this.apiBase}/`;
    const path = photo.startsWith('/') ? photo.substring(1) : photo;

    return `${base}${path}?v=${this._photoVersion}`;
  }

  ngOnInit(): void {
    this._userService.user$.pipe(takeUntil(this._unsubscribeAll)).subscribe((user) => {
      this.user = user ?? null;

      if (user?.photo && user.photo !== this._lastPhoto) {
        this._lastPhoto = user.photo;
        this._photoVersion = Date.now(); // cache-bust si cambió
      }

      this._changeDetectorRef.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  updateUserStatus(status: string): void {
    if (!this.user) return;
    this._userService.updateUserStatus(status);
  }

  signOut(): void {
    this._authService.signOut().subscribe({
      next: () => this._router.navigate(['/sign-out']),
      error: () => this._router.navigate(['/sign-out']), // navega igual aunque falle
    });
  }

  openProfile(): void {
    this._router.navigateByUrl('/pages/profile');
  }

  openSettings(): void {
    this._router.navigateByUrl('/pages/settings');
  }
}