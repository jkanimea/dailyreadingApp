import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { UserDto } from '../../../core/models/user.model';

@Component({
  selector: 'app-avatar-btn',
  template: `
    <ion-button (click)="navigate()" [title]="initials || 'Account'" class="avatar-btn">
      <img *ngIf="photoUrl" [src]="photoUrl" slot="icon-only" class="avatar-img" alt="Profile">
      <span *ngIf="!photoUrl && initials" slot="icon-only" class="avatar-initials">{{ initials }}</span>
      <ion-icon *ngIf="!photoUrl && !initials" slot="icon-only" name="person-circle-outline"></ion-icon>
    </ion-button>
  `,
  styles: [`
    .avatar-btn {
      --padding-start: 0;
      --padding-end: 0;
      height: 32px;
      width: 32px;
    }
    .avatar-img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }
    .avatar-initials {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-btn::part(native) {
      min-width: 32px;
      min-height: 32px;
      padding: 0;
    }
  `],
  standalone: false
})
export class AvatarButtonComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  initials = '';
  photoUrl = '';

  constructor() {
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe((user: UserDto | null) => {
      this.photoUrl = user?.photoUrl ?? '';
      this.initials = user ? this.getInitials(user.displayName) : '';
    });
  }

  navigate(): void {
    this.router.navigate(['/account']);
  }

  private getInitials(name: string): string {
    return (name ?? '')
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
