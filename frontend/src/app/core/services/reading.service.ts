import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DailyReading, ReadingDetail, ReadingSummary } from '../models/reading.model';
import { HttpParams } from '@angular/common/http';
import { SeriesMode } from './preferences.service';
import { dayNumberSinceLocal } from '../local-date';

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

  getByDay(seriesId: number, dayNumber: number): Observable<DailyReading> {
    return this.api.get<DailyReading>(`/reading/series/${seriesId}/day/${dayNumber}`);
  }

  getForMode(seriesId: number, mode: SeriesMode | null, startDate?: string | null, totalReadings?: number, date = new Date()): Observable<DailyReading> {
    if (mode === 'day1' && startDate) {
      return this.getByDay(seriesId, dayNumberSinceLocal(startDate, totalReadings, date));
    }
    return this.getToday(seriesId, date.getMonth() + 1, date.getDate());
  }

  getByMonth(seriesId: number, month: number): Observable<DailyReading[]> {
    return this.api.get<DailyReading[]>(`/reading/series/${seriesId}/month/${month}`);
  }

  getFullReading(readingId: number, translation = 'KJV'): Observable<ReadingDetail> {
    const params = new HttpParams().set('translation', translation);
    return this.api.get<ReadingDetail>(`/reading/${readingId}/full`, params);
  }

  getSummary(readingId: number): Observable<ReadingSummary> {
    return this.api.get<ReadingSummary>(`/reading/${readingId}/summary`);
  }

  seedBible(): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/reading/seed-bible');
  }
}
