import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-more-page',
  standalone: false,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>More</ion-title>
        <ion-buttons slot="end">
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="more-grid">
        <div class="more-item" routerLink="/search">
          <ion-icon name="search-outline"></ion-icon>
          <span>Search</span>
        </div>
        <div class="more-item" routerLink="/bookmarks">
          <ion-icon name="bookmark-outline"></ion-icon>
          <span>Bookmarks</span>
        </div>
        <div class="more-item" routerLink="/progress">
          <ion-icon name="trending-up-outline"></ion-icon>
          <span>Progress</span>
        </div>
        <div class="more-item" routerLink="/settings">
          <ion-icon name="settings-outline"></ion-icon>
          <span>Settings</span>
        </div>
        <div class="more-item" routerLink="/account">
          <ion-icon name="person-outline"></ion-icon>
          <span>Account</span>
        </div>
        <div class="more-item" routerLink="/series">
          <ion-icon name="swap-horizontal-outline"></ion-icon>
          <span>Switch Series</span>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .more-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
      padding: 8px 0;
    }
    .more-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 8px 20px;
      border-radius: 16px;
      background: var(--ion-color-step-50, #f5f5f5);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .more-item:active {
      transform: scale(0.95);
      background: var(--ion-color-step-100, #eee);
    }
    .more-item ion-icon {
      font-size: 30px;
      color: var(--ion-color-primary);
    }
    .more-item span {
      font-size: 12px;
      font-weight: 600;
      color: var(--ion-text-color);
      text-align: center;
    }
  `]
})
class MorePage {}

@Component({
  selector: 'app-tabs',
  standalone: false,
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="today" routerLink="/tabs/today">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Today</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="calendar" routerLink="/tabs/calendar">
          <ion-icon name="calendar-outline"></ion-icon>
          <ion-label>Calendar</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="journal" routerLink="/tabs/journal">
          <ion-icon name="journal-outline"></ion-icon>
          <ion-label>Journal</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="more" routerLink="/tabs/more">
          <ion-icon name="apps-outline"></ion-icon>
          <ion-label>More</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: var(--ion-background-color);
      border-top: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.08));
      padding-bottom: env(safe-area-inset-bottom, 4px);
      height: 60px;
    }
    ion-tab-button {
      --color: var(--ion-color-step-500, #999);
      --color-selected: var(--ion-color-primary);
      font-size: 11px;
      --padding-top: 6px;
    }
    ion-tab-button ion-icon {
      font-size: 24px;
    }
    ion-tab-button ion-label {
      font-size: 11px;
      font-weight: 500;
    }
  `]
})
class TabsLayoutComponent {}

const tabsRoutes: Routes = [
  {
    path: '',
    component: TabsLayoutComponent,
    children: [
      { path: 'today', loadChildren: () => import('../today/today.module').then(m => m.TodayModule) },
      { path: 'reading/:id', loadChildren: () => import('../reading-detail/reading-detail.module').then(m => m.ReadingDetailModule) },
      { path: 'calendar', loadChildren: () => import('../calendar/calendar.module').then(m => m.CalendarModule) },
      { path: 'journal', loadChildren: () => import('../journal/journal.module').then(m => m.JournalModule) },
      { path: 'more', component: MorePage },
      { path: '', redirectTo: 'today', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  declarations: [TabsLayoutComponent, MorePage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(tabsRoutes), SharedModule]
})
export class TabsModule {}
