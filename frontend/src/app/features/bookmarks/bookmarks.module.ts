import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
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
          <ion-button (click)="openFeatures()">
            <ion-icon slot="icon-only" name="grid-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <div *ngIf="!loading && bookmarks.length === 0 && !error" class="ion-text-center ion-padding empty-state">
        <ion-icon name="bookmark-outline" size="large" color="medium"></ion-icon>
        <p>No bookmarks yet.</p>
        <p class="hint-text">Bookmark readings from the reading detail page.</p>
      </div>

      <ion-list *ngIf="bookmarks.length > 0">
        <ion-item-sliding *ngFor="let b of bookmarks">
          <ion-item button (click)="goToReading(b.readingId)">
            <ion-label>
              <h2>{{ b.bibleReading }}</h2>
              <p>{{ formatDate(b.month, b.day) }}</p>
            </ion-label>
            <ion-icon slot="end" name="bookmark" color="warning"></ion-icon>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" (click)="removeBookmark(b)">
              <ion-icon slot="icon-only" name="trash"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .empty-state { margin-top: 40px; }
    .empty-state ion-icon { margin-bottom: 16px; }
    .hint-text { font-size: 14px; color: var(--ion-color-medium); margin-top: 8px; }
    .error-message { color: var(--ion-color-danger); }
  `]
})
class BookmarksPage {
  private router = inject(Router);
  private bookmarkService = inject(BookmarkService);
  private actionSheetCtrl = inject(ActionSheetController);

  bookmarks: BookmarkDto[] = [];
  loading = false;
  error?: string;

  async openFeatures(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Features',
      buttons: [
        { text: 'Search', icon: 'search-outline', handler: () => this.router.navigate(['/search']) },
        { text: 'Progress', icon: 'trending-up-outline', handler: () => this.router.navigate(['/progress']) },
        { text: 'Calendar', icon: 'calendar-outline', handler: () => this.router.navigate(['/calendar']) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

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
