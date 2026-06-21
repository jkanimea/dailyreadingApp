import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TtsService } from './tts.service';

jest.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: jest.fn(),
    stop: jest.fn(),
  },
}));

import { TextToSpeech } from '@capacitor-community/text-to-speech';

describe('TtsService', () => {
  let service: TtsService;
  let mockSpeak: jest.Mock;
  let mockStop: jest.Mock;

  beforeEach(() => {
    mockSpeak = TextToSpeech.speak as jest.Mock;
    mockStop = TextToSpeech.stop as jest.Mock;
    mockSpeak.mockReset();
    mockStop.mockReset();
    mockSpeak.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [TtsService, provideHttpClient()],
    });
    service = TestBed.inject(TtsService);
  });

  describe('supported', () => {
    it('should return true', () => {
      expect(service.supported).toBe(true);
    });
  });

  describe('speak', () => {
    it('should call TextToSpeech.speak with text and default options', () => {
      service.speak('Hello world');
      expect(mockSpeak).toHaveBeenCalledWith({
        text: 'Hello world',
        rate: 1,
        pitch: 1,
        volume: 1,
      });
    });

    it('should transition state to speaking', () => {
      service.speak('Hello');
      expect(service.state).toBe('speaking');
    });

    it('should transition state to idle when speech completes', async () => {
      mockSpeak.mockResolvedValue(undefined);
      service.speak('Hello');
      await mockSpeak.mock.results[0].value;
      expect(service.state).toBe('idle');
    });

    it('should transition state to idle on speech error', async () => {
      mockSpeak.mockRejectedValue(new Error('TTS error'));
      service.speak('Hello');
      await mockSpeak.mock.results[0].value.catch(() => {});
      expect(service.state).toBe('idle');
    });

    it('should emit state through observable', async () => {
      const states: string[] = [];
      service.state$.subscribe((s) => states.push(s));
      mockSpeak.mockResolvedValue(undefined);
      service.speak('Hello');
      await mockSpeak.mock.results[0].value;
      expect(states).toEqual(['idle', 'speaking', 'idle']);
    });

    it('should stop previous speech when speak is called twice', () => {
      service.speak('First');
      service.speak('Second');
      expect(mockStop).toHaveBeenCalledTimes(2);
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
  });

  describe('stop', () => {
    it('should cancel speech and reset state to idle', () => {
      service.speak('Hello');
      expect(service.state).toBe('speaking');
      service.stop();
      expect(mockStop).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });

    it('should be safe to call when already idle', () => {
      service.stop();
      expect(mockStop).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });
  });

  describe('ngOnDestroy', () => {
    it('should stop speech on destroy', () => {
      service.speak('Hello');
      service.ngOnDestroy();
      expect(mockStop).toHaveBeenCalled();
      expect(service.state).toBe('idle');
    });
  });
});
