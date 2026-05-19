import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface OfflineEntry {
  key: string;
  data: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  readonly ready$ = this.readySubject.asObservable();
  private readyPromise: Promise<void>;
  private initialized = false;

  constructor() {
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.getItem('_offline_ready');
      }
    } finally {
      this.initialized = true;
      this.readySubject.next(true);
    }
  }

  async waitForReady(): Promise<void> {
    if (this.initialized) return;
    await this.readyPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.waitForReady();
    const raw = localStorage.getItem(`offline_${key}`);
    if (!raw) return null;
    const entry: OfflineEntry = JSON.parse(raw);
    return JSON.parse(entry.data) as T;
  }

  async set(key: string, data: unknown): Promise<void> {
    await this.waitForReady();
    const entry: OfflineEntry = {
      key,
      data: JSON.stringify(data),
      timestamp: Date.now()
    };
    localStorage.setItem(`offline_${key}`, JSON.stringify(entry));
  }

  async remove(key: string): Promise<void> {
    await this.waitForReady();
    localStorage.removeItem(`offline_${key}`);
  }

  async clear(): Promise<void> {
    await this.waitForReady();
    const keys = Object.keys(localStorage).filter(k => k.startsWith('offline_'));
    keys.forEach(k => localStorage.removeItem(k));
  }
}
