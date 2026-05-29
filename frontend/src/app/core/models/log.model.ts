export interface AppLogDto {
  id: number;
  level: string;
  message: string;
  source?: string;
  exception?: string;
  userId?: number;
  userEmail?: string;
  ipAddress?: string;
  origin: string;
  createdAt: string;
}

export interface AppLogQuery {
  level?: string;
  origin?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedLogsResult {
  items: AppLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
