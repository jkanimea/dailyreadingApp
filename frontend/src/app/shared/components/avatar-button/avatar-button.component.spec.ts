import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarButtonComponent } from './avatar-button.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { UserDto } from '../../../core/models/user.model';

const mockUser: UserDto = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Jane Doe',
  provider: 'google',
  selectedSeriesId: 1,
  role: 'User'
};

describe('AvatarButtonComponent', () => {
  let component: AvatarButtonComponent;
  let fixture: ComponentFixture<AvatarButtonComponent>;
  let user$: BehaviorSubject<UserDto | null>;
  let authService: any;
  let router: any;

  beforeEach(async () => {
    user$ = new BehaviorSubject<UserDto | null>(null);

    authService = { user$ };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [AvatarButtonComponent],
      imports: [CommonModule, IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show empty initials and no photo when user is null (guest)', () => {
    user$.next(null);
    fixture.detectChanges();

    expect(component.initials).toBe('');
    expect(component.photoUrl).toBe('');
  });

  it('should derive initials from displayName', () => {
    user$.next(mockUser);
    fixture.detectChanges();

    expect(component.initials).toBe('JD');
  });

  it('should use single-word name initial correctly', () => {
    user$.next({ ...mockUser, displayName: 'Alice' });
    fixture.detectChanges();

    expect(component.initials).toBe('A');
  });

  it('should cap initials at 2 characters for long names', () => {
    user$.next({ ...mockUser, displayName: 'John Paul Smith' });
    fixture.detectChanges();

    expect(component.initials).toBe('JP');
  });

  it('should set photoUrl when user has one', () => {
    user$.next({ ...mockUser, photoUrl: 'https://example.com/photo.jpg' });
    fixture.detectChanges();

    expect(component.photoUrl).toBe('https://example.com/photo.jpg');
  });

  it('should clear photoUrl and initials when user logs out', () => {
    user$.next(mockUser);
    fixture.detectChanges();
    expect(component.initials).toBe('JD');

    user$.next(null);
    fixture.detectChanges();
    expect(component.initials).toBe('');
    expect(component.photoUrl).toBe('');
  });

  it('should navigate to /account on navigate()', () => {
    component.navigate();
    expect(router.navigate).toHaveBeenCalledWith(['/account']);
  });

  it('should update reactively when user$ emits a new value', () => {
    user$.next({ ...mockUser, displayName: 'Bob Smith', photoUrl: '' });
    fixture.detectChanges();
    expect(component.initials).toBe('BS');

    user$.next({ ...mockUser, displayName: 'Carol White', photoUrl: 'https://cdn.example.com/carol.png' });
    fixture.detectChanges();
    expect(component.initials).toBe('CW');
    expect(component.photoUrl).toBe('https://cdn.example.com/carol.png');
  });

});
