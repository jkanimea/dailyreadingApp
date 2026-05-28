import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SeriesService } from './series.service';

describe('SeriesService', () => {
  let service: SeriesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SeriesService]
    });
    service = TestBed.inject(SeriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should call correct endpoint', () => {
    const mockSeries = [
      {
        id: 1, name: 'Christ The Way', shortName: 'ctw', description: 'Test',
        seriesType: 1, primaryBookId: 1,
        primaryBook: { id: 1, title: 'Desire of Ages', author: 'Ellen G. White' },
        sortOrder: 1
      },
      {
        id: 2, name: 'Christ The Church', shortName: 'ctc', description: 'Test',
        seriesType: 2, primaryBookId: 2,
        primaryBook: { id: 2, title: 'Acts of the Apostles', author: 'Ellen G. White' },
        secondaryBookId: 3,
        secondaryBook: { id: 3, title: 'The Great Controversy', author: 'Ellen G. White' },
        sortOrder: 2
      }
    ];

    service.getAll().subscribe(series => {
      expect(series.length).toBe(2);
      expect(series[0].name).toBe('Christ The Way');
      expect(series[1].secondaryBook?.title).toBe('The Great Controversy');
    });

    const req = httpMock.expectOne('/api/v1/series');
    expect(req.request.method).toBe('GET');
    req.flush(mockSeries);
  });

  it('getById should call correct endpoint', () => {
    const mockSeries = {
      id: 1, name: 'Christ The Way', shortName: 'ctw', description: 'Test',
      seriesType: 1, primaryBookId: 1,
      primaryBook: { id: 1, title: 'Desire of Ages', author: 'Ellen G. White' },
      sortOrder: 1
    };

    service.getById(1).subscribe(s => {
      expect(s.id).toBe(1);
      expect(s.primaryBook.title).toBe('Desire of Ages');
    });

    const req = httpMock.expectOne('/api/v1/series/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockSeries);
  });
});
