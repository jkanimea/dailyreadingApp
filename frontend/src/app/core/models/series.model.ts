export interface Series {
  id: number;
  name: string;
  shortName: string;
  description: string;
  primaryBookName: string;
  secondaryBookName?: string;
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
