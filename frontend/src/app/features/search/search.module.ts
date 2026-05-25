import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, Router } from '@angular/router';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/services/search.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { SearchResultDto } from '../../core/models/search-result.model';
import { PagedResult } from '../../core/models/paged-result.model';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Search</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToCalendar()">
            <ion-icon slot="icon-only" name="calendar-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToProgress()">
            <ion-icon slot="icon-only" name="trending-up-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToBookmarks()">
            <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
          </ion-button>
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

      <div *ngIf="loading" class="ion-text-center ion-padding">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <div *ngIf="!loading && query.length > 0 && query.length < 2" class="ion-text-center ion-padding">
        <p class="hint-text">Enter at least 2 characters to search.</p>
      </div>

      <div *ngIf="!loading && query.length >= 2 && results.length === 0 && !error" class="ion-text-center ion-padding">
        <p>No results found.</p>
      </div>

      <ion-list *ngIf="results.length > 0">
        <ion-card *ngFor="let r of results" button (click)="goToReading(r.id)" class="result-card">
          <ion-card-header>
            <ion-card-subtitle>{{ r.seriesName }} — {{ formatDate(r.month, r.day) }}</ion-card-subtitle>
            <ion-card-title>{{ r.bibleReading }}</ion-card-title>
          </ion-card-header>
          <ion-card-content *ngIf="r.fullTextPrimary">
            <p class="preview-text">{{ r.fullTextPrimary | slice:0:200 }}...</p>
          </ion-card-content>
        </ion-card>
      </ion-list>

      <ion-row *ngIf="totalPages > 1" class="ion-justify-content-center ion-padding">
        <ion-col size="auto">
          <ion-button fill="clear" [disabled]="page <= 1" (click)="goToPage(page - 1)">
            <ion-icon name="chevron-back"></ion-icon>
          </ion-button>
          <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
          <ion-button fill="clear" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">
            <ion-icon name="chevron-forward"></ion-icon>
          </ion-button>
        </ion-col>
      </ion-row>
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
  query = '';
  results: SearchResultDto[] = [];
  loading = false;
  error?: string;
  page = 1;
  pageSize = 20;
  totalPages = 0;
  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private searchService: SearchService,
    private prefs: PreferencesService
  ) {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(q => this.performSearch(q));
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  goToProgress(): void {
    this.router.navigate(['/progress']);
  }

  goToBookmarks(): void {
    this.router.navigate(['/bookmarks']);
  }

  onQueryChange(event: CustomEvent): void {
    const val = (event.detail.value ?? '').trim();
    this.query = val;
    this.page = 1;
    if (val.length >= 2) {
      this.searchSubject.next(val);
    } else {
      this.results = [];
      this.totalPages = 0;
    }
  }

  onClear(): void {
    this.query = '';
    this.results = [];
    this.totalPages = 0;
    this.error = undefined;
  }

  private async performSearch(q: string): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const seriesId = this.prefs.getSeriesId();
      const result: PagedResult<SearchResultDto> = await firstValueFrom(
        this.searchService.search(q, seriesId, this.page, this.pageSize)
      );
      this.results = result.items;
      this.totalPages = result.totalPages;
    } catch {
      this.error = 'Search failed. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }

  goToPage(p: number): void {
    this.page = p;
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
  imports: [CommonModule, IonicModule, FormsModule, RouterModule.forChild(routes)]
})
export class SearchModule {}
