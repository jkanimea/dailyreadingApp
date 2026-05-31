import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserDto } from '../../core/models/user.model';

@Component({
  selector: 'app-account',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div *ngIf="loading" class="ion-text-center ion-padding-top" style="padding-top: 64px;">
        <ion-spinner></ion-spinner>
      </div>

      <!-- Guest view -->
      <div *ngIf="!loading && isGuest" class="guest-section">
        <div class="avatar">
          <ion-icon name="person-outline"></ion-icon>
        </div>
        <h2 class="display-name">Guest</h2>
        <p class="sub-text">You are browsing as a guest.<br>Sign in to save your progress.</p>
        <ion-button expand="block" class="ion-margin-top action-btn" (click)="goToLogin()">
          <ion-icon slot="start" name="log-in-outline"></ion-icon>
          Sign In
        </ion-button>
      </div>

      <!-- Authenticated view -->
      <div *ngIf="!loading && !isGuest">
        <div class="avatar-section">
          <div class="avatar-photo" *ngIf="user?.photoUrl">
            <img [src]="user!.photoUrl" class="avatar-img" alt="Profile photo">
          </div>
          <div class="avatar" *ngIf="!user?.photoUrl">{{ initials }}</div>
          <h2 class="display-name">{{ user?.displayName || 'Account' }}</h2>
          <p class="email">{{ user?.email || '' }}</p>
          <ion-badge *ngIf="user?.role" [color]="user?.role === 'Admin' ? 'danger' : 'primary'">
            {{ user?.role }}
          </ion-badge>
        </div>

        <ion-list *ngIf="user" class="ion-margin-top">
          <ion-list-header>Signed in with</ion-list-header>
          <ion-item lines="none">
            <ion-icon slot="start" [name]="providerIcon"></ion-icon>
            <ion-label>{{ providerLabel }}</ion-label>
          </ion-item>
        </ion-list>

        <div class="ion-padding">
          <ion-button expand="block" fill="outline" color="danger" (click)="logout()">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            Logout
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .avatar-section {
      text-align: center;
      padding: 40px 24px 24px;
    }
    .guest-section {
      text-align: center;
      padding: 64px 24px 24px;
    }
    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      font-size: 34px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb), 0.3);
    }
    .avatar ion-icon {
      font-size: 40px;
    }
    .avatar-photo {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      overflow: hidden;
      margin: 0 auto 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .display-name {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 4px;
      color: var(--ion-text-color);
    }
    .email {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 12px;
    }
    .sub-text {
      font-size: 14px;
      color: var(--ion-color-medium);
      line-height: 1.6;
      margin: 0 0 8px;
    }
    .action-btn {
      --border-radius: 12px;
      font-weight: 600;
    }
  `]
})
class AccountPage implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  isGuest = false;
  user?: UserDto;

  private userSub?: Subscription;

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    // Show cached state immediately, then refresh from backend
    this.userSub?.unsubscribe();
    this.userSub = this.auth.user$.subscribe(user => {
      this.user = user ?? undefined;
      this.isGuest = !user;
    });
    this.refreshFromBackend();
  }

  ionViewDidLeave(): void {
    this.userSub?.unsubscribe();
    this.userSub = undefined;
  }

  private async refreshFromBackend(): Promise<void> {
    this.isGuest = await this.auth.isGuest();
    if (this.isGuest) return;
    this.loading = true;
    try {
      const fresh = await firstValueFrom(this.auth.getCurrentUser());
      this.user = fresh;
    } catch {
      // Backend unreachable — cached user$ value is already shown
    } finally {
      this.loading = false;
    }
  }

  get initials(): string {
    return (this.user?.displayName ?? '')
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  }

  get providerLabel(): string {
    const map: Record<string, string> = { google: 'Google', facebook: 'Facebook', guest: 'Guest' };
    return map[this.user?.provider ?? ''] ?? (this.user?.provider ?? 'Unknown');
  }

  get providerIcon(): string {
    const map: Record<string, string> = { google: 'logo-google', facebook: 'logo-facebook' };
    return map[this.user?.provider ?? ''] ?? 'person-outline';
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}

const routes: Routes = [{ path: '', component: AccountPage }];

@NgModule({
  declarations: [AccountPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class AccountModule {}
