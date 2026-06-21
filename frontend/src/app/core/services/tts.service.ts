import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LoggingService } from './logging.service';

export type TtsState = 'idle' | 'speaking' | 'paused';

@Injectable({ providedIn: 'root' })
export class TtsService implements OnDestroy {
  private stateSubject = new BehaviorSubject<TtsState>('idle');
  private loggingService = inject(LoggingService);
  private readonly CHUNK_SIZE = 3000;
  private generation = 0;

  state$: Observable<TtsState> = this.stateSubject.asObservable();

  get state(): TtsState {
    return this.stateSubject.value;
  }

  get supported(): boolean {
    return true;
  }

  speak(text: string): void {
    if (!text || !text.trim()) return;
    this.speakSegments([text]);
  }

  speakSegments(groupTexts: string[], onGroup?: (index: number) => void): void {
    if (!groupTexts || groupTexts.length === 0) return;

    const allChunks: string[] = [];
    const chunkToGroup: number[] = [];

    for (let i = 0; i < groupTexts.length; i++) {
      const text = groupTexts[i];
      if (!text || !text.trim()) continue;
      const chunks = this.chunkText(text);
      for (const chunk of chunks) {
        allChunks.push(chunk);
        chunkToGroup.push(i);
      }
    }

    if (allChunks.length === 0) return;

    this.stop();

    this.loggingService.info('TtsService', `speakSegments: ${groupTexts.length} groups, ${allChunks.length} chunks`);

    const gen = ++this.generation;
    this.stateSubject.next('speaking');

    this.speakNextSegment(allChunks, 0, gen, chunkToGroup, onGroup);
  }

  stop(): void {
    this.generation++;
    TextToSpeech.stop().catch(() => {});
    if (this.stateSubject.value !== 'idle') {
      this.stateSubject.next('idle');
    }
  }

  private chunkText(text: string): string[] {
    if (!text || text.length <= this.CHUNK_SIZE) {
      return text ? [text] : [];
    }
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + this.CHUNK_SIZE, text.length);
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) {
          end = lastSpace;
        }
      }
      chunks.push(text.slice(start, end));
      start = end;
    }
    return chunks;
  }

  private speakNextSegment(
    chunks: string[],
    index: number,
    gen: number,
    chunkToGroup: number[],
    onGroup?: (index: number) => void
  ): void {
    if (gen !== this.generation) return;

    if (index >= chunks.length) {
      this.stateSubject.next('idle');
      return;
    }

    if (onGroup && (index === 0 || chunkToGroup[index] !== chunkToGroup[index - 1])) {
      onGroup(chunkToGroup[index]);
    }

    TextToSpeech.speak({ text: chunks[index], rate: 1, pitch: 1, volume: 1 })
      .then(() => {
        this.speakNextSegment(chunks, index + 1, gen, chunkToGroup, onGroup);
      })
      .catch((err) => {
        this.loggingService.error('TtsService', 'speakSegments', `TTS chunk failed: ${err}`);
        this.stateSubject.next('idle');
      });
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
