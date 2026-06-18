export interface BibleVerseDto {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleLookupResponse {
  reference: string;
  verses: BibleVerseDto[];
}
