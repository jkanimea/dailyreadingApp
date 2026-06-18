export interface BibleVerseDto {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleVerseGroup {
  reference: string;
  verses: BibleVerseDto[];
}

export interface BibleLookupResponse {
  reference: string;
  groups: BibleVerseGroup[];
}
