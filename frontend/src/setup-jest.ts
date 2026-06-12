import 'reflect-metadata';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// CI runs jest directly so the @angular-builders/jest default setup.js
// (which normally calls setupZoneTestEnv) is NOT loaded — we must init here.
// Local "ng test" uses the builder which already calls it, so we guard
// against the double-call error with a try/catch.
try {
  setupZoneTestEnv();
} catch {
  /* already initialized by @angular-builders/jest default setup */
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }
  observe(target: Element): void {
    this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this);
  }
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn().mockReturnValue([]);
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver as unknown as typeof IntersectionObserver
});
