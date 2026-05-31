import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DailyReading, ReadingDetail, ReadingSummary } from '../models/reading.model';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private api = inject(ApiService);


  getToday(seriesId: number, month?: number, day?: number): Observable<DailyReading> {
    let params = new HttpParams();
    if (month !== undefined && day !== undefined) {
      params = params.set('month', month).set('day', day);
    }
    return this.api.get<DailyReading>(`/reading/series/${seriesId}/today`, params);
  }

  getByDate(seriesId: number, month: number, day: number): Observable<DailyReading> {
    return this.api.get<DailyReading>(`/reading/series/${seriesId}/date/${month}/${day}`);
  }

  getByMonth(seriesId: number, month: number): Observable<DailyReading[]> {
    return this.api.get<DailyReading[]>(`/reading/series/${seriesId}/month/${month}`);
  }

  getFullReading(readingId: number): Observable<ReadingDetail> {
    return this.api.get<ReadingDetail>(`/reading/${readingId}/full`);
  }

  getSummary(readingId: number): Observable<ReadingSummary> {
    return this.api.get<ReadingSummary>(`/reading/${readingId}/summary`);
  }
}
