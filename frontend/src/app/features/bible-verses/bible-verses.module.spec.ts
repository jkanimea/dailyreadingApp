import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule, NavController } from '@ionic/angular';
import { BehaviorSubject, of } from 'rxjs';
import { BibleVersesPage } from './bible-verses.module';
import { BibleService } from '../../core/services/bible.service';
import { SharedModule } from '../../shared/shared.module';

describe('BibleVersesPage', () => {
  let component: BibleVersesPage;
  let fixture: ComponentFixture<BibleVersesPage>;
  let mockBibleService: any;
  let mockRouter: any;

  const mockGroups = [
    {
      reference: 'Acts 17:26, 27',
      verses: [
        { book: 'Acts', chapter: 17, verse: 26, text: 'God made the world.' },
        { book: 'Acts', chapter: 17, verse: 27, text: 'That they should seek the Lord.' }
      ]
    },
    {
      reference: 'Galatians 3:28',
      verses: [
        { book: 'Galatians', chapter: 3, verse: 28, text: 'There is neither Jew nor Greek.' }
      ]
    },
    {
      reference: 'Romans 10:11-13',
      verses: [
        { book: 'Romans', chapter: 10, verse: 11, text: 'For the scripture saith.' },
        { book: 'Romans', chapter: 10, verse: 12, text: 'For there is no difference.' },
        { book: 'Romans', chapter: 10, verse: 13, text: 'For whosoever shall call.' }
      ]
    }
  ];

  beforeEach(async () => {
    mockBibleService = {
      lookupVerses: jest.fn().mockReturnValue(of({
        reference: 'Acts 17:26, 27; Galatians 3:28; Romans 10:11-13',
        groups: mockGroups
      }))
    };

    mockRouter = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [BibleVersesPage],
      imports: [IonicModule.forRoot(), SharedModule, HttpClientTestingModule],
      providers: [
        { provide: BibleService, useValue: mockBibleService },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ refs: 'Acts%2017%3A26%2C%2027%3B%20Galatians%203%3A28%3B%20Romans%2010%3A11-13' }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BibleVersesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load verses on init', async () => {
    await component.ionViewWillEnter();
    expect(mockBibleService.lookupVerses).toHaveBeenCalledWith('Acts 17:26, 27; Galatians 3:28; Romans 10:11-13');
    expect(component.loading).toBe(false);
    expect(component.result).toBeTruthy();
  });

  it('should render reference header', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('.ref-header');
    expect(header.textContent).toContain('Acts 17:26, 27');
  });

  it('should show error when no refs param', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [BibleVersesPage],
      imports: [IonicModule.forRoot(), SharedModule, HttpClientTestingModule],
      providers: [
        { provide: BibleService, useValue: mockBibleService },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: { navigateRoot: jest.fn(), push: jest.fn(), back: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BibleVersesPage);
    component = fixture.componentInstance;
    await component.ionViewWillEnter();
    expect(component.error).toBe('No Bible reference provided.');
  });

  it('should render group cards for each reference', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.verse-card');
    expect(cards.length).toBe(3);
  });

  it('should show group reference in each card', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();
    const refs = fixture.nativeElement.querySelectorAll('.verse-ref');
    expect(refs[0].textContent).toBe('Acts 17:26, 27');
    expect(refs[1].textContent).toBe('Galatians 3:28');
    expect(refs[2].textContent).toBe('Romans 10:11-13');
  });

  it('should render all verse texts within each group card', async () => {
    await component.ionViewWillEnter();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.verse-card');
    const card1Texts = cards[0].querySelectorAll('.verse-text');
    expect(card1Texts.length).toBe(2);
    expect(card1Texts[0].textContent).toContain('God made the world.');
    expect(card1Texts[1].textContent).toContain('That they should seek');

    const card3Texts = cards[2].querySelectorAll('.verse-text');
    expect(card3Texts.length).toBe(3);
    expect(card3Texts[0].textContent).toContain('For the scripture saith.');
    expect(card3Texts[1].textContent).toContain('For there is no difference.');
    expect(card3Texts[2].textContent).toContain('For whosoever shall call.');
  });

  it('should show empty state when no verses returned', async () => {
    mockBibleService.lookupVerses.mockReturnValue(of({
      reference: 'Unknown 1:1',
      groups: []
    }));
    await component.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-state')).toBeTruthy();
  });
});
