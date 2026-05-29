import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminLogService } from './admin-log.service';
import { PagedLogsResult } from '../models/log.model';

jest.mock('../../../environments/environment', () => ({
  environment: { apiUrl: 'http://localhost:5000/api/v1', bypassAuth: false }
}));

describe('AdminLogService', () => {
  let service: AdminLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminLogService]
    });
    service = TestBed.inject(AdminLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getLogs', () => {
    it('should GET logs with no params when query is empty', () => {
      const mockResult: PagedLogsResult = {
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0
      };

      service.getLogs().subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      const req = httpMock.expectOne(r => r.url.includes('/logs'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResult);
    });

    it('should pass level filter as query param', () => {
      service.getLogs({ level: 'error' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/logs'));
      expect(req.request.params.get('level')).toBe('error');
      req.flush({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 });
    });

    it('should pass origin filter as query param', () => {
      service.getLogs({ origin: 'server' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/logs'));
      expect(req.request.params.get('origin')).toBe('server');
      req.flush({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 });
    });

    it('should pass page and pageSize params', () => {
      service.getLogs({ page: 2, pageSize: 25 }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/logs'));
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('25');
      req.flush({ items: [], totalCount: 0, page: 2, pageSize: 25, totalPages: 0 });
    });

    it('should return paged logs result', () => {
      const mockResult: PagedLogsResult = {
        items: [{ id: 1, level: 'info', message: 'test', origin: 'client', createdAt: '2026-01-01T00:00:00Z' }],
        totalCount: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1
      };

      service.getLogs().subscribe(result => {
        expect(result.items.length).toBe(1);
        expect(result.totalCount).toBe(1);
      });

      const req = httpMock.expectOne(r => r.url.includes('/logs'));
      req.flush(mockResult);
    });
  });

  describe('deleteOldLogs', () => {
    it('should DELETE to /logs/old endpoint', () => {
      service.deleteOldLogs().subscribe(res => {
        expect(res.deleted).toBe(5);
      });

      const req = httpMock.expectOne(r => r.url.includes('/logs/old'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ deleted: 5, message: 'Deleted 5 log entries older than 6 months.' });
    });

    it('should return deleted count and message', () => {
      let response: any;
      service.deleteOldLogs().subscribe(res => (response = res));

      const req = httpMock.expectOne(r => r.url.includes('/logs/old'));
      req.flush({ deleted: 10, message: 'Deleted 10 log entries older than 6 months.' });

      expect(response.deleted).toBe(10);
      expect(response.message).toContain('10');
    });
  });
});
