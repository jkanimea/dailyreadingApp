/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  await platformBrowserDynamic().bootstrapModule(AppModule);
}

bootstrap().catch(err => console.error(err));
