import { NgModule, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes, ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BibleService } from '../../core/services/bible.service';
import { BibleLookupResponse } from '../../core/models/bible.model';
import { LoggingService } from '../../core/services/logging.service';
import { firstValueFrom } from 'rxjs';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/today" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <ion-icon name="book-outline" class="header-icon"></ion-icon>
            <span>Bible Verses</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading) {
        <div style="padding: 8px;">
          <div class="skeleton-shimmer" style="width:60%;height:16px;border-radius:8px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:120px;border-radius:12px;margin-bottom:12px;"></div>
          <div class="skeleton-shimmer" style="width:100%;height:80px;border-radius:12px;margin-bottom:12px;"></div>
        </div>
      }

      @if (error) {
        <div class="error-state">
          <ion-icon name="cloud-offline-outline" size="large" color="medium"></ion-icon>
          <p>{{ error }}</p>
        </div>
      }

      @if (result && !loading) {
        <div class="ref-header">{{ result.reference }}</div>

        @for (g of result.groups; track $index) {
          <div class="verse-card">
            <div class="verse-ref">{{ g.reference }}</div>
            @for (v of g.verses; track $index) {
              <div class="verse-text">{{ v.verse }} {{ v.text }}</div>
            }
          </div>
        }

        @if (result.groups.length === 0) {
          <div class="error-state">
            <ion-icon name="alert-circle-outline" size="large" color="medium"></ion-icon>
            <p>No verses found for this reference.</p>
          </div>
        }
      }
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .header-title { display: flex; align-items: center; gap: 8px; }
    .header-icon { font-size: 18px; flex-shrink: 0; }
    .ref-header {
      font-size: 15px;
      font-weight: 700;
      color: var(--ion-color-primary);
      padding: 16px 0 12px;
      border-bottom: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
      margin-bottom: 16px;
    }
    .verse-card {
      background: var(--card-bg, var(--ion-background-color));
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 10px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      border: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.06));
    }
    .verse-ref {
      font-size: 12px;
      font-weight: 700;
      color: var(--ion-color-primary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .verse-text {
      font-size: var(--reading-font-size, 15px);
      line-height: 1.7;
      color: var(--ion-text-color);
    }
    .verse-text + .verse-text {
      margin-top: 8px;
    }
  `]
})
export class BibleVersesPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bibleService = inject(BibleService);
  private loggingService = inject(LoggingService);

  result?: BibleLookupResponse;
  loading = false;
  error?: string;

  async ionViewWillEnter(): Promise<void> {
    const refs = this.route.snapshot.queryParamMap.get('refs');
    if (!refs) {
      this.error = 'No Bible reference provided.';
      return;
    }
    await this.loadVerses(decodeURIComponent(refs));
  }

  private async loadVerses(refs: string): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      this.result = await firstValueFrom(this.bibleService.lookupVerses(refs));
    } catch (e: unknown) {
      this.loggingService.error('BibleVersesPage', 'loadVerses', e instanceof Error ? e.message : String(e));
      this.error = 'Failed to load Bible verses. Make sure the API is running.';
    } finally {
      this.loading = false;
    }
  }
}

const routes: Routes = [{ path: '', component: BibleVersesPage }];

@NgModule({
  declarations: [BibleVersesPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule]
})
export class BibleVersesModule {}
