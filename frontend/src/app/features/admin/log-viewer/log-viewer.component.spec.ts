import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogViewerComponent } from './log-viewer.component';
import { AdminLogService } from '../../../core/services/admin-log.service';
import { of, throwError } from 'rxjs';
import { PagedLogsResult, AppLogDto } from '../../../core/models/log.model';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

const makeLog = (override: Partial<AppLogDto> = {}): AppLogDto => ({
  id: 1,
  level: 'info',
  message: 'Test log',
  origin: 'client',
  createdAt: '2026-01-01T00:00:00Z',
  ...override
});

const makePagedResult = (items: AppLogDto[] = [], total = 0): PagedLogsResult => ({
  items,
  totalCount: total,
  page: 1,
  pageSize: 50,
  totalPages: Math.ceil(total / 50)
});

describe('LogViewerComponent', () => {
  let component: LogViewerComponent;
  let fixture: ComponentFixture<LogViewerComponent>;
  let adminLogService: jest.Mocked<AdminLogService>;

  beforeEach(async () => {
    adminLogService = {
      getLogs: jest.fn().mockReturnValue(of(makePagedResult())),
      deleteOldLogs: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      declarations: [LogViewerComponent],
      imports: [CommonModule, FormsModule, IonicModule.forRoot()],
      providers: [{ provide: AdminLogService, useValue: adminLogService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LogViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getLogs on init', () => {
    expect(adminLogService.getLogs).toHaveBeenCalledTimes(1);
  });

  it('should populate logs on successful load', () => {
    const logs = [makeLog({ id: 1, level: 'error' }), makeLog({ id: 2, level: 'info' })];
    adminLogService.getLogs.mockReturnValue(of(makePagedResult(logs, 2)));

    component.loadLogs();

    expect(component.logs).toHaveLength(2);
    expect(component.totalCount).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('should set errorMessage on failed load', () => {
    adminLogService.getLogs.mockReturnValue(throwError(() => new Error('Forbidden')));

    component.loadLogs();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should reset page to 1 when applying filter', () => {
    component.query = { page: 5, pageSize: 50, level: 'error' };
    adminLogService.getLogs.mockReturnValue(of(makePagedResult()));

    component.applyFilter();

    expect(component.query.page).toBe(1);
    expect(adminLogService.getLogs).toHaveBeenCalled();
  });

  it('should reset all query fields when clearing filter', () => {
    component.query = { page: 3, pageSize: 25, level: 'error', origin: 'server' };
    adminLogService.getLogs.mockReturnValue(of(makePagedResult()));

    component.clearFilter();

    expect(component.query).toEqual({ page: 1, pageSize: 50 });
  });

  it('should not navigate past last page', () => {
    component.totalPages = 3;
    component.query = { page: 3 };
    adminLogService.getLogs.mockReturnValue(of(makePagedResult()));

    component.goToPage(4);

    expect(adminLogService.getLogs).not.toHaveBeenCalledTimes(2);
  });

  it('should not navigate before first page', () => {
    component.totalPages = 3;
    component.query = { page: 1 };
    adminLogService.getLogs.mockReturnValue(of(makePagedResult()));

    component.goToPage(0);

    expect(adminLogService.getLogs).not.toHaveBeenCalledTimes(2);
  });

  it('should call deleteOldLogs and refresh on success', () => {
    adminLogService.deleteOldLogs.mockReturnValue(
      of({ deleted: 5, message: 'Deleted 5 log entries older than 6 months.' })
    );
    adminLogService.getLogs.mockReturnValue(of(makePagedResult()));

    component.deleteOldLogs();

    expect(adminLogService.deleteOldLogs).toHaveBeenCalled();
    expect(component.deleteMessage).toContain('5');
    expect(component.deleteLoading).toBe(false);
  });

  it('should set error message when deleteOldLogs fails', () => {
    adminLogService.deleteOldLogs.mockReturnValue(throwError(() => new Error('403')));

    component.deleteOldLogs();

    expect(component.deleteMessage).toBeTruthy();
    expect(component.deleteLoading).toBe(false);
  });

  describe('getLevelColor', () => {
    it('should return danger for error', () => {
      expect(component.getLevelColor('error')).toBe('danger');
    });

    it('should return warning for warn', () => {
      expect(component.getLevelColor('warn')).toBe('warning');
    });

    it('should return medium for debug', () => {
      expect(component.getLevelColor('debug')).toBe('medium');
    });

    it('should return primary for info', () => {
      expect(component.getLevelColor('info')).toBe('primary');
    });
  });
});
