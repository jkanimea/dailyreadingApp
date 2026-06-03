import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-markdown-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="markdown-content" [innerHTML]="content"></div>
  `,
  styles: [`
    .markdown-content { line-height: 1.6; white-space: pre-wrap; }
    .markdown-content p { margin-bottom: 8px; }
  `]
})
export class MarkdownViewerComponent {
  @Input() content = '';
}
