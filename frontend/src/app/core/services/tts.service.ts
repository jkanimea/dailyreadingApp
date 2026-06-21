import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export type TtsState = 'idle' | 'speaking' | 'paused';

@Injectable({ providedIn: 'root' })
export class TtsService implements OnDestroy {
  private stateSubject = new BehaviorSubject<TtsState>('idle');

  state$: Observable<TtsState> = this.stateSubject.asObservable();

  get state(): TtsState {
    return this.stateSubject.value;
  }

  get supported(): boolean {
    return true;
  }

  speak(text: string): void {
    if (!text || !text.trim()) return;

    this.stop();

    this.stateSubject.next('speaking');

    TextToSpeech.speak({ text, rate: 1, pitch: 1, volume: 1 })
      .then(() => this.stateSubject.next('idle'))
      .catch(() => this.stateSubject.next('idle'));
  }

  stop(): void {
    TextToSpeech.stop().catch(() => {});
    if (this.stateSubject.value !== 'idle') {
      this.stateSubject.next('idle');
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
