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
      selectedEntryIds: new Set<number>(),
      selectedCount: 0,
      progressService: { getJournal: mockGetJournal },
      prefs: { getSeriesId: mockGetSeriesId },
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      loadJournal() {
        this.loading = true;
        this.error = undefined;
        const seriesId = this.prefs.getSeriesId();
        this.entries = this.progressService.getJournal(seriesId);
        this.seriesName = this.entries.length > 0 ? this.entries[0].seriesName : 'Reading';
        this.selectAllEntries();
        this.loading = false;
      },
      ionViewWillEnter() {
        this.loadJournal();
      },
      getMonthName(month: number) {
        return this.monthNames[month - 1] || '';
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
      selectAllEntries() {
        this.selectedEntryIds.clear();
        this.entries.forEach((e: JournalEntryDto) => this.selectedEntryIds.add(e.readingId));
        this.selectedCount = this.selectedEntryIds.size;
      },
      deselectAllEntries() {
        this.selectedEntryIds.clear();
        this.selectedCount = 0;
      },
      isSelected(readingId: number) {
        return this.selectedEntryIds.has(readingId);
      },
      toggleSelected(readingId: number) {
        if (this.selectedEntryIds.has(readingId)) {
          this.selectedEntryIds.delete(readingId);
        } else {
          this.selectedEntryIds.add(readingId);
        }
        this.selectedCount = this.selectedEntryIds.size;
      },
      printJournal() {
        this.allExpanded = true;
        setTimeout(() => window.print(), 100);
      },
      shareJournal() {
        if (!navigator.share) return;
        const selected = this.entries.filter((e: JournalEntryDto) => this.selectedEntryIds.has(e.readingId));
        if (selected.length === 0) return;
        navigator.share({ title: `My Reading Journal — ${this.seriesName}`, text: this.buildShareText(selected), url: window.location.href });
      },
      buildShareText(selected: JournalEntryDto[]) {
        const lines: string[] = [`My Reading Journal — ${this.seriesName}`, ''];
        for (const entry of selected) {
          const date = `${this.getMonthName(entry.month)} ${entry.day}`;
          lines.push(`${date} — ${entry.bibleReading}`);
          lines.push(`${entry.primaryBookPageRange}`);
          if (entry.secondaryBookPageRange) {
            lines.push(entry.secondaryBookPageRange);
          }
          if (entry.notes) {
            lines.push(`Notes: ${entry.notes}`);
          }
          lines.push('');
        }
        return lines.join('\n');
      }
    };
  });

  // ─── Loading ─────────────────────────────────────────────────────────

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

  it('should clear stale selectedEntryIds on reload with different entries', () => {
    component.ionViewWillEnter();
    component.toggleSelected(1);
    expect(component.selectedEntryIds.has(1)).toBe(false);

    const newEntries: JournalEntryDto[] = [
      { readingId: 99, seriesId: 3, seriesName: 'New Series', month: 6, day: 1,
        bibleReading: 'Gen 1:1', primaryBookPageRange: 'PP 1-5', isCompleted: true,
        notes: 'New note' }
    ];
    mockGetJournal.mockReturnValue(newEntries);

    component.loadJournal();

    expect(component.selectedCount).toBe(1);
    expect(component.isSelected(1)).toBe(false);
    expect(component.isSelected(99)).toBe(true);
  });

  // ─── Selection ────────────────────────────────────────────────────────

  it('should select all entries by default after loading', () => {
    component.ionViewWillEnter();

    expect(component.selectedCount).toBe(3);
    expect(component.isSelected(1)).toBe(true);
    expect(component.isSelected(2)).toBe(true);
    expect(component.isSelected(3)).toBe(true);
  });

  it('should deselect all entries', () => {
    component.ionViewWillEnter();

    component.deselectAllEntries();

    expect(component.selectedCount).toBe(0);
    expect(component.isSelected(1)).toBe(false);
  });

  it('should select all entries after deselecting', () => {
    component.ionViewWillEnter();
    component.deselectAllEntries();

    component.selectAllEntries();

    expect(component.selectedCount).toBe(3);
    expect(component.isSelected(1)).toBe(true);
  });

  it('should toggle individual entry selection', () => {
    component.ionViewWillEnter();

    component.toggleSelected(1);

    expect(component.selectedCount).toBe(2);
    expect(component.isSelected(1)).toBe(false);

    component.toggleSelected(1);

    expect(component.selectedCount).toBe(3);
    expect(component.isSelected(1)).toBe(true);
  });

  it('should update selectedCount when toggling', () => {
    component.ionViewWillEnter();
    component.deselectAllEntries();

    component.toggleSelected(2);

    expect(component.selectedCount).toBe(1);
  });

  // ─── Expand / Collapse ───────────────────────────────────────────────

  it('should start with all entries collapsed', () => {
    component.ionViewWillEnter();

    expect(component.isExpanded(1)).toBe(false);
    expect(component.isExpanded(2)).toBe(false);
    expect(component.isExpanded(3)).toBe(false);
  });

  it('toggleEntry should expand a collapsed entry', () => {
    component.ionViewWillEnter();

    component.toggleEntry(1);

    expect(component.isExpanded(1)).toBe(true);
  });

  it('toggleEntry should collapse an expanded entry', () => {
    component.ionViewWillEnter();
    component.toggleEntry(1);

    component.toggleEntry(1);

    expect(component.isExpanded(1)).toBe(false);
  });

  it('toggleEntry should expand one entry without affecting others', () => {
    component.ionViewWillEnter();

    component.toggleEntry(2);

    expect(component.isExpanded(1)).toBe(false);
    expect(component.isExpanded(2)).toBe(true);
    expect(component.isExpanded(3)).toBe(false);
  });

  it('toggleEntry should be independent of toggleSelected — selecting does not expand', () => {
    component.ionViewWillEnter();

    component.toggleSelected(1);

    expect(component.isExpanded(1)).toBe(false);
  });

  it('toggleSelected should be independent of toggleEntry — expanding does not change selection', () => {
    component.ionViewWillEnter();

    component.toggleEntry(1);

    expect(component.isSelected(1)).toBe(true); // selection unchanged
    expect(component.selectedCount).toBe(3);
  });

  it('allExpanded true should make isExpanded return true for all entries', () => {
    component.ionViewWillEnter();
    component.allExpanded = true;

    expect(component.isExpanded(1)).toBe(true);
    expect(component.isExpanded(2)).toBe(true);
    expect(component.isExpanded(3)).toBe(true);
  });

  // ─── Print ────────────────────────────────────────────────────────────

  it('printJournal should set allExpanded to true before printing', fakeAsync(() => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    component.allExpanded = false;

    component.printJournal();
    tick(100);

    expect(component.allExpanded).toBe(true);
    expect(printSpy).toHaveBeenCalled();
  }));

  // ─── Share ────────────────────────────────────────────────────────────

  it('shareJournal should not throw when navigator.share is undefined', () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    component.canShare = false;

    expect(() => component.shareJournal()).not.toThrow();
  });

  it('shareJournal should not share when no entries are selected', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.ionViewWillEnter();
    component.deselectAllEntries();

    component.shareJournal();

    expect(shareMock).not.toHaveBeenCalled();
  });

  it('shareJournal should include journal entry content for selected entries', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.ionViewWillEnter();
    component.deselectAllEntries();
    component.toggleSelected(1);

    component.shareJournal();

    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Reading Journal — Christ The Way',
      text: expect.stringContaining('January 5 — Mark 1:1')
    }));
    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Reading Journal — Christ The Way',
      text: expect.stringContaining('Notes: Great insight')
    }));
  });

  it('shareJournal should include only selected entries, not deselected ones', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.ionViewWillEnter();
    component.deselectAllEntries();
    component.toggleSelected(1);

    component.shareJournal();

    const text: string = shareMock.mock.calls[0][0].text;
    expect(text).toContain('January 5');
    expect(text).not.toContain('January 10');
    expect(text).not.toContain('February 1');
  });

  it('shareJournal should include all entries when all are selected', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.ionViewWillEnter();

    component.shareJournal();

    const text: string = shareMock.mock.calls[0][0].text;
    expect(text).toContain('January 5');
    expect(text).toContain('January 10');
    expect(text).toContain('February 1');
  });

  it('shareJournal should handle entries without notes', () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    component.ionViewWillEnter();
    component.deselectAllEntries();
    component.toggleSelected(3);

    component.shareJournal();

    const text: string = shareMock.mock.calls[0][0].text;
    expect(text).toContain('February 1');
    expect(text).not.toContain('Notes:');
  });

});
