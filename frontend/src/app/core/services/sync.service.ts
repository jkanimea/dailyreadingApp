import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, fromEvent, merge } from 'rxjs';
import { debounceTime, filter, concatMap } from 'rxjs/operators';
import { OfflineStorageService } from './offline-storage.service';
import { ProgressService } from './progress.service';
import { BookmarkService } from './bookmark.service';
import { firstValueFrom } from 'rxjs';

export interface SyncQueueItem {
  id: string;
  action: 'markComplete' | 'unmarkComplete' | 'addBookmark' | 'removeBookmark';
  readingId: number;
  seriesId?: number;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  readonly isOnline$ = this.isOnlineSubject.asObservable();

  private readonly syncTrigger = new Subject<void>();
  private isSyncing = false;
  private readonly SYNC_DEBOUNCE_MS = 2500;
  private readonly QUEUE_KEY = 'sync_queue';

  constructor(
    private storage: OfflineStorageService,
    private progress: ProgressService,
    private bookmark: BookmarkService,
    private zone: NgZone
  ) {
    this.zone.runOutsideAngular(() => {
      merge(
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      ).pipe(
        debounceTime(this.SYNC_DEBOUNCE_MS)
      ).subscribe(() => {
        this.zone.run(() => {
          const online = navigator.onLine;
          this.isOnlineSubject.next(online);
          if (online) {
            this.syncTrigger.next();
          }
        });
      });
    });

    this.syncTrigger.pipe(
      debounceTime(this.SYNC_DEBOUNCE_MS),
      filter(() => !this.isSyncing),
      concatMap(() => this.processQueue())
    ).subscribe();
  }

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    queue.push({
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now()
    });
    await this.storage.set(this.QUEUE_KEY, queue);

    if (navigator.onLine) {
      this.syncTrigger.next();
    }
  }

  getQueuedCount(): Promise<number> {
    return this.getQueue().then(q => q.length);
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      for (const item of queue) {
        try {
          await this.processItem(item);
          await this.removeFromQueue(item.id);
        } catch {
          if (!navigator.onLine) break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    switch (item.action) {
      case 'markComplete':
        await firstValueFrom(this.progress.markComplete(item.readingId));
        break;
      case 'unmarkComplete':
        await firstValueFrom(this.progress.unmarkComplete(item.readingId));
        break;
      case 'addBookmark':
        await firstValueFrom(this.bookmark.addBookmark(item.readingId));
        break;
      case 'removeBookmark':
        await firstValueFrom(this.bookmark.removeBookmark(item.readingId));
        break;
    }
  }

  private async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(i => i.id !== id);
    await this.storage.set(this.QUEUE_KEY, filtered);
  }

  private async getQueue(): Promise<SyncQueueItem[]> {
    return (await this.storage.get<SyncQueueItem[]>(this.QUEUE_KEY)) ?? [];
  }
}
