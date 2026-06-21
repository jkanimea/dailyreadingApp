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
    it('should call TextToSpeech.speak with text and default options for short text', () => {
      service.speak('Hello world');
      expect(mockSpeak).toHaveBeenCalledWith({
        text: 'Hello world',
        rate: 1,
        pitch: 1,
        volume: 1,
      });
    });

    it('should call TextToSpeech.speak for each chunk when text exceeds CHUNK_SIZE', async () => {
      const longText = 'a'.repeat(3500);
      service.speak(longText);
      await new Promise(r => setTimeout(r, 0));

      expect(mockSpeak).toHaveBeenCalledTimes(2);
      expect(mockSpeak).toHaveBeenNthCalledWith(1, {
        text: 'a'.repeat(3000),
        rate: 1, pitch: 1, volume: 1,
      });
      expect(mockSpeak).toHaveBeenNthCalledWith(2, {
        text: 'a'.repeat(500),
        rate: 1, pitch: 1, volume: 1,
      });
    });

    it('should call TextToSpeech.speak once when text is within CHUNK_SIZE', () => {
      service.speak('Small text');
      expect(mockSpeak).toHaveBeenCalledTimes(1);
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
      expect(mockStop).toHaveBeenCalled();
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

  describe('chunkText', () => {
    it('should split at word boundaries when possible', () => {
      // Three 'words' of 2500/2500/1000 chars separated by spaces (total 6002 chars).
      // chunkText keeps the space at the split boundary; middle chunk has a leading space.
      const text = 'a'.repeat(2500) + ' ' + 'b'.repeat(2500) + ' ' + 'c'.repeat(1000);
      const chunks = (service as any).chunkText(text);
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toBe('a'.repeat(2500));
      expect(chunks[1]).toBe(' ' + 'b'.repeat(2500));
    });

    it('should return single chunk for short text', () => {
      const chunks = (service as any).chunkText('Hello world');
      expect(chunks).toEqual(['Hello world']);
    });
  });

  describe('speakSegments', () => {
    it('should fire onGroup at each group transition', async () => {
      const groups = ['First group text.', 'Second group text.', 'Third group text.'];
      const onGroup = jest.fn();
      service.speakSegments(groups, onGroup);
      await new Promise(r => setTimeout(r, 0));

      expect(mockSpeak).toHaveBeenCalledTimes(3);
      expect(onGroup).toHaveBeenCalledTimes(3);
      expect(onGroup).toHaveBeenNthCalledWith(1, 0);
      expect(onGroup).toHaveBeenNthCalledWith(2, 1);
      expect(onGroup).toHaveBeenNthCalledWith(3, 2);
    });

    it('should handle empty group array without error', () => {
      const onGroup = jest.fn();
      service.speakSegments([], onGroup);
      expect(mockSpeak).not.toHaveBeenCalled();
      expect(onGroup).not.toHaveBeenCalled();
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

    it('should abort remaining chunks when called during speak', async () => {
      const longText = 'a'.repeat(10000);
      service.speak(longText);
      service.stop();
      await new Promise(r => setTimeout(r, 0));

      expect(mockSpeak).toHaveBeenCalledTimes(1);
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
