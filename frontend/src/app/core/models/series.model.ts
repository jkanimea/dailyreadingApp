export interface BookRef {
  id: number;
  title: string;
  author: string;
}

export interface Series {
  id: number;
  name: string;
  shortName: string;
  description: string;
  seriesType: number;
  primaryBookId: number;
  primaryBook: BookRef;
  secondaryBookId?: number;
  secondaryBook?: BookRef;
  sortOrder: number;
}

export interface SeriesConfig {
  id: number;
  name: string;
  shortName: string;
  hasSecondaryReading: boolean;
  primaryBookName: string;
  secondaryBookName?: string;
  totalReadings: number;
}
