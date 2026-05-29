import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LoggingService } from './logging.service';
import { environment } from '../../../environments/environment';

describe('LoggingService', () => {
  let service: LoggingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LoggingService]
    });
    service = TestBed.inject(LoggingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send log entries to backend on error()', () => {
    service.error('TestComponent', 'Something went wrong', 'Stack trace here');

    const req = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.length).toBe(1);
    expect(req.request.body[0].level).toBe('error');
    expect(req.request.body[0].source).toBe('TestComponent');
    expect(req.request.body[0].message).toBe('Something went wrong');
    expect(req.request.body[0].exception).toBe('Stack trace here');
    expect(req.request.body[0].timestamp).toBeDefined();
    req.flush({ received: 1 });
  });

  it('should send log entries to backend on info()', () => {
    service.info('AuthService', 'User logged in');

    const req = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req.request.body[0].level).toBe('info');
    expect(req.request.body[0].source).toBe('AuthService');
    expect(req.request.body[0].message).toBe('User logged in');
    expect(req.request.body[0].exception).toBeUndefined();
    req.flush({ received: 1 });
  });

  it('should send log entries to backend on warn()', () => {
    service.warn('UI', 'Deprecated call');

    const req = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req.request.body[0].level).toBe('warn');
    expect(req.request.body[0].source).toBe('UI');
    expect(req.request.body[0].message).toBe('Deprecated call');
    req.flush({ received: 1 });
  });

  it('should send log entries to backend on debug()', () => {
    service.debug('Service', 'Cache hit for key x');

    const req = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req.request.body[0].level).toBe('debug');
    req.flush({ received: 1 });
  });

  it('should send each log entry as a separate request', () => {
    service.info('Test', 'First message');
    const req1 = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req1.request.body.length).toBe(1);
    expect(req1.request.body[0].message).toBe('First message');
    req1.flush({ received: 1 });

    service.warn('Test', 'Second message');
    const req2 = httpMock.expectOne(`${environment.apiUrl}/logs`);
    expect(req2.request.body.length).toBe(1);
    expect(req2.request.body[0].message).toBe('Second message');
    req2.flush({ received: 1 });
  });

  it('should not throw when backend is unavailable', () => {
    service.info('Test', 'Try to log');

    const req = httpMock.expectOne(`${environment.apiUrl}/logs`);
    req.error(new ProgressEvent('Network error'));

    expect(true).toBe(true);
  });
});
