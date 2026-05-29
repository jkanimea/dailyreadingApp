import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  exception?: string;
  timestamp?: Date;
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private buffer: LogEntry[] = [];
  private flushing = false;
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl;
  }

  log(level: LogEntry['level'], source: string, message: string, exception?: string): void {
    const entry: LogEntry = { level, source, message, exception, timestamp: new Date() };
    this.buffer.push(entry);

    if (!this.flushing) {
      this.flush();
    }
  }

  info(source: string, message: string): void {
    this.log('info', source, message);
  }

  warn(source: string, message: string): void {
    this.log('warn', source, message);
  }

  error(source: string, message: string, exception?: string): void {
    this.log('error', source, message, exception);
  }

  debug(source: string, message: string): void {
    this.log('debug', source, message);
  }

  private flush(): void {
    this.flushing = true;
    const entries = this.buffer.splice(0);
    if (entries.length === 0) {
      this.flushing = false;
      return;
    }

    this.http.post(`${this.apiUrl}/logs`, entries).subscribe({
      next: () => {
        if (this.buffer.length > 0) {
          this.flush();
        } else {
          this.flushing = false;
        }
      },
      error: () => {
        this.flushing = false;
      }
    });
  }
}
