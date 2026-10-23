import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { failure, ok, tick } from '../../testing/http-helpers';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

@Component({ template: '' })
class Blank {}

describe('layout', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  it('header: links stay in the language, the other language links to the same page', async () => {
    // The app creates I18n in an initializer, before the first navigation.
    TestBed.inject(I18n);
    await TestBed.inject(Router).navigateByUrl('/ru/katalog?page=2');
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const hrefs = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/ru', '/ru/katalog', '/ru/biz-haqida']);
    const lang = el.querySelector('a.lang');
    expect(lang?.getAttribute('href')).toBe('/katalog?page=2');
    expect(lang?.getAttribute('hreflang')).toBe('uz');
  });

  it('header: the phone menu button says its state and every icon button has a name', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const burger = el.querySelector<HTMLButtonElement>('.burger');
    expect(burger?.getAttribute('aria-expanded')).toBe('false');
    burger?.click();
    fixture.detectChanges();
    expect(burger?.getAttribute('aria-expanded')).toBe('true');
    expect(burger?.getAttribute('aria-label')).toBe('Menyuni yopish');
    for (const button of Array.from(el.querySelectorAll('button')))
      expect((button.getAttribute('aria-label') ?? button.textContent ?? '').trim()).not.toBe('');
  });

  it('header: sign-in links appear only once the page runs in the browser', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    // After the first render (hydration finished) the guest sees sign in and sign up.
    await fixture.whenStable();
    fixture.detectChanges();
    const labels = Array.from(el.querySelectorAll('.tools a.btn')).map((a) =>
      a.textContent?.trim(),
    );
    expect(labels).toContain('Kirish');
    expect(labels).toContain('Ro‘yxatdan o‘tish');
  });

  it('footer: shows the company contacts when there are some', async () => {
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    backend.expectOne('/api/Company/public').flush(
      ok({
        name: 'Rieltor MChJ',
        address: 'Toshkent, Amir Temur 1',
        phoneNumber: '+998901234567',
        phoneNumber2: null,
        email: 'info@example.uz',
      }),
    );
    await tick();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Rieltor MChJ');
    expect(text).toContain('+998 90 123 45 67');
    expect(fixture.nativeElement.querySelector('a[href="tel:+998901234567"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="mailto:info@example.uz"]')).toBeTruthy();
  });

  it('footer: a missing company (404) is not an error, the contacts are just left out', async () => {
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    backend
      .expectOne('/api/Company/public')
      .flush(failure(404, 'Not found'), { status: 404, statusText: 'Not Found' });
    await tick();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('I-Rieltor');
    expect(text).not.toContain('Aloqa');
  });
});
