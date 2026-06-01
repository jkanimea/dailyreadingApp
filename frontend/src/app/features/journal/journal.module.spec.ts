import { fakeAsync, tick } from '@angular/core/testing';
import { JournalEntryDto } from '../../core/models/journal-entry.model';

const mockEntries: JournalEntryDto[] = [
  { readingId: 1, seriesId: 2, seriesName: 'Christ The Way', month: 1, day: 5,
    bibleReading: 'Mark 1:1', primaryBookPageRange: 'DA 1-5', isCompleted: true,
    notes: 'Great insight' },
  { readingId: 2, seriesId: 2, seriesName: 'Christ The Way', month: 1, day: 10,
    bibleReading: 'Luke 2:1', primaryBookPageRange: 'DA 6-10', isCompleted: false,
    notes: 'Notes without completion' },
  { readingId: 3, seriesId: 2, seriesName: 'Christ The Way', month: 2, day: 1,
    bibleReading: 'John 1:1', primaryBookPageRange: 'DA 11-15', isCompleted: true,
    notes: undefined }
];

describe('JournalPage', () => {
  let component: any;
  let mockGetJournal: jest.Mock;
  let mockGetSeriesId: jest.Mock;

  beforeEach(() => {
    mockGetJournal = jest.fn().mockReturnValue(mockEntries);
    mockGetSeriesId = jest.fn().mockReturnValue(2);

    component = {
      entries: [],
      seriesName: '',
      loading: false,
      error: undefined,
      allExpanded: false,
      canShare: true,
      expandedEntries: new Set<number>(),
      progressService: { getJournal: mockGetJournal },
      prefs: { getSeriesId: mockGetSeriesId },
      loadJournal() {
        this.loading = true;
        this.error = undefined;
        const seriesId = this.prefs.getSeriesId();
        this.entries = this.progressService.getJournal(seriesId);
        this.seriesName = this.entries.length > 0 ? this.entries[0].seriesName : 'Reading';
        this.loading = false;
      },
      ionViewWillEnter() {
        this.loadJournal();
      },
      isExpanded(readingId: number) {
        return this.allExpanded || this.expandedEntries.has(readingId);
      },
      toggleEntry(readingId: number) {
        if (this.expandedEntries.has(readingId)) {
          this.expandedEntries.delete(readingId);
        } else {
          this.expandedEntries.add(readingId);
        }
      },
      printJournal() {
        this.allExpanded = true;
        setTimeout(() => window.print(), 100);
      },
      shareJournal() {
        if (!navigator.share) return;
        navigator.share({ title: 'My Reading Journal', text: 'My 365-day reading journal' });
      }
    };
  });

  it('should load journal entries on ionViewWillEnter', () => {
    component.ionViewWillEnter();

    expect(mockGetJournal).toHaveBeenCalledWith(2);
    expect(component.entries.length).toBe(3);
  });

  it('should derive series name from first entry', () => {
    component.ionViewWillEnter();

    expect(component.seriesName).toBe('Christ The Way');
  });

  it('should have incomplete entry with notes', () => {
    component.ionViewWillEnter();

    const unmarked = component.entries.find((e: JournalEntryDto) => !e.isCompleted && e.notes);
    expect(unmarked).toBeDefined();
  });

  it('should have completed entry without notes', () => {
    component.ionViewWillEnter();

    const noNotes = component.entries.find((e: JournalEntryDto) => e.isCompleted && !e.notes);
    expect(noNotes).toBeDefined();
  });

  it('printJournal should set allExpanded to true before printing', fakeAsync(() => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    component.allExpanded = false;

    component.printJournal();
    tick(100);

    expect(component.allExpanded).toBe(true);
    expect(printSpy).toHaveBeenCalled();
  }));

  it('shareJournal should not throw when navigator.share is undefined', () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    component.canShare = false;

    expect(() => component.shareJournal()).not.toThrow();
  });

  it('shareJournal should call navigator.share when available', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.canShare = true;

    component.shareJournal();

    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'My Reading Journal' }));
  });
});
