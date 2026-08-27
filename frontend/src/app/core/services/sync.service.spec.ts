import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { SyncService, SyncQueueItem } from './sync.service';
import { OfflineStorageService } from './offline-storage.service';
import { ProgressService } from './progress.service';
import { BookmarkService } from './bookmark.service';

describe('SyncService', () => {
  let service: SyncService;
  let storage: any;
  let progress: any;
  let bookmark: any;

  beforeEach(() => {
    storage = {
      get: jest.fn<any, any[]>(),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      waitForReady: jest.fn().mockResolvedValue(undefined),
      ready$: new BehaviorSubject(true)
    };

    progress = {
      markComplete: jest.fn().mockReturnValue(of({})),
      unmarkComplete: jest.fn().mockReturnValue(of(undefined))
    };

    bookmark = {
      addBookmark: jest.fn().mockReturnValue(of({})),
      removeBookmark: jest.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SyncService,
        { provide: OfflineStorageService, useValue: storage },
        { provide: ProgressService, useValue: progress },
        { provide: BookmarkService, useValue: bookmark }
      ]
    });

    service = TestBed.inject(SyncService);
  });

  it('should start with navigator.onLine', () => {
    expect(service).toBeDefined();
  });

  it('enqueue should store item in offline storage', async () => {
    storage.get.mockResolvedValue([]);
    await service.enqueue({ action: 'markComplete', readingId: 1 });

    expect(storage.set).toHaveBeenCalled();
    const setCall = storage.set.mock.calls[0];
    expect(setCall[0]).toBe('sync_queue');
    const queue: SyncQueueItem[] = setCall[1];
    expect(queue.length).toBe(1);
    expect(queue[0].action).toBe('markComplete');
    expect(queue[0].readingId).toBe(1);
  });

  it('getQueuedCount should return queue length', async () => {
    storage.get.mockResolvedValue([
      { id: '1', action: 'markComplete', readingId: 1, timestamp: 100 }
    ]);

    const count = await service.getQueuedCount();
    expect(count).toBe(1);
  });

  it('getQueuedCount should return 0 for empty queue', async () => {
    storage.get.mockResolvedValue([]);
    const count = await service.getQueuedCount();
    expect(count).toBe(0);
  });

  it('should not crash when processing empty queue', async () => {
    storage.get.mockResolvedValue([]);
    await (service as any).processQueue();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should process queued items and remove them on success', async () => {
    let queue: SyncQueueItem[] = [
      { id: '1', action: 'markComplete', readingId: 1, timestamp: 100 },
      { id: '2', action: 'unmarkComplete', readingId: 2, timestamp: 200 }
    ];
    storage.get.mockImplementation(() => Promise.resolve(queue));
    storage.set.mockImplementation((_key: string, data: SyncQueueItem[]) => {
      queue = data;
      return Promise.resolve();
    });

    await (service as any).processQueue();

    expect(progress.markComplete).toHaveBeenCalledWith(1);
    expect(progress.unmarkComplete).toHaveBeenCalledWith(2);
    expect(queue.length).toBe(0);
  });

  it('should dispatch each action to the matching service method', async () => {
    let queue: SyncQueueItem[] = [
      { id: '1', action: 'markComplete', readingId: 1, timestamp: 100 },
      { id: '2', action: 'unmarkComplete', readingId: 2, timestamp: 200 },
      { id: '3', action: 'addBookmark', readingId: 3, timestamp: 300 },
      { id: '4', action: 'removeBookmark', readingId: 4, timestamp: 400 }
    ];
    storage.get.mockImplementation(() => Promise.resolve(queue));
    storage.set.mockImplementation((_key: string, data: SyncQueueItem[]) => {
      queue = data;
      return Promise.resolve();
    });

    await (service as any).processQueue();

    expect(progress.markComplete).toHaveBeenCalledWith(1);
    expect(progress.unmarkComplete).toHaveBeenCalledWith(2);
    expect(bookmark.addBookmark).toHaveBeenCalledWith(3);
    expect(bookmark.removeBookmark).toHaveBeenCalledWith(4);
    expect(queue.length).toBe(0);
  });
});
