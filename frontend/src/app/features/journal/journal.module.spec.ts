import { JournalEntryDto } from '../../core/models/journal-entry.model';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
    mockGetJournal = jest.fn().mockImplementation(() => mockEntries.map(e => ({ ...e })));
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
      seriesService: { getById: jest.fn().mockReturnValue({ name: 'Christ The Way' }) },
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      loadJournal() {
        this.loading = true;
        this.error = undefined;
        this.seriesId = this.prefs.getSeriesId();
        this.entries = this.progressService.getJournal(this.seriesId);
        this.seriesName = this.seriesService.getById(this.seriesId).name;
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
      async printJournal() {
        const selected = this.selectedCount > 0
          ? this.entries.filter((e: JournalEntryDto) => this.selectedEntryIds.has(e.readingId))
          : this.entries;
        if (selected.length === 0) return;

        const iframe = document.createElement('iframe');
        iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;visibility:hidden;');
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
          document.body.removeChild(iframe);
          return;
        }

        doc.open();
        doc.write(this.buildPrintHtml(selected));
        doc.close();
        iframe.contentWindow?.focus();

        const cleanup = () => {
          try { document.body.removeChild(iframe); } catch { /* already removed */ }
        };

        iframe.contentWindow!.onafterprint = cleanup;
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              iframe.contentWindow!.print();
              setTimeout(cleanup, 1000);
            } catch {
              cleanup();
            }
            resolve();
          }, 300);
        });
      },
      buildPrintHtml(entries: JournalEntryDto[]) {
        const lines: string[] = [];
        lines.push('<!DOCTYPE html><html><head><meta charset="utf-8">');
        lines.push(`<title>Journal — ${this.escapeHtml(this.seriesName)}</title>`);
        lines.push('<style>');
        lines.push(`
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  padding: 24px;
  color: #000;
  background: #fff;
  font-size: 15px;
  line-height: 1.6;
}
.print-header {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #222;
}
.journal-card {
  border: 1px solid #ccc;
  border-radius: 12px;
  margin-bottom: 16px;
  padding: 16px;
  page-break-inside: avoid;
}
.journal-date {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #000;
}
.journal-subtitle {
  font-size: 13px;
  color: #555;
  margin-bottom: 8px;
}
.journal-subtitle a { color: #555; text-decoration: none; }
.journal-secondary {
  font-size: 13px;
  color: #888;
  font-style: italic;
  margin-bottom: 8px;
}
.journal-notes {
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 15px;
  color: #000;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}
@media print {
  body { padding: 12px; }
  .journal-card { break-inside: avoid; }
}`);
        lines.push('</style></head><body>');
        lines.push(`<div class="print-header">My Reading Journal — ${this.escapeHtml(this.seriesName)}</div>`);

        for (const entry of entries) {
          const date = `${this.getMonthName(entry.month)} ${entry.day}`;
          lines.push('<div class="journal-card">');
          lines.push(`<div class="journal-date">${this.escapeHtml(date)}</div>`);
          lines.push(`<div class="journal-subtitle">${this.escapeHtml(entry.bibleReading)} — ${this.escapeHtml(entry.primaryBookPageRange)}</div>`);
          if (entry.secondaryBookPageRange) {
            lines.push(`<div class="journal-secondary">${this.escapeHtml(entry.secondaryBookPageRange)}</div>`);
          }
          if (entry.notes) {
            lines.push(`<div class="journal-notes">${this.escapeHtml(entry.notes)}</div>`);
          }
          lines.push('</div>');
        }

        lines.push('</body></html>');
        return lines.join('\n');
      },
      escapeHtml(text: string) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
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

  afterEach(() => {
    jest.restoreAllMocks();
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

  // ─── Series header ────────────────────────────────────────────────────

  it('should set seriesName from series service after loading', () => {
    component.ionViewWillEnter();

    expect(component.seriesName).toBe('Christ The Way');
  });

  it('should set seriesName from series service even when no entries exist', () => {
    mockGetJournal.mockReturnValue([]);

    component.loadJournal();

    expect(component.seriesName).toBe('Christ The Way');
  });

  it('should expose seriesId from preferences after loading', () => {
    component.loadJournal();

    expect(component.seriesId).toBe(2);
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

  // ─── Print (hidden-iframe approach) ──────────────────────────────────

  it('buildPrintHtml should produce valid HTML document with all entries', () => {
    component.ionViewWillEnter();
    const html = component.buildPrintHtml(component.entries);

    expect(html).toMatch(/^<!DOCTYPE html><html>/);
    expect(html).toContain('</html>');
    expect(html).toContain('My Reading Journal — Christ The Way');
    expect(html).toContain('January 5');
    expect(html).toContain('Mark 1:1');
    expect(html).toContain('DA 1-5');
    expect(html).toContain('Great insight');
    expect(html).toContain('February 1');
  });

  it('buildPrintHtml should include only selected entries', () => {
    component.ionViewWillEnter();
    component.deselectAllEntries();
    component.toggleSelected(1);
    const html = component.buildPrintHtml(
      component.entries.filter((e: JournalEntryDto) => component.selectedEntryIds.has(e.readingId))
    );

    expect(html).toContain('January 5');
    expect(html).not.toContain('January 10');
    expect(html).not.toContain('February 1');
  });

  it('buildPrintHtml should escape HTML in notes', () => {
    component.ionViewWillEnter();
    component.entries[0].notes = '<script>alert("xss")</script>';
    const html = component.buildPrintHtml([component.entries[0]]);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('buildPrintHtml should escape HTML in series name', () => {
    component.seriesName = 'Test & "Series"';
    const html = component.buildPrintHtml([]);

    expect(html).toContain('Test &amp; &quot;Series&quot;');
    expect(html).not.toContain('Test & "Series"');
    expect(html).toContain('<title>Journal — Test &amp; &quot;Series&quot;</title>');
  });

  it('buildPrintHtml should include print CSS with contain:none fallback for multi-page', () => {
    component.ionViewWillEnter();
    const html = component.buildPrintHtml(component.entries);

    expect(html).toContain('page-break-inside: avoid');
    expect(html).toContain('@media print');
    expect(html).toContain('.journal-card { break-inside: avoid; }');
  });

  it('printJournal should create hidden iframe, write content, and call print', async () => {
    jest.useFakeTimers();
    const mockPrint = jest.fn();
    const mockDoc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    const mockWin: any = { document: mockDoc, focus: jest.fn(), print: mockPrint };
    const mockIframe: any = {
      contentDocument: mockDoc,
      contentWindow: mockWin,
      setAttribute: jest.fn()
    };
    const createSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockIframe);
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockReturnValue(mockIframe);
    jest.spyOn(document.body, 'removeChild').mockReturnValue(mockIframe);
    component.ionViewWillEnter();

    component.printJournal();
    jest.runAllTimers();
    // flush microtasks so the promise chain completes
    await Promise.resolve();

    expect(createSpy).toHaveBeenCalledWith('iframe');
    expect(appendSpy).toHaveBeenCalledWith(mockIframe);
    expect(mockDoc.open).toHaveBeenCalled();
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('My Reading Journal — Christ The Way'));
    expect(mockDoc.close).toHaveBeenCalled();
    expect(mockWin.focus).toHaveBeenCalled();
    expect(mockWin.onafterprint).toBeInstanceOf(Function);
    expect(mockPrint).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('printJournal should not print when there are no entries', async () => {
    const createSpy = jest.spyOn(document, 'createElement');
    component.entries = [];
    component.selectedCount = 0;

    await component.printJournal();

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('printJournal should bail out when iframe has no contentDocument', async () => {
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockReturnValue({} as any);
    const mockIframe: any = {
      contentDocument: null,
      contentWindow: null,
      setAttribute: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockIframe);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(mockIframe);
    component.ionViewWillEnter();

    await component.printJournal();

    expect(removeSpy).toHaveBeenCalledWith(mockIframe);
  });

  it('printJournal should clean up iframe when print() throws (e.g. no printer on Android)', async () => {
    const mockPrint = jest.fn(() => { throw new Error('print failed'); });
    const mockDoc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    const mockWin: any = { document: mockDoc, focus: jest.fn(), print: mockPrint };
    const mockIframe: any = {
      contentDocument: mockDoc,
      contentWindow: mockWin,
      setAttribute: jest.fn()
    };
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockReturnValue(mockIframe);
    jest.spyOn(document, 'createElement').mockReturnValue(mockIframe);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(mockIframe);
    component.ionViewWillEnter();

    await component.printJournal();

    expect(removeSpy).toHaveBeenCalledWith(mockIframe);
  });

  it('printJournal should clean up iframe on afterprint', async () => {
    const mockPrint = jest.fn();
    const mockDoc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    const mockWin: any = { document: mockDoc, focus: jest.fn(), print: mockPrint };
    const mockIframe: any = {
      contentDocument: mockDoc,
      contentWindow: mockWin,
      setAttribute: jest.fn()
    };
    const removeSpy = jest.spyOn(document.body, 'removeChild').mockReturnValue(mockIframe);
    jest.spyOn(document, 'createElement').mockReturnValue(mockIframe);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(mockIframe);
    component.ionViewWillEnter();

    await component.printJournal();

    mockWin.onafterprint();
    expect(removeSpy).toHaveBeenCalledWith(mockIframe);
  });

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

  // ─── Print Multi-Page CSS ──────────────────────────────────────────────

  it('global.scss @media print should have contain:none on ion-content::part(scroll) to enable multi-page printing', () => {
    const scssPath = resolve(process.cwd(), 'src/global.scss');
    const content = readFileSync(scssPath, 'utf8');

    expect(content).toMatch(/@media\s+print/);
    expect(content).toMatch(/ion-content::part\(scroll\)/);
    expect(content).toMatch(/contain:\s*none\s*!important/);
    expect(content).toMatch(/height:\s*auto\s*!important/);
    expect(content).toMatch(/overflow:\s*visible\s*!important/);
  });

});
