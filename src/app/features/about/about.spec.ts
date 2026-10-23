import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { failure, ok, tick } from '../../testing/http-helpers';
import { LegalPage } from '../legal/legal-page';
import { AboutPage } from './about-page';

describe('AboutPage', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function load(answer: (r: ReturnType<HttpTestingController['expectOne']>) => void) {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    answer(backend.expectOne('/api/Company/public'));
    await tick();
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the company, its contacts and a map link, and describes it to search engines', async () => {
    const fixture = await load((r) =>
      r.flush(
        ok({
          name: 'Rieltor MChJ',
          description: 'Auksion o‘tkazamiz',
          mission: 'Shaffoflik',
          address: 'Toshkent, Amir Temur 1',
          location: null,
          phoneNumber: '+998901234567',
          phoneNumber2: null,
          email: 'info@r.uz',
          latitude: 41.31,
          longitude: 69.24,
          logo: null,
        }),
      ),
    );
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Rieltor MChJ');
    expect(el.textContent).toContain('Shaffoflik');
    expect(el.querySelector('a[href="tel:+998901234567"]')).toBeTruthy();
    expect(el.querySelector('a[href^="https://www.openstreetmap.org"]')?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Auksion o‘tkazamiz',
    );
    expect(document.head.querySelector('script[data-seo-jsonld]')?.textContent).toContain(
      'Organization',
    );
  });

  it('a company that is not filled in yet gives a friendly empty page, not an error', async () => {
    const fixture = await load((r) =>
      r.flush(failure(404, 'Company information has not been filled in yet.'), {
        status: 404,
        statusText: 'Not Found',
      }),
    );
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ma’lumot hali kiritilmagan');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('LegalPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('shows the rules and the privacy policy, each with its title and a draft notice', () => {
    for (const [kind, title] of [
      ['rules', 'Qoidalar'],
      ['privacy', 'Maxfiylik siyosati'],
    ] as const) {
      const fixture = TestBed.createComponent(LegalPage);
      fixture.componentRef.setInput('kind', kind);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('h1')?.textContent).toBe(title);
      expect(el.querySelectorAll('section').length).toBe(3);
      expect(el.querySelector('.notice')?.textContent).toContain('Namunaviy');
      expect(document.title).toBe(`${title} | I-Rieltor`);
    }
  });
});
