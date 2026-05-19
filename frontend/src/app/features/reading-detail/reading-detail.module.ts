import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';
import { BaseReadingPageComponent } from '../base/base-reading-page-component';
import { ReadingService } from '../../core/services/reading.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reading-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/today"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ reading?.seriesName ?? 'Reading' }}</ion-title>
      </ion-toolbar>
      <ion-toolbar *ngIf="detail?.fullTextSecondary">
        <ion-segment [value]="selectedTab" (ionChange)="onTabChange($event)">
          <ion-segment-button value="primary">
            {{ reading?.primaryBookPageRange }}
          </ion-segment-button>
          <ion-segment-button value="secondary">
            {{ detail?.secondaryBookPageRange ?? 'Companion Book' }}
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading" class="ion-text-center">
        <ion-spinner></ion-spinner>
      </div>

      <div *ngIf="error" class="ion-text-center">
        <p class="error-message">{{ error }}</p>
      </div>

      <div *ngIf="detail && !loading">
        <div *ngIf="!detail.fullTextSecondary || selectedTab === 'primary'" [style.font-size]="'var(--app-font-size, 17px)'">
          <h2>{{ detail.primaryBookPageRange }}</h2>
          <p>{{ detail.fullTextPrimary }}</p>
        </div>

        <div *ngIf="detail.fullTextSecondary && selectedTab === 'secondary'" [style.font-size]="'var(--app-font-size, 17px)'">
          <h2>Companion: {{ detail.secondaryBookPageRange }}</h2>
          <p>{{ detail.fullTextSecondary }}</p>
        </div>
      </div>
    </ion-content>
  `,
  standalone: false
})
class ReadingDetailPage extends BaseReadingPageComponent {
  selectedTab = 'primary';

  constructor(
    private route: ActivatedRoute,
    readingService: ReadingService
  ) {
    super(readingService);
  }

  onTabChange(event: CustomEvent): void {
    this.selectedTab = event.detail.value;
  }

  protected load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadDetail(id);
    }
  }
}

const routes: Routes = [{ path: '', component: ReadingDetailPage }];

@NgModule({
  declarations: [ReadingDetailPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ReadingDetailModule {}
