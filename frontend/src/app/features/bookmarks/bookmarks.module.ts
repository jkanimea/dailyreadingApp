import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { BookmarkService } from '../../core/services/bookmark.service';
import { BookmarkDto } from '../../core/models/bookmark.model';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Bookmarks</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading) {
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:100%;height:72px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:72px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:72px;border-radius:12px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (!loading && bookmarks.length === 0 && !error) {
        <div class="empty-state">
          <ion-icon name="bookmark-outline" size="large" color="medium"></ion-icon>
          <p class="empty-title">No bookmarks yet</p>
          <p class="empty-subtitle">Bookmark readings from the reading detail page to find them here.</p>
        </div>
      }

      @if (bookmarks.length > 0) {
        <div class="bookmarks-list">
          @for (b of bookmarks; track b.readingId) {
            <div class="bookmark-card" (click)="goToReading(b.readingId)">
              <div class="bookmark-body">
                <h3 class="bookmark-title">{{ b.bibleReading }}</h3>
                <p class="bookmark-date">{{ formatDate(b.month, b.day) }}</p>
              </div>
              <div class="bookmark-actions">
                <ion-icon name="bookmark" color="warning"></ion-icon>
                <button class="delete-btn" (click)="$event.stopPropagation(); removeBookmark(b)">
                  <ion-icon name="trash-outline" color="medium"></ion-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .bookmarks-list {
      padding: 4px 0;
    }
    .bookmark-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      margin-bottom: 10px;
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .bookmark-card:active {
      transform: scale(0.99);
    }
    .bookmark-body {
      flex: 1;
      min-width: 0;
    }
    .bookmark-title {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 2px;
      color: var(--ion-text-color);
    }
    .bookmark-date {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
    }
    .bookmark-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .bookmark-actions ion-icon {
      font-size: 20px;
    }
    .delete-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .delete-btn:hover {
      opacity: 1;
    }
  `]
})
class BookmarksPage {
  private router = inject(Router);
  private bookmarkService = inject(BookmarkService);

  bookmarks: BookmarkDto[] = [];
  loading = false;
  error?: string;

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  ionViewWillEnter(): void {
    this.loadBookmarks();
  }

  private async loadBookmarks(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.bookmarks = await firstValueFrom(this.bookmarkService.getAll());
    } catch {
      this.error = 'Failed to load bookmarks. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }

  async removeBookmark(b: BookmarkDto): Promise<void> {
    try {
      await firstValueFrom(this.bookmarkService.removeBookmark(b.readingId));
      this.bookmarks = this.bookmarks.filter(x => x.readingId !== b.readingId);
    } catch {
      this.error = 'Failed to remove bookmark.';
    }
  }

  goToReading(id: number): void {
    this.router.navigate(['/reading', id]);
  }

  formatDate(month: number, day: number): string {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[month - 1] ?? ''} ${day}`;
  }
}

const routes: Routes = [{ path: '', component: BookmarksPage }];

@NgModule({
  declarations: [BookmarksPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class BookmarksModule {}
