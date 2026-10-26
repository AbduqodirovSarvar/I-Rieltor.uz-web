import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { I18n } from '../../core/i18n/i18n.service';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';
import { hoursFromNow, participation, payment } from '../../testing/factories';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { ApplicationsPage } from './applications-page';
import { PayPage } from './pay-page';
import { PaymentResultPage } from './payment-result-page';
import { PaymentsPage } from './payments-page';

@Component({ template: '' })
class Blank {}

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ +/g, ' ');
const award = (over: Record<string, unknown>) =>
  ({
    rank: 1,
    status: 'ACCEPTED',
    price: 520_000_000,
    amountDue: 500_000_000,
    respondBy: null,
    paymentDueAt: null,
    ...over,
  }) as never;

describe('applications, payments and the pay page', () => {
  let backend: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'kabinet/arizalar', component: ApplicationsPage },
            { path: 'kabinet/tolovlar', component: PaymentsPage },
            { path: 'kabinet/tolov/:auctionId', component: PayPage },
            { path: 'tolov/natija', component: PaymentResultPage },
            { path: '**', component: Blank },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    TestBed.inject(I18n);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => vi.useRealTimers());

  const el = () => harness.routeNativeElement as HTMLElement;
  const myList = () => backend.expectOne((r) => r.url === '/api/Participation/my');
  const myPayments = () => backend.expectOne((r) => r.url === '/api/Payment/my');
  const settle = async () => {
    await tick();
    harness.detectChanges();
    await tick();
    harness.detectChanges();
  };
  const buttonWith = (label: string) =>
    Array.from(el().querySelectorAll('button, a')).find((b) =>
      b.textContent?.includes(label),
    ) as HTMLElement;

  async function openApplications(items = [participation()]) {
    await harness.navigateByUrl('/kabinet/arizalar');
    harness.detectChanges();
    myList().flush(okPage(items));
    await settle();
  }

  describe('applications', () => {
    it('says so, with a way forward, when there are none', async () => {
      await openApplications([]);
      expect(text(el())).toContain('Hali ariza bermagansiz.');
      expect(el().querySelector('a[href="/katalog"]')).toBeTruthy();
    });

    it('shows where each application stands and the one next step', async () => {
      await openApplications([
        participation({ status: 'PENDING' }),
        participation({
          id: 'b',
          auctionId: 'a2',
          depositStatus: 'PAID',
          auctionStatus: 'ONGOING',
        }),
        participation({ id: 'c', auctionId: 'a3' }),
      ]);
      const cards = Array.from(el().querySelectorAll('li.card'));
      expect(text(cards[0] as HTMLElement)).toContain('Arizangiz ko‘rib chiqilmoqda');
      expect(text(cards[1] as HTMLElement)).toContain('Savdo ketmoqda: taklif bering');
      expect(cards[1].querySelector('a[href="/auksion/a2"]')).toBeTruthy();
      expect(text(cards[2] as HTMLElement)).toContain('Zakalatni to‘lang');
      expect(cards[2].querySelector('a[href^="/kabinet/tolov/a3"]')?.getAttribute('href')).toBe(
        '/kabinet/tolov/a3?purpose=DEPOSIT',
      );
    });

    it('shows a rejection with its reason and a way to apply again', async () => {
      await openApplications([
        participation({ status: 'REJECTED', rejectReason: 'Hujjat yetarli emas' }),
      ]);
      expect(text(el())).toContain('Rad etish sababi: Hujjat yetarli emas');
      expect(buttonWith('Qayta ariza berish')).toBeTruthy();
    });

    it('a winner sees the price, the sum due, the deadline, and may pay or give up', async () => {
      await openApplications([
        participation({
          auctionStatus: 'FINISHED',
          depositStatus: 'PAID',
          award: award({ paymentDueAt: hoursFromNow(20) }),
        }),
      ]);
      const t = text(el());
      expect(t).toContain('Tabriklaymiz! Yakuniy to‘lovni to‘lang');
      expect(t).toContain('520');
      expect(t).toContain('To‘lov muddati:');
      expect(buttonWith('Yakuniy to‘lovni to‘lash').getAttribute('href')).toBe(
        '/kabinet/tolov/a1?purpose=FINAL_PAYMENT',
      );
      expect(buttonWith('Xariddan voz kechish')).toBeTruthy();
    });

    it('explains what became of the deposit: given back, kept as a penalty, or still held', async () => {
      await openApplications([
        participation({ auctionStatus: 'FINISHED', depositStatus: 'REFUNDED' }),
        participation({
          id: 'b',
          auctionId: 'a2',
          auctionStatus: 'FINISHED',
          depositStatus: 'FORFEITED',
          award: award({ status: 'DEFAULTED' }),
        }),
        participation({ id: 'c', auctionId: 'a3', depositStatus: 'PAID' }),
      ]);
      const cards = Array.from(el().querySelectorAll('li.card')) as HTMLElement[];
      expect(text(cards[0])).toContain('Zakalatingiz qaytarildi.');
      expect(cards[0].querySelector('.notice-success')).toBeTruthy();
      expect(text(cards[1])).toContain('Zakalat musodara qilindi');
      expect(text(cards[1])).toContain('Xarid amalga oshmadi');
      expect(cards[1].querySelector('.notice-danger')).toBeTruthy();
      expect(text(cards[2])).toContain('auksion yakunigacha ushlab turiladi');
    });

    it('a runner-up offer shows its deadline; after the deadline it is no longer an offer', async () => {
      await openApplications([
        participation({
          auctionStatus: 'FINISHED',
          depositStatus: 'PAID',
          award: award({ status: 'OFFERED', rank: 2, respondBy: hoursFromNow(3) }),
        }),
        participation({
          id: 'b',
          auctionId: 'a2',
          auctionStatus: 'FINISHED',
          depositStatus: 'PAID',
          award: award({ status: 'OFFERED', rank: 2, respondBy: hoursFromNow(-3) }),
        }),
      ]);
      const cards = Array.from(el().querySelectorAll('li.card')) as HTMLElement[];
      expect(text(cards[0])).toContain('Javob muddati:');
      expect(text(cards[0])).toContain('Taklifni qabul qilish');
      expect(text(cards[1])).toContain('Xarid amalga oshmadi');
      expect(text(cards[1])).not.toContain('Taklifni qabul qilish');
    });

    it('taking an application back asks first; "no" sends nothing, "yes" sends and refreshes', async () => {
      await openApplications();
      const confirm = TestBed.inject(Confirm);
      buttonWith('Arizani qaytarib olish').click();
      expect(confirm.pending()?.request.title).toBe('Arizani qaytarib olasizmi?');
      confirm.answer(false);
      await settle();
      backend.expectNone('/api/Participation/withdraw');

      buttonWith('Arizani qaytarib olish').click();
      confirm.answer(true);
      await tick();
      const request = backend.expectOne('/api/Participation/withdraw');
      expect(request.request.body).toEqual({ auctionId: 'a1' });
      request.flush(ok(true));
      await settle();
      myList().flush(okPage([participation({ status: 'WITHDRAWN' })]));
      await settle();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('qaytarib olindi');
      expect(text(el())).toContain('Ariza qaytarib olingan');
    });

    it('when the server refuses (the sale started meanwhile) the person sees why and the list refreshes', async () => {
      await openApplications();
      const confirm = TestBed.inject(Confirm);
      buttonWith('Arizani qaytarib olish').click();
      confirm.answer(true);
      await tick();
      backend
        .expectOne('/api/Participation/withdraw')
        .flush(failure(409, 'The sale has started; the application can no longer be withdrawn.'), {
          status: 409,
          statusText: 'Conflict',
        });
      await settle();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('The sale has started');
      myList().flush(okPage([participation({ auctionStatus: 'ONGOING', depositStatus: 'PAID' })]));
      await settle();
      expect(buttonWith('Arizani qaytarib olish')).toBeUndefined();
    });

    it('giving up a purchase is a warned, destructive question', async () => {
      await openApplications([
        participation({
          auctionStatus: 'FINISHED',
          award: award({ paymentDueAt: hoursFromNow(5) }),
        }),
      ]);
      const confirm = TestBed.inject(Confirm);
      buttonWith('Xariddan voz kechish').click();
      expect(confirm.pending()?.request.danger).toBe(true);
      expect(confirm.pending()?.request.message).toContain('musodara');
      confirm.answer(true);
      await tick();
      backend.expectOne('/api/Participation/refuse').flush(ok(true));
      await settle();
      myList().flush(okPage([]));
    });

    it('an offer can be accepted at once or declined after a question', async () => {
      await openApplications([
        participation({
          auctionStatus: 'FINISHED',
          award: award({ status: 'OFFERED', respondBy: hoursFromNow(3) }),
        }),
      ]);
      expect(text(el())).toContain('Sizga xarid taklif qilindi');
      buttonWith('Taklifni qabul qilish').click();
      await tick();
      const request = backend.expectOne('/api/Participation/offer/accept');
      expect(request.request.body).toEqual({ auctionId: 'a1' });
      request.flush(ok(true));
      await settle();
      myList().flush(okPage([]));
      await settle();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Taklif qabul qilindi');
    });
  });

  describe('payments', () => {
    async function openPayments(items = [payment()]) {
      await harness.navigateByUrl('/kabinet/tolovlar');
      harness.detectChanges();
      myPayments().flush(okPage(items));
      await settle();
    }

    it('lists payments with purpose, amount, method, state and checks', async () => {
      await openPayments([
        payment({
          receipts: [
            {
              id: 'r1',
              originalName: 'chek.pdf',
              contentType: 'application/pdf',
              size: 10,
              ownerId: 'u1',
              description: null,
              createdAt: hoursFromNow(-1),
            },
          ],
        }),
        payment({ id: 'p2', status: 'PAID', provider: 'PAYME', purpose: 'FINAL_PAYMENT' }),
      ]);
      const t = text(el());
      expect(t).toContain('Zakalat:');
      expect(t).toContain('Bank o‘tkazmasi');
      expect(t).toContain('Kutilmoqda');
      expect(t).toContain('chek.pdf');
      expect(t).toContain('To‘langan');
    });

    it('offers to attach a check only to a waiting transfer', async () => {
      await openPayments([
        payment(),
        payment({ id: 'p2', provider: 'PAYME' }),
        payment({ id: 'p3', status: 'PAID' }),
      ]);
      expect(el().querySelectorAll('app-receipt-upload').length).toBe(1);
    });

    it('says when there are no payments', async () => {
      await openPayments([]);
      expect(text(el())).toContain('To‘lovlar hali yo‘q.');
    });
  });

  describe('pay page', () => {
    async function openPay(
      url: string,
      mine = [participation()],
      providers = ['BANK_TRANSFER', 'CARD_TRANSFER', 'PAYME'],
    ) {
      await harness.navigateByUrl(url);
      harness.detectChanges();
      backend.expectOne('/api/Payment/providers').flush(ok(providers));
      myList().flush(okPage(mine));
      await settle();
    }

    it('shows the amount and the methods the server has switched on', async () => {
      await openPay('/kabinet/tolov/a1');
      const t = text(el());
      expect(t).toContain('Zakalat to‘lovi');
      expect(t).toContain('20');
      expect(
        Array.from(el().querySelectorAll('.method')).map((m) => m.textContent?.trim()),
      ).toEqual(['Bank o‘tkazmasi', 'Kartaga o‘tkazma', 'Payme']);
    });

    it('a transfer gives the details to pay by, and then takes the check', async () => {
      await openPay('/kabinet/tolov/a1');
      buttonWith('To‘lovni boshlash').click();
      await tick();
      const request = backend.expectOne('/api/Payment/checkout');
      expect(request.request.body).toEqual({
        auctionId: 'a1',
        purpose: 'DEPOSIT',
        provider: 'BANK_TRANSFER',
      });
      request.flush(
        ok({
          paymentId: 'pay9',
          amount: 20_000_000,
          purpose: 'DEPOSIT',
          provider: 'BANK_TRANSFER',
          url: null,
          instructions: 'Bank, hisob 2020\nMaqsad: pay9',
        }),
      );
      await settle();
      expect(el().querySelector('.instructions')?.textContent).toContain('hisob 2020');
      expect(text(el())).toContain('pay9');
      expect(el().querySelector('app-receipt-upload')).toBeTruthy();
    });

    it('a provider gives a page to go to — but only an https one', async () => {
      await openPay('/kabinet/tolov/a1');
      (el().querySelectorAll('.method input')[2] as HTMLInputElement).click();
      harness.detectChanges();
      buttonWith('To‘lovni boshlash').click();
      await tick();
      backend.expectOne('/api/Payment/checkout').flush(
        ok({
          paymentId: 'pay9',
          amount: 20_000_000,
          purpose: 'DEPOSIT',
          provider: 'PAYME',
          url: 'https://checkout.paycom.uz/abc',
          instructions: null,
        }),
      );
      await settle();
      expect(buttonWith('Payme sahifasiga o‘tish').getAttribute('href')).toBe(
        'https://checkout.paycom.uz/abc',
      );
    });

    it('a javascript: address from the server is not turned into a link', async () => {
      await openPay('/kabinet/tolov/a1');
      buttonWith('To‘lovni boshlash').click();
      await tick();
      backend.expectOne('/api/Payment/checkout').flush(
        ok({
          paymentId: 'p',
          amount: 1,
          purpose: 'DEPOSIT',
          provider: 'PAYME',
          url: 'javascript:alert(1)',
          instructions: null,
        }),
      );
      await settle();
      expect(el().querySelector('a[href^="javascript"]')).toBeNull();
    });

    it('the final payment uses the amount due and shows its deadline', async () => {
      await openPay('/kabinet/tolov/a1?purpose=FINAL_PAYMENT', [
        participation({
          auctionStatus: 'FINISHED',
          depositStatus: 'PAID',
          award: award({ paymentDueAt: hoursFromNow(10) }),
        }),
      ]);
      const t = text(el());
      expect(t).toContain('Yakuniy to‘lov');
      expect(t).toContain('500');
      expect(t).toContain('To‘lov muddati');
      buttonWith('To‘lovni boshlash').click();
      await tick();
      expect(backend.expectOne('/api/Payment/checkout').request.body).toMatchObject({
        purpose: 'FINAL_PAYMENT',
      });
    });

    it('does not start a payment that is already paid', async () => {
      await openPay('/kabinet/tolov/a1', [participation({ depositStatus: 'PAID' })]);
      expect(text(el())).toContain('allaqachon amalga oshirilgan');
      expect(buttonWith('To‘lovni boshlash')).toBeUndefined();
    });

    it('does not start a payment for an auction the person has no approved application in', async () => {
      await openPay('/kabinet/tolov/zzz', []);
      expect(text(el())).toContain('tasdiqlangan arizangiz yo‘q');
    });

    it('when no method is switched on it says so', async () => {
      await openPay('/kabinet/tolov/a1', [participation()], []);
      expect(text(el())).toContain('to‘lov usullari yoqilmagan');
    });

    it('a refusal from the server (the method is off, the deposit is paid) is shown', async () => {
      await openPay('/kabinet/tolov/a1');
      buttonWith('To‘lovni boshlash').click();
      await tick();
      backend
        .expectOne('/api/Payment/checkout')
        .flush(failure(409, 'Payment by BANK_TRANSFER is not available.'), {
          status: 409,
          statusText: 'Conflict',
        });
      await settle();
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('not available');
    });

    it('pressing start twice makes one request', async () => {
      await openPay('/kabinet/tolov/a1');
      const button = buttonWith('To‘lovni boshlash');
      button.click();
      button.click();
      await tick();
      expect(backend.match('/api/Payment/checkout').length).toBe(1);
    });
  });

  describe('payment result page', () => {
    async function openResult(url: string, items: ReturnType<typeof payment>[]) {
      await harness.navigateByUrl(url);
      harness.detectChanges();
      myPayments().flush(okPage(items));
      await settle();
    }

    it('says paid, failed or cancelled, with the way forward', async () => {
      await openResult('/tolov/natija', [payment({ status: 'PAID' })]);
      expect(text(el())).toContain('To‘lov qabul qilindi. Rahmat!');
      expect(buttonWith('Arizalarimga o‘tish')).toBeTruthy();
    });

    it('a failed payment offers to try again', async () => {
      await openResult('/tolov/natija', [payment({ status: 'FAILED', provider: 'PAYME' })]);
      expect(text(el())).toContain('To‘lov amalga oshmadi.');
      expect(buttonWith('Qayta urinish').getAttribute('href')).toBe(
        '/kabinet/tolov/a1?purpose=DEPOSIT',
      );
    });

    it('a pending payment is asked about again until it settles', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await harness.navigateByUrl('/tolov/natija');
      harness.detectChanges();
      myPayments().flush(okPage([payment({ status: 'PENDING', provider: 'PAYME' })]));
      await vi.advanceTimersByTimeAsync(0);
      harness.detectChanges();
      expect(text(el())).toContain('To‘lov holati tekshirilmoqda');

      await vi.advanceTimersByTimeAsync(4100);
      harness.detectChanges();
      myPayments().flush(okPage([payment({ status: 'PAID' })]));
      await vi.advanceTimersByTimeAsync(0);
      harness.detectChanges();
      expect(text(el())).toContain('To‘lov qabul qilindi');
      // Settled: no more asking.
      await vi.advanceTimersByTimeAsync(20_000);
      backend.expectNone((r) => r.url === '/api/Payment/my');
    });

    it('says when there is no such payment', async () => {
      await openResult('/tolov/natija?payment=zzz', []);
      expect(text(el())).toContain('To‘lov topilmadi.');
    });

    it('finds the payment named in the address', async () => {
      await openResult('/tolov/natija?payment=p2', [
        payment({ id: 'p1', status: 'FAILED' }),
        payment({ id: 'p2', status: 'PAID' }),
      ]);
      expect(text(el())).toContain('To‘lov qabul qilindi');
    });
  });
});
