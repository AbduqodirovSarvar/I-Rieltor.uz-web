import { InjectionToken, inject } from '@angular/core';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE } from '../http/api-base';

/** The part of SignalR's connection this app uses (a test supplies a fake). */
export interface HubLike {
  on(method: string, handler: (...args: never[]) => void): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  invoke(method: string, ...args: unknown[]): Promise<unknown>;
  onreconnecting(handler: () => void): void;
  onreconnected(handler: () => void): void;
  onclose(handler: () => void): void;
}

/**
 * Creates the auction hub connection. Only the browser calls it: the live view is not rendered on the server.
 * Anonymous: watching an auction needs no token.
 */
export const HUB_FACTORY = new InjectionToken<() => HubLike>('HUB_FACTORY', {
  providedIn: 'root',
  factory: () => {
    const base = inject(API_BASE);
    return () =>
      new HubConnectionBuilder()
        .withUrl(`${base}/hubs/auction`)
        // Quick first retries, then calmer ones; the page shows "reconnecting" meanwhile.
        .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
        .configureLogging(LogLevel.Warning)
        .build();
  },
});
