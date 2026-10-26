import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { I18n } from '../../core/i18n/i18n.service';
import { NotificationsService, countUnread } from '../../core/notifications/notifications.service';
import { hoursFromNow } from '../../testing/factories';
import { ok, tick } from '../../testing/http-helpers';
import { NotificationsPage } from './notifications-page';

@Component({ template: '' })
class Blank {}

const note = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  createdAt: hoursFromNow(-1),
  type: 'APPLICATION_APPROVED',
  subject: 'Ariza tasdiqlandi',
  body: 'Lot 2026-000777: arizangiz tasdiqlandi.',
  auctionId: null,
  ...over,
});

describe('notifications', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'kabinet/bildirishnomalar', component: NotificationsPage },
          { path: '**', component: Blank },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(I18n);
  });

  it('counts only the messages newer than the last one the person looked at', () => {
    const items = [{ createdAt: '2026-10-26T10:00:00Z' }, { createdAt: '2026-10-26T08:00:00Z' }];
    expect(countUnread(items, 0)).toBe(2);
    expect(countUnread(items, Date.parse('2026-10-26T09:00:00Z'))).toBe(1);
    expect(countUnread(items, Date.parse('2026-10-26T10:00:00Z'))).toBe(0);
    expect(countUnread([], 0)).toBe(0);
  });

  it('remembers what was seen in this browser, and a blocked storage does not break it', () => {
    const service = TestBed.inject(NotificationsService);
    service.load().subscribe();
    backend
      .expectOne('/api/Notification/my')
      .flush(ok([note({ id: 'a', createdAt: '2026-10-26T10:00:00Z' })]));
    expect(service.unread()).toBe(1);
    service.markSeen();
    expect(service.unread()).toBe(0);
    expect(localStorage.getItem('irieltor.web.notifications-seen')).toBe(
      String(Date.parse('2026-10-26T10:00:00Z')),
    );
  });

  it('shows the messages, marks the ones that were new, and then counts them as seen', async () => {
    localStorage.setItem('irieltor.web.notifications-seen', String(Date.now() - 30 * 60_000));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/kabinet/bildirishnomalar');
    harness.detectChanges();
    backend
      .expectOne('/api/Notification/my')
      .flush(
        ok([
          note({ id: 'new', createdAt: hoursFromNow(-0.1), auctionId: 'a1' }),
          note({ id: 'old', createdAt: hoursFromNow(-5), subject: null, body: 'Eski xabar' }),
        ]),
      );
    await tick();
    harness.detectChanges();
    await tick();
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    const cards = Array.from(el.querySelectorAll('li.card')) as HTMLElement[];
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Ariza tasdiqlandi');
    expect(cards[0].textContent).toContain('Yangi');
    expect(cards[0].querySelector('a[href="/auksion/a1"]')).toBeTruthy();
    expect(cards[1].textContent).toContain('Xabar');
    expect(cards[1].textContent).toContain('Eski xabar');
    expect(cards[1].textContent).not.toContain('Yangi');
    // Looked at: the badge is clear.
    expect(TestBed.inject(NotificationsService).unread()).toBe(0);
  });

  it('says so when there are no messages', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/kabinet/bildirishnomalar');
    harness.detectChanges();
    backend.expectOne('/api/Notification/my').flush(ok([]));
    await tick();
    harness.detectChanges();
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Hali xabar yo‘q.');
  });
});
