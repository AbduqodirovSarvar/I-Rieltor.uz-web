import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MyNotification } from '../../api/models';
import { ApiClient } from '../http/api-client';

const SEEN_KEY = 'irieltor.web.notifications-seen';

/** How many of the messages are newer than the moment the person last looked at the list. */
export function countUnread(items: readonly { createdAt: string }[], seenMs: number): number {
  return items.filter((item) => Date.parse(item.createdAt) > seenMs).length;
}

/**
 * The person's own messages (what was e-mailed or texted to them). The server keeps no "read" mark, so what the person has
 * seen is remembered in this browser only: the time of the newest message they looked at.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiClient);
  private readonly document = inject(DOCUMENT);

  private readonly items = signal<MyNotification[]>([]);
  private readonly seen = signal(this.readSeen());

  readonly list = this.items.asReadonly();
  readonly unread = computed(() => countUnread(this.items(), this.seen()));

  /** Loads the messages and keeps them for the badge. */
  load(): Observable<MyNotification[]> {
    return this.api
      .get<MyNotification[]>('api/Notification/my')
      .pipe(tap((items) => this.items.set(items)));
  }

  /** The person has looked at everything that is in the list now. */
  markSeen(): void {
    const newest = this.items().reduce((max, item) => Math.max(max, Date.parse(item.createdAt)), 0);
    if (newest <= this.seen()) return;
    this.seen.set(newest);
    try {
      this.document.defaultView?.localStorage.setItem(SEEN_KEY, String(newest));
    } catch {
      // Storage blocked: the badge comes back on the next visit.
    }
  }

  /** The time (ms) of the newest message the person has looked at; 0 if they never have. */
  seenMs(): number {
    return this.seen();
  }

  private readSeen(): number {
    try {
      const value = Number(this.document.defaultView?.localStorage.getItem(SEEN_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }
}
