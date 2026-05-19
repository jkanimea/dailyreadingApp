/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    const jeepEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
    await defineCustomElements(window);
  }

  await platformBrowserDynamic().bootstrapModule(AppModule);
}

bootstrap().catch(err => console.error(err));
