import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type TtsState = 'idle' | 'speaking' | 'paused';

@Injectable({ providedIn: 'root' })
export class TtsService implements OnDestroy {
  private stateSubject = new BehaviorSubject<TtsState>('idle');
  private utterance: SpeechSynthesisUtterance | null = null;

  state$: Observable<TtsState> = this.stateSubject.asObservable();

  get state(): TtsState {
    return this.stateSubject.value;
  }

  get supported(): boolean {
    return 'speechSynthesis' in window && !!window.speechSynthesis;
  }

  speak(text: string): void {
    if (!this.supported || !text || !text.trim()) return;

    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = 1;
    this.utterance.pitch = 1;
    this.utterance.volume = 1;

    this.utterance.onstart = () => this.stateSubject.next('speaking');
    this.utterance.onend = () => this.stateSubject.next('idle');
    this.utterance.onerror = () => this.stateSubject.next('idle');
    this.utterance.onpause = () => this.stateSubject.next('paused');
    this.utterance.onresume = () => this.stateSubject.next('speaking');

    window.speechSynthesis.speak(this.utterance);
  }

  pause(): void {
    if (this.supported && this.state === 'speaking') {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.supported && this.state === 'paused') {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (this.supported) {
      window.speechSynthesis.cancel();
      this.utterance = null;
      if (this.stateSubject.value !== 'idle') {
        this.stateSubject.next('idle');
      }
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
