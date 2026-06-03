import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progress-container">
      <div class="progress-fill" [style.width.%]="percentage"></div>
    </div>
    @if (showLabel) {
      <p class="progress-label">{{ percentage }}% complete</p>
    }
  `,
  styles: [`
    .progress-container { width: 100%; height: 8px; background: var(--ion-color-light); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--ion-color-primary); border-radius: 4px; transition: width 0.3s; }
    .progress-label { font-size: 12px; margin-top: 4px; text-align: center; }
  `]
})
export class ProgressBarComponent {
  @Input() percentage = 0;
  @Input() showLabel = true;
}
