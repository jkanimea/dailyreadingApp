import { Component, OnInit, inject } from '@angular/core';
import { AdminLogService } from '../../../core/services/admin-log.service';
import { AppLogDto, AppLogQuery, PagedLogsResult } from '../../../core/models/log.model';

@Component({
  selector: 'app-log-viewer',
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.scss'],
  standalone: false
})
export class LogViewerComponent implements OnInit {
  private adminLogService = inject(AdminLogService);

  logs: AppLogDto[] = [];
  totalCount = 0;
  totalPages = 0;
  loading = false;
  deleteLoading = false;
  deleteMessage = '';
  errorMessage = '';

  query: AppLogQuery = {
    page: 1,
    pageSize: 50
  };

  readonly levels = ['', 'info', 'warn', 'error', 'debug'];
  readonly origins = ['', 'client', 'server'];

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminLogService.getLogs(this.query).subscribe({
      next: (result: PagedLogsResult) => {
        this.logs = result.items;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load logs. Make sure you have Admin access.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.query = { ...this.query, page: 1 };
    this.loadLogs();
  }

  clearFilter(): void {
    this.query = { page: 1, pageSize: 50 };
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.query = { ...this.query, page };
    this.loadLogs();
  }

  deleteOldLogs(): void {
    this.deleteLoading = true;
    this.deleteMessage = '';
    this.adminLogService.deleteOldLogs().subscribe({
      next: (res) => {
        this.deleteMessage = res.message;
        this.deleteLoading = false;
        this.loadLogs();
      },
      error: () => {
        this.deleteMessage = 'Failed to delete old logs.';
        this.deleteLoading = false;
      }
    });
  }

  getLevelColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'error': return 'danger';
      case 'warn': return 'warning';
      case 'debug': return 'medium';
      default: return 'primary';
    }
  }
}
