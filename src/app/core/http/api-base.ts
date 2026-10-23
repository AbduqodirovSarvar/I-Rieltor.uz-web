import { InjectionToken } from '@angular/core';

/**
 * Where API calls go. In the browser it is empty (same origin: Nginx or the dev proxy forwards `/api`, `/hubs`, `/uploads`).
 * On the server (SSR) it is the API's internal address, set in `app.config.server.ts`.
 */
export const API_BASE = new InjectionToken<string>('API_BASE', { factory: () => '' });
