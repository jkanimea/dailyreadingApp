import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BookmarkDto } from '../models/bookmark.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private api = inject(ApiService);


  getAll(): Observable<BookmarkDto[]> {
    return this.api.get<BookmarkDto[]>('/bookmarks');
  }

  addBookmark(readingId: number): Observable<BookmarkDto> {
    return this.api.post<BookmarkDto>(`/bookmarks/${readingId}`);
  }

  removeBookmark(readingId: number): Observable<void> {
    return this.api.delete<void>(`/bookmarks/${readingId}`);
  }
}
