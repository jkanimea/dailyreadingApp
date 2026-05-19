import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PagedResult } from '../models/paged-result.model';
import { SearchResultDto } from '../models/search-result.model';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private api: ApiService) {}

  search(query: string, seriesId = 1, page = 1, pageSize = 20): Observable<PagedResult<SearchResultDto>> {
    const params = new HttpParams()
      .set('q', query)
      .set('seriesId', seriesId.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.api.get<PagedResult<SearchResultDto>>('/search', params);
  }

  searchAll(query: string, page = 1, pageSize = 20): Observable<PagedResult<SearchResultDto>> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.api.get<PagedResult<SearchResultDto>>('/search/all', params);
  }
}
