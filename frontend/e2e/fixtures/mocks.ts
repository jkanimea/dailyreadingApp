import type { Page, Route } from '@playwright/test';
import type { Series } from '../../src/app/core/models/series.model';
import type { ReadingDetail } from '../../src/app/core/models/reading.model';
import type { ProgressDto } from '../../src/app/core/models/progress.model';
import type { BookmarkDto } from '../../src/app/core/models/bookmark.model';
import type { JournalEntryDto } from '../../src/app/core/models/journal-entry.model';
import type { SearchResultDto } from '../../src/app/core/models/search-result.model';
import type { PagedResult } from '../../src/app/core/models/paged-result.model';
import type { AppLogDto, PagedLogsResult } from '../../src/app/core/models/log.model';
import type { UserDto } from '../../src/app/core/models/user.model';

// ── Series ────────────────────────────────────────────────────────────────────
export const MOCK_SERIES: Series[] = [
  {
    id: 1,
    name: 'Daily Devotional',
    shortName: 'Daily',
    description: 'A year-long daily reading plan.',
    seriesType: 1,
    sortOrder: 1,
    primaryBookId: 10,
    primaryBook: { id: 10, title: 'Oswald Chambers', author: 'Oswald Chambers' },
  },
  {
    id: 2,
    name: 'Youth Series',
    shortName: 'Youth',
    description: 'A series for young readers.',
    seriesType: 1,
    sortOrder: 2,
    primaryBookId: 11,
    primaryBook: { id: 11, title: 'Steps to Christ', author: 'E.G. White' },
  },
];

// ── Reading Detail ─────────────────────────────────────────────────────────────
export const MOCK_READING_DETAIL: ReadingDetail = {
  id: 101,
  seriesId: 1,
  seriesName: 'Daily Devotional',
  month: 6,
  day: 14,
  bibleReading: 'John 3:16',
  primaryBookPageRange: '170-172',
  hasSecondaryReading: false,
  sortOrder: 165,
  fullTextBible: 'John 3:16\n\nFor God so loved the world...',
  fullTextPrimary: 'Today\'s devotional text for June 14th. '.repeat(30),
};

// ── Progress ──────────────────────────────────────────────────────────────────
export const MOCK_PROGRESS: ProgressDto[] = [
  {
    readingId: 100,
    seriesId: 1,
    isCompleted: true,
    completedAt: '2026-06-13T10:00:00Z',
    month: 6,
    day: 13,
    bibleReading: 'John 3:15',
    notes: 'Great reading yesterday.',
  },
];

// ── Bookmarks ─────────────────────────────────────────────────────────────────
export const MOCK_BOOKMARKS: BookmarkDto[] = [
  {
    id: 1,
    readingId: 100,
    seriesId: 1,
    bookmarkedAt: '2026-06-13T08:00:00Z',
    month: 6,
    day: 13,
    bibleReading: 'John 3:15',
  },
];

// ── Journal ───────────────────────────────────────────────────────────────────
export const MOCK_JOURNAL: JournalEntryDto[] = [
  {
    readingId: 100,
    seriesId: 1,
    seriesName: 'Daily Devotional',
    month: 6,
    day: 13,
    bibleReading: 'John 3:15',
    primaryBookPageRange: '168-170',
    isCompleted: true,
    completedAt: '2026-06-13T10:00:00Z',
    notes: 'Great reading yesterday.',
  },
  {
    readingId: 99,
    seriesId: 1,
    seriesName: 'Daily Devotional',
    month: 6,
    day: 12,
    bibleReading: 'John 3:14',
    primaryBookPageRange: '166-168',
    isCompleted: true,
    completedAt: '2026-06-12T10:00:00Z',
    notes: 'Reflections on faith.',
  },
];

// ── Search ────────────────────────────────────────────────────────────────────
export const MOCK_SEARCH_RESULTS: PagedResult<SearchResultDto> = {
  items: [
    {
      id: 101,
      seriesId: 1,
      seriesName: 'Daily Devotional',
      month: 6,
      day: 14,
      bibleReading: 'John 3:16',
      fullTextPrimary: 'For God so loved the world that he gave his only Son.',
      sortOrder: 165,
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

export const MOCK_SEARCH_EMPTY: PagedResult<SearchResultDto> = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

// ── Admin Logs ────────────────────────────────────────────────────────────────
export const MOCK_LOGS: PagedLogsResult = {
  items: [
    {
      id: 1051,
      level: 'error',
      message: 'HTTP 401 GET /api/v1/series/1',
      source: 'AuthInterceptor',
      origin: 'client',
      createdAt: '2026-06-13T21:01:57Z',
    } as AppLogDto,
    {
      id: 1050,
      level: 'warn',
      message: 'Summarize failed: AI key not configured',
      source: 'ProgressController',
      origin: 'server',
      createdAt: '2026-06-13T20:00:00Z',
    } as AppLogDto,
  ],
  totalCount: 2,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

export const MOCK_LOGS_EMPTY: PagedLogsResult = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const MOCK_USER: UserDto = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  provider: 'google',
  selectedSeriesId: 1,
  role: 'User',
};

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

export async function seedAuthToken(page: Page): Promise<void> {
  const jwt = makeFakeJwt({
    nameid: '1',
    email: 'test@example.com',
    unique_name: 'Test User',
    provider: 'google',
    role: 'User',
  });
  await page.evaluate((token) => {
    localStorage.setItem('encounter_access_token', token);
    localStorage.setItem('encounter_refresh_token', 'fake-refresh-token');
  }, jwt);
}

export async function seedGuestToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('encounter_access_token', 'guest-token-12345');
    localStorage.setItem('encounter_refresh_token', 'guest-refresh-12345');
  });
}

// ── Route registration helper ─────────────────────────────────────────────────
export async function mockAllRoutes(page: Page): Promise<void> {
  // Block external SDKs that 404 in CI (gap #6)
  await page.route('https://accounts.google.com/**', (r: Route) => r.abort());
  await page.route('https://connect.facebook.net/**', (r: Route) => r.abort());

  // Auth
  await page.route('**/api/v1/auth/me', (r: Route) =>
    r.fulfill({ json: MOCK_USER })
  );
  await page.route('**/api/v1/auth/google', (r: Route) => {
    if (r.request().method() !== 'POST') return r.continue();
    const fakeJwt = makeFakeJwt({ nameid: '1', email: 'test@example.com', unique_name: 'Test User', provider: 'google', role: 'User' });
    return r.fulfill({ json: { accessToken: fakeJwt, refreshToken: 'fake-refresh-token', expiresIn: 3600, user: MOCK_USER } });
  });
  await page.route('**/api/v1/auth/facebook', (r: Route) => {
    if (r.request().method() !== 'POST') return r.continue();
    const fakeJwt = makeFakeJwt({ nameid: '1', email: 'test@example.com', unique_name: 'Test User', provider: 'facebook', role: 'User' });
    return r.fulfill({ json: { accessToken: fakeJwt, refreshToken: 'fake-refresh-token', expiresIn: 3600, user: MOCK_USER } });
  });

  // Series
  await page.route('**/api/v1/series', (r: Route) =>
    r.fulfill({ json: MOCK_SERIES })
  );
  await page.route('**/api/v1/series/1', (r: Route) =>
    r.fulfill({ json: MOCK_SERIES[0] })
  );
  await page.route('**/api/v1/series/1/config', (r: Route) =>
    r.fulfill({ json: { id: 1, name: 'Daily Devotional', shortName: 'Daily', hasSecondaryReading: false, primaryBookName: 'Oswald Chambers', totalReadings: 365 } })
  );

  // Today's reading — varies by `day` so prev/next arrow navigation resolves neighbours
  await page.route('**/api/v1/reading/series/1/today**', (r: Route) => {
    const url = new URL(r.request().url());
    const day = Number(url.searchParams.get('day'));
    if (day === 13) return r.fulfill({ json: { ...MOCK_READING_DETAIL, id: 100, day: 13 } });
    if (day === 15) return r.fulfill({ json: { ...MOCK_READING_DETAIL, id: 102, day: 15 } });
    return r.fulfill({ json: MOCK_READING_DETAIL });
  });

  // Reading by ID — basic and full
  await page.route('**/api/v1/reading/101', (r: Route) =>
    r.fulfill({ json: MOCK_READING_DETAIL })
  );
  await page.route('**/api/v1/reading/101/full**', (r: Route) =>
    r.fulfill({ json: MOCK_READING_DETAIL })
  );
  await page.route('**/api/v1/reading/101/summary', (r: Route) =>
    r.fulfill({ json: { id: 101, summaryPoints: null } })
  );

  // Calendar month readings
  await page.route('**/api/v1/reading/series/1/month/**', (r: Route) =>
    r.fulfill({ json: [MOCK_READING_DETAIL] })
  );

  // Progress — broad catch-all first, specific routes last (Playwright: last-registered wins)
  await page.route('**/api/v1/progress/series/**', (r: Route) =>
    r.fulfill({ json: MOCK_PROGRESS })
  );
  await page.route('**/api/v1/progress/series/1/journal', (r: Route) =>
    r.fulfill({ json: MOCK_JOURNAL })
  );
  await page.route('**/api/v1/progress/series/1/completed-count', (r: Route) =>
    r.fulfill({ json: 100 })
  );
  await page.route('**/api/v1/progress/series/1/streak', (r: Route) =>
    r.fulfill({ json: 3 })
  );
  await page.route('**/api/v1/progress/series/1/percentage', (r: Route) =>
    r.fulfill({ json: 27.4 })
  );
  await page.route('**/api/v1/progress/101/complete', (r: Route) =>
    r.fulfill({ status: 200, json: {} })
  );
  await page.route('**/api/v1/progress/101/uncomplete', (r: Route) =>
    r.fulfill({ status: 200, json: {} })
  );
  await page.route('**/api/v1/progress/101/notes', (r: Route) =>
    r.fulfill({ json: { ...MOCK_PROGRESS[0], readingId: 101, notes: 'My saved note.' } })
  );

  // Bookmarks
  await page.route('**/api/v1/bookmarks', (r: Route) => {
    if (r.request().method() === 'GET') {
      return r.fulfill({ json: MOCK_BOOKMARKS });
    }
    return r.continue();
  });
  await page.route('**/api/v1/bookmarks/**', (r: Route) => {
    const method = r.request().method();
    if (method === 'POST') {
      return r.fulfill({ status: 201, json: { id: 2, readingId: 101, seriesId: 1, bookmarkedAt: new Date().toISOString(), month: 6, day: 14, bibleReading: 'John 3:16' } });
    }
    if (method === 'DELETE') {
      return r.fulfill({ status: 200, json: {} });
    }
    return r.continue();
  });

  // Search
  await page.route('**/api/v1/search**', (r: Route) =>
    r.fulfill({ json: MOCK_SEARCH_RESULTS })
  );

  // Admin logs — broad catch-all first, specific /old DELETE last (last-registered wins)
  await page.route('**/api/v1/logs**', (r: Route) => {
    if (r.request().method() === 'POST') {
      return r.fulfill({ status: 200, json: { received: 1 } });
    }
    return r.fulfill({ json: MOCK_LOGS });
  });
  await page.route('**/api/v1/logs/old', (r: Route) => {
    if (r.request().method() === 'DELETE') {
      return r.fulfill({ json: { deleted: 5, message: 'Deleted 5 log entries older than 6 months.' } });
    }
    return r.continue();
  });
}
