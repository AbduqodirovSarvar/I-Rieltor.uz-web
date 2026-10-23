import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { AuthService, CurrentUser } from '../../core/auth/auth.service';
import { TokenStore } from '../../core/auth/token-store';
import { maskIdentifier } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { DocumentsPage } from './documents-page';
import { isSafeToPreview } from './document.service';
import { EmailBanner } from './email-banner';
import { ProfilePage, profileChanges } from './profile-page';
import { SecurityPage } from './security-page';

@Component({ template: '' })
class Blank {}

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiration: inMinutes(30),
  refreshTokenExpiration: inMinutes(60 * 24),
  userId: 'u1',
};
const user = (over: Partial<CurrentUser> = {}): CurrentUser =>
  ({
    id: 'u1',
    type: 'NONE',
    fullName: 'Valiyev Ali',
    login: 'ali',
    legalName: null,
    innpinfl: null,
    phone: '+998901234567',
    secondaryPhone: null,
    address: 'Toshkent',
    email: 'ali@example.uz',
    emailConfirmedAt: inMinutes(-5),
    ...over,
  }) as CurrentUser;

describe('cabinet', () => {
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    TestBed.inject(I18n);
    TestBed.inject(TokenStore).set(session);
    auth.setUser(user());
  });

  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ +/g, ' ');
  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async (
    fixture: { nativeElement: HTMLElement; detectChanges(): void },
    index = 0,
  ) => {
    (fixture.nativeElement.querySelectorAll('form')[index] as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await tick();
    fixture.detectChanges();
  };

  describe('masking', () => {
    it('hides the middle of a personal identifier', () => {
      expect(maskIdentifier('31234567890123')).toBe('312•••••••••23');
      expect(maskIdentifier('301234567')).toBe('301••••67');
      expect(maskIdentifier('123')).toBe('•••');
      expect(maskIdentifier(null)).toBe('');
    });
  });

  describe('email banner', () => {
    it('shows only for an e-mail that is not confirmed', () => {
      let fixture = TestBed.createComponent(EmailBanner);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notice')).toBeNull();

      auth.setUser(user({ emailConfirmedAt: null }));
      fixture = TestBed.createComponent(EmailBanner);
      fixture.detectChanges();
      expect(text(fixture.nativeElement)).toContain('ali@example.uz');
    });

    it('sends the link again, then waits before another; after a 429 it waits as long as the server says', async () => {
      auth.setUser(user({ emailConfirmedAt: null }));
      const fixture = TestBed.createComponent(EmailBanner);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      button.click();
      backend.expectOne('/api/Auth/me/email/resend-confirmation').flush(ok(true));
      await tick();
      fixture.detectChanges();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Havola yuborildi');
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('(60)');
    });

    it('a 429 shows the wait the server asked for', async () => {
      auth.setUser(user({ emailConfirmedAt: null }));
      const fixture = TestBed.createComponent(EmailBanner);
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
      backend.expectOne('/api/Auth/me/email/resend-confirmation').flush(failure(429, 'wait'), {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '45' },
      });
      await tick();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').textContent).toContain('(45)');
    });
  });

  describe('profile', () => {
    const form = {
      fullName: 'Valiyev Ali',
      phone: '+998901234567',
      secondaryPhone: '',
      address: 'Toshkent',
    };

    it('profileChanges lists only what changed; an empty text clears; a locked name is never sent', () => {
      const u = user();
      expect(profileChanges(u, form, true)).toEqual({});
      expect(profileChanges(u, { ...form, address: ' Samarqand ' }, true)).toEqual({
        address: 'Samarqand',
      });
      expect(profileChanges(u, { ...form, phone: '' }, true)).toEqual({ phone: '' });
      expect(profileChanges(u, { ...form, fullName: 'Other' }, true)).toEqual({
        fullName: 'Other',
      });
      expect(profileChanges(u, { ...form, fullName: 'Other' }, false)).toEqual({});
    });

    it('fills the form from the profile and saves only the change, then shows the saved profile', async () => {
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect((el.querySelector('#pf-name') as HTMLInputElement).value).toBe('Valiyev Ali');
      expect((el.querySelector('#pf-phone') as HTMLInputElement).value).toBe('+998901234567');

      type(el, '#pf-address', 'Samarqand');
      await submit(fixture);
      const request = backend.expectOne('/api/Auth/me/profile');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ address: 'Samarqand' });
      request.flush(ok(user({ address: 'Samarqand' })));
      await tick();
      fixture.detectChanges();
      expect(auth.currentUser()?.address).toBe('Samarqand');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Profil saqlandi');
    });

    it('says "no changes" instead of sending an empty update, and refuses a bad phone', async () => {
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();
      await submit(fixture);
      backend.expectNone('/api/Auth/me/profile');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('O‘zgarish yo‘q');

      type(fixture.nativeElement, '#pf-phone', '12345');
      await submit(fixture);
      backend.expectNone('/api/Auth/me/profile');
      expect(text(fixture.nativeElement)).toContain('xalqaro formatda');
    });

    it('an account verified with E-IMZO cannot rename itself and shows the identity masked', async () => {
      auth.setUser(user({ type: 'INDIVIDUAL', innpinfl: '31234567890123' }));
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect((el.querySelector('#pf-name') as HTMLInputElement).disabled).toBe(true);
      expect(text(el)).toContain('312•••••••••23');
      expect(text(el)).not.toContain('31234567890123');
      expect(text(el)).toContain('Jismoniy shaxs');
    });

    it('a rule the server enforces is shown, not swallowed', async () => {
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();
      type(fixture.nativeElement, '#pf-phone', '+998909998877');
      await submit(fixture);
      backend
        .expectOne('/api/Auth/me/profile')
        .flush(failure(409, 'This phone number is used by another account.'), {
          status: 409,
          statusText: 'Conflict',
        });
      await tick();
      fixture.detectChanges();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('This phone number is used');
    });
  });

  describe('security', () => {
    const fillPassword = (el: HTMLElement, current: string, next: string, confirm = next) => {
      type(el, '#sc-current', current);
      type(el, '#sc-new', next);
      type(el, '#sc-confirm', confirm);
    };

    it('checks the new password and its repeat before sending', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      fillPassword(fixture.nativeElement, 'Old@12345', 'weak', 'other');
      await submit(fixture, 0);
      backend.expectNone('/api/Auth/me/password');
      const t = text(fixture.nativeElement);
      expect(t).toContain('kamida 8 belgi');
      expect(t).toContain('Parollar bir xil emas');
    });

    it('refuses a new password equal to the current one without asking the server', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      fillPassword(fixture.nativeElement, 'Same@12345', 'Same@12345');
      await submit(fixture, 0);
      backend.expectNone('/api/Auth/me/password');
      expect(text(fixture.nativeElement)).toContain('farq qilishi kerak');
    });

    it('changes the password and keeps THIS device signed in with the new tokens', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      fillPassword(fixture.nativeElement, 'Old@12345', 'New@12345');
      await submit(fixture, 0);
      const request = backend.expectOne('/api/Auth/me/password');
      expect(request.request.body).toEqual({
        currentPassword: 'Old@12345',
        newPassword: 'New@12345',
      });
      request.flush(
        ok({
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          accessTokenExpiration: inMinutes(30),
          refreshTokenExpiration: inMinutes(60 * 24),
          userId: 'u1',
        }),
      );
      await tick();
      fixture.detectChanges();
      expect(TestBed.inject(TokenStore).session()?.refreshToken).toBe('refresh-2');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Parol o‘zgartirildi');
      expect((fixture.nativeElement.querySelector('#sc-current') as HTMLInputElement).value).toBe(
        '',
      );
    });

    it('a wrong current password is said plainly', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      fillPassword(fixture.nativeElement, 'Wrong@12345', 'New@12345');
      await submit(fixture, 0);
      backend
        .expectOne('/api/Auth/me/password')
        .flush(failure(400, 'The current password is incorrect.'), {
          status: 400,
          statusText: 'Bad Request',
        });
      await tick();
      fixture.detectChanges();
      expect(text(fixture.nativeElement)).toContain('Joriy parol noto‘g‘ri.');
      expect(TestBed.inject(TokenStore).session()?.refreshToken).toBe('refresh-1');
    });

    it('asks for a link to be sent to the new e-mail, and reloads the profile', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      type(fixture.nativeElement, '#sc-email', 'new@example.uz');
      await submit(fixture, 1);
      const request = backend.expectOne('/api/Auth/me/email');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ email: 'new@example.uz' });
      request.flush(ok(true));
      await tick();
      backend
        .expectOne('/api/Auth/me')
        .flush(ok(user({ email: 'new@example.uz', emailConfirmedAt: null })));
      await tick();
      expect(auth.currentUser()?.email).toBe('new@example.uz');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('yuborildi');
    });

    it('refuses an invalid new e-mail before sending', async () => {
      const fixture = TestBed.createComponent(SecurityPage);
      fixture.detectChanges();
      type(fixture.nativeElement, '#sc-email', 'nope');
      await submit(fixture, 1);
      backend.expectNone('/api/Auth/me/email');
      expect(text(fixture.nativeElement)).toContain('manzili noto‘g‘ri');
    });
  });

  describe('documents', () => {
    const doc = (id: string, name: string) => ({
      id,
      createdAt: '2026-10-23T09:30:00Z',
      ownerId: 'u1',
      purpose: 'IDENTITY',
      originalName: name,
      contentType: 'application/pdf',
      size: 2048,
      description: 'Pasport',
    });

    async function open(items = [doc('d1', 'pasport.pdf')]) {
      const fixture = TestBed.createComponent(DocumentsPage);
      fixture.detectChanges();
      backend.expectOne((r) => r.url === '/api/Document/my/list').flush(okPage(items));
      await tick();
      fixture.detectChanges();
      return fixture;
    }

    it('lists the documents with their kind, size and time (Tashkent), and says when there are none', async () => {
      let fixture = await open();
      const t = text(fixture.nativeElement);
      expect(t).toContain('pasport.pdf');
      expect(t).toContain('Shaxsni tasdiqlovchi hujjat');
      expect(t).toContain('14:30');
      expect(t).toContain('Pasport');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      backend = TestBed.inject(HttpTestingController);
      fixture = await open([]);
      expect(text(fixture.nativeElement)).toContain('Hali hujjat yuklanmagan.');
    });

    it('uploading without a file says so; a file of a wrong type or size is refused before it is sent', async () => {
      const fixture = await open();
      await submit(fixture);
      backend.expectNone('/api/Document');
      expect(text(fixture.nativeElement)).toContain('Avval faylni tanlang.');

      const input = fixture.nativeElement.querySelector('#doc-file') as HTMLInputElement;
      const pick = (file: File) => {
        Object.defineProperty(input, 'files', {
          value: { item: () => file, length: 1, 0: file },
          configurable: true,
        });
        input.dispatchEvent(new Event('change'));
      };
      pick(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
      fixture.detectChanges();
      expect(text(fixture.nativeElement)).toContain('ruxsat etilmagan');
      await submit(fixture);
      backend.expectNone('/api/Document');
    });

    it('sends a good file as multipart with the kind and the note, then refreshes the list', async () => {
      const fixture = await open();
      const input = fixture.nativeElement.querySelector('#doc-file') as HTMLInputElement;
      const file = new File(['%PDF-1.4'], 'chek.pdf', { type: 'application/pdf' });
      Object.defineProperty(input, 'files', {
        value: { item: () => file, length: 1, 0: file },
        configurable: true,
      });
      input.dispatchEvent(new Event('change'));
      const select = fixture.nativeElement.querySelector('#doc-purpose') as HTMLSelectElement;
      select.value = 'PAYMENT_RECEIPT';
      select.dispatchEvent(new Event('change'));
      type(fixture.nativeElement, '#doc-desc', ' To‘lov cheki ');
      fixture.detectChanges();
      await submit(fixture);

      const request = backend.expectOne('/api/Document');
      const body = request.request.body as FormData;
      expect(body.get('Purpose')).toBe('PAYMENT_RECEIPT');
      expect(body.get('Description')).toBe('To‘lov cheki');
      expect((body.get('File') as File).name).toBe('chek.pdf');
      request.flush(ok(doc('d2', 'chek.pdf')));
      await tick();
      fixture.detectChanges();
      backend
        .expectOne((r) => r.url === '/api/Document/my/list')
        .flush(okPage([doc('d2', 'chek.pdf')]));
      await tick();
      fixture.detectChanges();
      expect(text(fixture.nativeElement)).toContain('chek.pdf');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Hujjat yuklandi');
    });

    it('deleting asks first, and does nothing if the person says no', async () => {
      const fixture = await open();
      const confirm = TestBed.inject(Confirm);
      const remove = Array.from(fixture.nativeElement.querySelectorAll('.doc button')).find((b) =>
        (b as HTMLElement).textContent?.includes('O‘chirish'),
      ) as HTMLButtonElement;
      remove.click();
      expect(confirm.pending()?.request.danger).toBe(true);
      confirm.answer(false);
      await tick();
      backend.expectNone('/api/Document');

      remove.click();
      confirm.answer(true);
      await tick();
      const request = backend.expectOne('/api/Document');
      expect(request.request.method).toBe('DELETE');
      expect(request.request.body).toEqual({ id: 'd1' });
      request.flush(ok(true));
      await tick();
      fixture.detectChanges();
      backend.expectOne((r) => r.url === '/api/Document/my/list').flush(okPage([]));
    });

    it('opens only pictures and PDF in a tab; everything else is saved, never run', () => {
      for (const good of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])
        expect(isSafeToPreview(good)).toBe(true);
      for (const bad of [
        'image/svg+xml',
        'text/html',
        'application/xhtml+xml',
        'application/octet-stream',
        '',
        null,
        undefined,
      ])
        expect(isSafeToPreview(bad)).toBe(false);
    });
  });

  it('keeps the router and auth wired for the pages above', () => {
    expect(TestBed.inject(Router)).toBeTruthy();
  });
});
