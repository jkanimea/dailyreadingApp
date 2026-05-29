import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppLogQuery, PagedLogsResult } from '../models/log.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminLogService {
  private readonly apiUrl = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) {}

  getLogs(query: AppLogQuery = {}): Observable<PagedLogsResult> {
    let params = new HttpParams();
    if (query.level) params = params.set('level', query.level);
    if (query.origin) params = params.set('origin', query.origin);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.pageSize != null) params = params.set('pageSize', String(query.pageSize));
    return this.http.get<PagedLogsResult>(this.apiUrl, { params });
  }

  deleteOldLogs(): Observable<{ deleted: number; message: string }> {
    return this.http.delete<{ deleted: number; message: string }>(`${this.apiUrl}/old`);
  }
}
