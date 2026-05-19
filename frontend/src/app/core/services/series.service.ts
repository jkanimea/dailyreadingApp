import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Series, SeriesConfig } from '../models/series.model';

@Injectable({ providedIn: 'root' })
export class SeriesService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Series[]> {
    return this.api.get<Series[]>('/series');
  }

  getById(id: number): Observable<Series> {
    return this.api.get<Series>(`/series/${id}`);
  }

  getConfig(id: number): Observable<SeriesConfig> {
    return this.api.get<SeriesConfig>(`/series/${id}/config`);
  }
}
