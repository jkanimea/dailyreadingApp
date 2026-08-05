import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PrivacyPolicyPage, DeleteAccountPage } from './legal.module';

describe('PrivacyPolicyPage', () => {
  let component: PrivacyPolicyPage;
  let fixture: ComponentFixture<PrivacyPolicyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPage, IonicModule.forRoot(), RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the privacy policy heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent?.trim()).toBe('Privacy Policy');
  });

  it('should link to the data deletion page', () => {
    const link = fixture.nativeElement.querySelector('a[routerlink="/delete-account"]');
    expect(link).not.toBeNull();
  });

  it('should include contact email', () => {
    const emailLink = fixture.nativeElement.querySelector('a[href="mailto:jack@kanimea.com"]');
    expect(emailLink).not.toBeNull();
  });

  it('should not throw when goHome is called', () => {
    expect(() => component.goHome()).not.toThrow();
  });
});

describe('DeleteAccountPage', () => {
  let component: DeleteAccountPage;
  let fixture: ComponentFixture<DeleteAccountPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteAccountPage, IonicModule.forRoot(), RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the delete account heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent?.trim()).toBe('Delete Account & Data');
  });

  it('should document the 30-day processing window', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('30 days');
  });

  it('should include the deletion request email', () => {
    const emailLink = fixture.nativeElement.querySelector('a[href="mailto:jack@kanimea.com"]');
    expect(emailLink).not.toBeNull();
  });

  it('should not throw when goHome is called', () => {
    expect(() => component.goHome()).not.toThrow();
  });
});
