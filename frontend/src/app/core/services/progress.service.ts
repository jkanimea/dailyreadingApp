import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { ProgressDto } from '../models/progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private api = inject(ApiService);


  getSeriesProgress(seriesId: number): Observable<ProgressDto[]> {
    return this.api.get<ProgressDto[]>(`/progress/series/${seriesId}`);
  }

  getStreak(seriesId: number): Observable<number> {
    return this.api.get<number>(`/progress/series/${seriesId}/streak`);
  }

  getCompletionPercentage(seriesId: number): Observable<number> {
    return this.api.get<number>(`/progress/series/${seriesId}/percentage`);
  }

  getCompletedCount(seriesId: number): Observable<number> {
    return this.api.get<number>(`/progress/series/${seriesId}/completed-count`);
  }

  markComplete(readingId: number): Observable<ProgressDto> {
    return this.api.post<ProgressDto>(`/progress/${readingId}/complete`);
  }

  unmarkComplete(readingId: number): Observable<void> {
    return this.api.delete<void>(`/progress/${readingId}/complete`);
  }
}
