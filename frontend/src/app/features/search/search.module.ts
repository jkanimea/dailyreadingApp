import { NgModule, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/services/search.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SearchResultDto } from '../../core/models/search-result.model';
import { PagedResult } from '../../core/models/paged-result.model';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-search',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Search</ion-title>
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
      <ion-searchbar
        [(ngModel)]="query"
        placeholder="Search readings..."
        debounce="400"
        (ionInput)="onQueryChange($event)"
        (ionClear)="onClear()"
      ></ion-searchbar>

      @if (loading()) {
        <div class="ion-text-center ion-padding">
          <ion-spinner></ion-spinner>
        </div>
      }

      @if (error()) {
        <div class="ion-text-center">
          <p class="error-message">{{ error() }}</p>
        </div>
      }

      @if (!loading() && query.length > 0 && query.length < 2) {
        <div class="ion-text-center ion-padding">
          <p class="hint-text">Enter at least 2 characters to search.</p>
        </div>
      }

      @if (!loading() && query.length >= 2 && results().length === 0 && !error()) {
        <div class="ion-text-center ion-padding">
          <p>No results found.</p>
        </div>
      }

      @if (results().length > 0) {
        <ion-list>
          @for (r of results(); track r.id) {
            <ion-card button (click)="goToReading(r.id)" class="result-card">
              <ion-card-header>
                <ion-card-subtitle>{{ r.seriesName }} — {{ formatDate(r.month, r.day) }}</ion-card-subtitle>
                <ion-card-title>{{ r.bibleReading }}</ion-card-title>
              </ion-card-header>
              @if (r.fullTextPrimary) {
                <ion-card-content>
                  <p class="preview-text">{{ r.fullTextPrimary | slice:0:200 }}...</p>
                </ion-card-content>
              }
            </ion-card>
          }
        </ion-list>
      }

      @if (totalPages() > 1) {
        <ion-row class="ion-justify-content-center ion-padding">
          <ion-col size="auto">
            <ion-button fill="clear" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
              <ion-icon name="chevron-back"></ion-icon>
            </ion-button>
            <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
            <ion-button fill="clear" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">
              <ion-icon name="chevron-forward"></ion-icon>
            </ion-button>
          </ion-col>
        </ion-row>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .result-card { margin-bottom: 12px; border-radius: 10px; }
    .preview-text { font-size: 13px; color: var(--ion-color-medium); white-space: pre-line; }
    .error-message { color: var(--ion-color-danger); }
    .hint-text { color: var(--ion-color-medium); font-size: 14px; }
    .page-info { font-size: 14px; padding: 0 12px; }
  `]
})
class SearchPage {
  private router = inject(Router);
  private searchService = inject(SearchService);
  private prefs = inject(PreferencesService);
  private actionSheetCtrl = inject(ActionSheetController);

  query = '';
  readonly results = signal<SearchResultDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  pageSize = 20;
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(q => this.performSearch(q));
  }

  async openFeatures(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Features',
      buttons: [
        { text: 'Progress', icon: 'trending-up-outline', handler: () => this.router.navigate(['/progress']) },
        { text: 'Bookmarks', icon: 'bookmark-outline', handler: () => this.router.navigate(['/bookmarks']) },
        { text: 'Calendar', icon: 'calendar-outline', handler: () => this.router.navigate(['/calendar']) },
        { text: 'Journal', icon: 'journal-outline', handler: () => this.router.navigate(['/journal']) },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  onQueryChange(event: CustomEvent): void {
    const val = (event.detail.value ?? '').trim();
    this.query = val;
    this.page.set(1);
    if (val.length >= 2) {
      this.searchSubject.next(val);
    } else {
      this.results.set([]);
      this.totalPages.set(0);
    }
  }

  onClear(): void {
    this.query = '';
    this.results.set([]);
    this.totalPages.set(0);
    this.error.set(undefined);
  }

  private async performSearch(q: string): Promise<void> {
    this.loading.set(true);
    this.error.set(undefined);
    try {
      const seriesId = this.prefs.getSeriesId();
      const result: PagedResult<SearchResultDto> = await firstValueFrom(
        this.searchService.search(q, seriesId, this.page(), this.pageSize)
      );
      this.results.set(result.items);
      this.totalPages.set(result.totalPages);
    } catch {
      this.error.set('Search failed. Make sure the API is running.');
    } finally {
      this.loading.set(false);
    }
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.performSearch(this.query);
  }

  goToReading(id: number): void {
    this.router.navigate(['/reading', id]);
  }

  formatDate(month: number, day: number): string {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[month - 1] ?? ''} ${day}`;
  }
}

const routes: Routes = [{ path: '', component: SearchPage }];

@NgModule({
  declarations: [SearchPage],
  imports: [CommonModule, IonicModule, FormsModule, RouterModule.forChild(routes), SharedModule]
})
export class SearchModule {}
