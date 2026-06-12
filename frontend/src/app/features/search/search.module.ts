import { NgModule, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/services/search.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SearchResultDto } from '../../core/models/search-result.model';
import { PagedResult } from '../../core/models/paged-result.model';
import { LoggingService } from '../../core/services/logging.service';
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
          <ion-button (click)="goToSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <app-avatar-btn></app-avatar-btn>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar
        [(ngModel)]="query"
        placeholder="Search readings..."
        debounce="400"
        (ionInput)="onQueryChange($event)"
        (ionClear)="onClear()"
      ></ion-searchbar>

      @if (loading()) {
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:100%;height:100px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:100px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:100px;border-radius:12px;"></div>
        </div>
      }

      @if (error()) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error() }}</p>
        </div>
      }

      @if (!loading() && query.length > 0 && query.length < 2) {
        <div class="empty-state" style="padding: 32px 24px;">
          <ion-icon name="search-outline" size="large" color="medium"></ion-icon>
          <p class="empty-subtitle">Enter at least 2 characters to search.</p>
        </div>
      }

      @if (!loading() && query.length >= 2 && results().length === 0 && !error()) {
        <div class="empty-state">
          <ion-icon name="search-outline" size="large" color="medium"></ion-icon>
          <p class="empty-title">No results found</p>
          <p class="empty-subtitle">Try different keywords or browse the calendar instead.</p>
        </div>
      }

      @if (results().length > 0) {
        <div class="search-results">
          @for (r of results(); track r.id) {
            <div class="result-card" (click)="goToReading(r.id)">
              <div class="result-header">
                <span class="result-meta">{{ r.seriesName }} — {{ formatDate(r.month, r.day) }}</span>
                <h3 class="result-title">{{ r.bibleReading }}</h3>
              </div>
              @if (r.fullTextPrimary) {
                <p class="result-preview">{{ r.fullTextPrimary | slice:0:200 }}...</p>
              }
            </div>
          }
        </div>
      }

      @if (totalPages() > 1) {
        <div class="pagination">
          <ion-button fill="clear" size="small" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
            <ion-icon name="chevron-back"></ion-icon>
          </ion-button>
          <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
          <ion-button fill="clear" size="small" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">
            <ion-icon name="chevron-forward"></ion-icon>
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .search-results {
      padding: 0;
    }
    .result-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 14px;
      margin-bottom: 12px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .result-card:active {
      transform: scale(0.99);
    }
    .result-header {
      margin-bottom: 8px;
    }
    .result-meta {
      font-size: 12px;
      color: var(--ion-color-medium);
      font-weight: 500;
    }
    .result-title {
      font-size: 16px;
      font-weight: 700;
      margin: 4px 0 0;
      color: var(--ion-text-color);
    }
    .result-preview {
      font-size: 13px;
      color: var(--ion-color-medium);
      line-height: 1.5;
      margin: 0;
      white-space: pre-line;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 0;
    }
    .page-info {
      font-size: 14px;
      color: var(--ion-color-medium);
      font-weight: 500;
    }
  `]
})
class SearchPage {
  private router = inject(Router);
  private searchService = inject(SearchService);
  private prefs = inject(PreferencesService);
  private loggingService = inject(LoggingService);

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
    } catch (e: unknown) {
      this.loggingService.error('SearchPage', 'performSearch', e);
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
