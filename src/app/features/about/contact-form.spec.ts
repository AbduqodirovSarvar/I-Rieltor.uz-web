import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { I18n } from '../../core/i18n/i18n.service';
import { failure, ok, tick } from '../../testing/http-helpers';
import { ContactForm } from './contact-form';

describe('ContactForm', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(I18n);
  });

  function open() {
    const fixture = TestBed.createComponent(ContactForm);
    fixture.detectChanges();
    return fixture;
  }
  const el = (f: ReturnType<typeof open>) => f.nativeElement as HTMLElement;
  const type = (f: ReturnType<typeof open>, id: string, value: string) => {
    const field = el(f).querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };
  const submit = async (f: ReturnType<typeof open>) => {
    (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await tick();
    f.detectChanges();
  };
  const fill = (f: ReturnType<typeof open>) => {
    type(f, 'ct-name', ' Ali Valiyev ');
    type(f, 'ct-email', 'ali@example.uz');
    type(f, 'ct-message', 'Salom, narx haqida bilmoqchiman.');
  };

  it('needs a name, a long enough message and a phone or an e-mail before it sends anything', async () => {
    const f = open();
    await submit(f);
    backend.expectNone('/api/Contact');
    expect(el(f).textContent).toContain('Majburiy maydon');
    expect(el(f).textContent).toContain('telefon raqami yoki elektron pochta');

    type(f, 'ct-name', 'Ali');
    type(f, 'ct-email', 'ali@example.uz');
    type(f, 'ct-message', 'qisqa');
    await submit(f);
    backend.expectNone('/api/Contact');
    expect(el(f).textContent).toContain('Matn juda qisqa.');
  });

  it('sends only what was filled, empties the form and says thanks', async () => {
    const f = open();
    fill(f);
    await submit(f);
    const request = backend.expectOne('/api/Contact');
    expect(request.request.body).toEqual({
      name: 'Ali Valiyev',
      email: 'ali@example.uz',
      message: 'Salom, narx haqida bilmoqchiman.',
      website: '',
    });
    request.flush(ok(true));
    await tick();
    f.detectChanges();
    expect(el(f).querySelector('.notice-success')?.textContent).toContain('yuborildi');
    expect((el(f).querySelector('#ct-name') as HTMLInputElement).value).toBe('');
  });

  it('the hidden trap field is out of reach for people, and is sent as it is', async () => {
    const f = open();
    const trap = el(f).querySelector('.trap') as HTMLElement;
    expect(trap.getAttribute('aria-hidden')).toBe('true');
    expect(trap.querySelector('input')?.getAttribute('tabindex')).toBe('-1');
    fill(f);
    type(f, 'ct-website', 'http://spam.example');
    await submit(f);
    expect(backend.expectOne('/api/Contact').request.body.website).toBe('http://spam.example');
  });

  it('too many messages (429) make the button wait', async () => {
    const f = open();
    fill(f);
    await submit(f);
    backend.expectOne('/api/Contact').flush(failure(429, 'slow down'), {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'Retry-After': '45' },
    });
    await tick();
    f.detectChanges();
    expect(el(f).textContent).toContain('45');
    expect((el(f).querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    expect(el(f).querySelector('.notice-success')).toBeNull();
  });

  it('a server that cannot send (503) is reported and the text stays for another try', async () => {
    const f = open();
    fill(f);
    await submit(f);
    backend.expectOne('/api/Contact').flush(failure(503, 'The contact form is not set up yet.'), {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await tick();
    f.detectChanges();
    expect(el(f).querySelector('.notice-success')).toBeNull();
    expect((el(f).querySelector('#ct-message') as HTMLTextAreaElement).value).toContain('narx');
  });
});
