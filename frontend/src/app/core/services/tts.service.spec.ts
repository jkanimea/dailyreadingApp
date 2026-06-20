import { TestBed } from '@angular/core/testing';
import { TtsService } from './tts.service';

describe('TtsService', () => {
  let service: TtsService;
  let mockSpeak: jest.Mock;
  let mockCancel: jest.Mock;
  let mockPause: jest.Mock;
  let mockResume: jest.Mock;

  class MockUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    volume = 1;
    onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
    onend: ((event: SpeechSynthesisEvent) => void) | null = null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
    onpause: ((event: SpeechSynthesisEvent) => void) | null = null;
    onresume: ((event: SpeechSynthesisEvent) => void) | null = null;
    constructor(text: string) { this.text = text; }
  }

  function mockSpeechSynthesis(): void {
    mockSpeak = jest.fn();
    mockCancel = jest.fn();
    mockPause = jest.fn();
    mockResume = jest.fn();

    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;

    const speechSynthesisMock = {
      speak: mockSpeak,
      cancel: mockCancel,
      pause: mockPause,
      resume: mockResume,
      pending: false,
      speaking: false,
      paused: false,
    };

    Object.defineProperty(window, 'speechSynthesis', {
      value: speechSynthesisMock,
      configurable: true,
      writable: true,
    });
  }

  function removeSpeechSynthesis(): void {
    delete (window as any).speechSynthesis;
  }

  function getLastUtterance(): MockUtterance {
    const calls = mockSpeak.mock.calls;
    return calls[calls.length - 1][0] as MockUtterance;
  }

  beforeEach(() => {
    mockSpeechSynthesis();
    TestBed.configureTestingModule({
      providers: [TtsService],
    });
    service = TestBed.inject(TtsService);
  });

  afterEach(() => {
    delete (window as any).speechSynthesis;
    delete (globalThis as any).SpeechSynthesisUtterance;
  });

  describe('supported', () => {
    it('should return true when speechSynthesis is available', () => {
      expect(service.supported).toBe(true);
    });

    it('should return false when speechSynthesis is not available', () => {
      removeSpeechSynthesis();
      service = TestBed.inject(TtsService);
      expect(service.supported).toBe(false);
    });
  });

  describe('speak', () => {
    it('should create an utterance and call speechSynthesis.speak', () => {
      service.speak('Hello world');
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = getLastUtterance();
      expect(utterance.text).toBe('Hello world');
    });

    it('should transition state to speaking when speech starts', () => {
      service.speak('Hello');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      expect(service.state).toBe('speaking');
    });

    it('should transition state to idle when speech ends', () => {
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onend!(new Event('end') as SpeechSynthesisEvent);
      expect(service.state).toBe('idle');
    });

    it('should transition state to idle on speech error', () => {
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onerror!(new Event('error') as SpeechSynthesisErrorEvent);
      expect(service.state).toBe('idle');
    });

    it('should emit state through observable', () => {
      const states: string[] = [];
      service.state$.subscribe((s) => states.push(s));
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onend!(new Event('end') as SpeechSynthesisEvent);
      expect(states).toEqual(['idle', 'speaking', 'idle']);
    });

    it('should cancel previous speech when speak is called twice', () => {
      service.speak('First');
      service.speak('Second');
      expect(mockCancel).toHaveBeenCalledTimes(2);
      expect(mockSpeak).toHaveBeenCalledTimes(2);
    });

    it('should not call speak with empty text', () => {
      service.speak('');
      expect(mockSpeak).not.toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });

    it('should not call speak with whitespace-only text', () => {
      service.speak('   ');
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('should do nothing when speechSynthesis is unavailable', () => {
      removeSpeechSynthesis();
      service = TestBed.inject(TtsService);
      service.speak('Hello');
      expect(service.state).toBe('idle');
    });
  });

  describe('stop', () => {
    it('should cancel speech and reset state to idle', () => {
      service.speak('Hello');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      service.stop();
      expect(mockCancel).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });

    it('should be safe to call when already idle', () => {
      service.stop();
      expect(mockCancel).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });
  });

  describe('pause', () => {
    it('should call speechSynthesis.pause when speaking', () => {
      service.speak('Hello');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      service.pause();
      expect(mockPause).toHaveBeenCalledTimes(1);
    });

    it('should react to onpause event', () => {
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onpause!(new Event('pause') as SpeechSynthesisEvent);
      expect(service.state).toBe('paused');
    });

    it('should do nothing when not speaking', () => {
      service.pause();
      expect(mockPause).not.toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should call speechSynthesis.resume when paused', () => {
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onpause!(new Event('pause') as SpeechSynthesisEvent);
      service.resume();
      expect(mockResume).toHaveBeenCalledTimes(1);
    });

    it('should react to onresume event', () => {
      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onpause!(new Event('pause') as SpeechSynthesisEvent);
      u.onresume!(new Event('resume') as SpeechSynthesisEvent);
      expect(service.state).toBe('speaking');
    });

    it('should do nothing when not paused', () => {
      service.resume();
      expect(mockResume).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should stop speech on destroy', () => {
      service.speak('Hello');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      service.ngOnDestroy();
      expect(mockCancel).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });
  });

  describe('edge cases', () => {
    it('should handle speak -> pause -> resume -> end sequence', () => {
      const states: string[] = [];
      service.state$.subscribe((s) => states.push(s));

      service.speak('Hello');
      const u = getLastUtterance();
      u.onstart!(new Event('start') as SpeechSynthesisEvent);
      u.onpause!(new Event('pause') as SpeechSynthesisEvent);
      u.onresume!(new Event('resume') as SpeechSynthesisEvent);
      u.onend!(new Event('end') as SpeechSynthesisEvent);

      expect(states).toEqual(['idle', 'speaking', 'paused', 'speaking', 'idle']);
    });

    it('should handle rapid stop followed by speak', () => {
      service.speak('First');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      service.stop();
      expect(service.state).toBe('idle');
      service.speak('Second');
      getLastUtterance().onstart!(new Event('start') as SpeechSynthesisEvent);
      expect(service.state).toBe('speaking');
      expect(mockSpeak).toHaveBeenCalledTimes(2);
    });
  });
});
