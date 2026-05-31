import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserDto } from '../../../core/models/user.model';

@Component({
  selector: 'app-avatar-btn',
  template: `
    <ion-button (click)="navigate()" [title]="initials || 'Account'">
      <span slot="icon-only" class="avatar-wrap">
        <img *ngIf="photoUrl" [src]="photoUrl" class="avatar-img" alt="Profile">
        <span *ngIf="!photoUrl && initials" class="avatar-initials">{{ initials }}</span>
        <ion-icon *ngIf="!photoUrl && !initials" name="person-circle-outline"></ion-icon>
      </span>
    </ion-button>
  `,
  styles: [`
    .avatar-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }
    .avatar-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }
    .avatar-initials {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.5px;
    }
  `],
  standalone: false
})
export class AvatarButtonComponent implements OnDestroy {
  initials = '';
  photoUrl = '';

  private sub: Subscription;

  constructor(private auth: AuthService, private router: Router) {
    this.sub = this.auth.user$.subscribe((user: UserDto | null) => {
      this.photoUrl = user?.photoUrl ?? '';
      this.initials = user ? this.getInitials(user.displayName) : '';
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
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
