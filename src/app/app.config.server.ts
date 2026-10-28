import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE } from './core/http/api-base';

/** Where the server reaches the API: inside the Docker network `http://api:8080`, on a developer machine the local API. */
const apiInternalUrl = (process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:8081').replace(
  /\/$/,
  '',
);

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE, useValue: apiInternalUrl },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
