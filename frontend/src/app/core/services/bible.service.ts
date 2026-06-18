import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BibleLookupResponse } from '../models/bible.model';

@Injectable({ providedIn: 'root' })
export class BibleService {
  private api = inject(ApiService);

  lookupVerses(refs: string, translation = 'KJV'): Observable<BibleLookupResponse> {
    const params = new HttpParams().set('refs', refs).set('translation', translation);
    return this.api.get<BibleLookupResponse>('/bible/lookup', params);
  }
}
