import { TestBed } from '@angular/core/testing';
import { BookmarkService } from './bookmark.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('BookmarkService', () => {
  let service: BookmarkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookmarkService]
    });
    service = TestBed.inject(BookmarkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET bookmarks', () => {
    service.getAll().subscribe(b => expect(b.length).toBe(2));
    const req = httpMock.expectOne('https://localhost:5001/api/v1/bookmarks');
    expect(req.request.method).toBe('GET');
    req.flush([{}, {}]);
  });

  it('addBookmark should POST', () => {
    service.addBookmark(5).subscribe();
    const req = httpMock.expectOne('https://localhost:5001/api/v1/bookmarks/5');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('removeBookmark should DELETE', () => {
    service.removeBookmark(5).subscribe();
    const req = httpMock.expectOne('https://localhost:5001/api/v1/bookmarks/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
