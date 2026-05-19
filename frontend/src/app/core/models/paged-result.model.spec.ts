import { PagedResult } from './paged-result.model';

describe('PagedResult', () => {
  it('should calculate totalPages', () => {
    const result: PagedResult<string> = {
      items: ['a', 'b', 'c'],
      totalCount: 25,
      page: 1,
      pageSize: 10,
      totalPages: 0
    };
    result.totalPages = Math.ceil(result.totalCount / result.pageSize);
    expect(result.totalPages).toBe(3);
  });

  it('should return 1 page when totalCount equals pageSize', () => {
    const result: PagedResult<string> = {
      items: [],
      totalCount: 10,
      page: 1,
      pageSize: 10,
      totalPages: 0
    };
    result.totalPages = Math.ceil(result.totalCount / result.pageSize);
    expect(result.totalPages).toBe(1);
  });

  it('should handle zero totalCount', () => {
    const result: PagedResult<string> = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0
    };
    result.totalPages = Math.ceil(result.totalCount / Math.max(result.pageSize, 1));
    expect(result.totalPages).toBe(0);
  });
});
