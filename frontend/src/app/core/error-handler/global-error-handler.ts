import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private loggingService: LoggingService,
    private ngZone: NgZone
  ) {}

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    this.ngZone.runOutsideAngular(() => {
      this.loggingService.error('GlobalErrorHandler', message, stack);
    });

    console.error(error);
  }
}
