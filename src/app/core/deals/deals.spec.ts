import { quickBids, leadership } from '../../features/auction/bid-panel';
import { dueFor } from '../../features/cabinet/pay-page';
import { pickPayment } from '../../features/cabinet/payment-result-page';
import { canAttachReceipt } from '../../features/cabinet/payments-page';
import { hoursFromNow, participation, payment } from '../../testing/factories';
import { isRedirectProvider, parseAmount, safeProviderUrl } from './deals.service';
import { canBid, depositOutcome, describeParticipation } from './participation-view';

const now = Date.now();
const award = (over: Record<string, unknown>) =>
  ({
    rank: 1,
    status: 'ACCEPTED',
    price: 500,
    amountDue: 480,
    respondBy: null,
    paymentDueAt: null,
    ...over,
  }) as never;

describe('describeParticipation', () => {
  const step = (over = {}) => describeParticipation(participation(over), now);

  it('walks through the life of an application', () => {
    expect(step({ status: 'PENDING' }).step).toBe('awaiting-approval');
    expect(step({ status: 'REJECTED', rejectReason: 'x' }).step).toBe('rejected');
    expect(step({ status: 'WITHDRAWN' }).step).toBe('withdrawn');
    expect(step().step).toBe('pay-deposit');
    expect(step({ depositStatus: 'PAID' }).step).toBe('waiting-start');
    expect(step({ depositStatus: 'PAID', auctionStatus: 'ONGOING' }).step).toBe('can-bid');
    expect(step({ depositStatus: 'PAID', auctionStatus: 'FINISHED' }).step).toBe('finished-lost');
    expect(step({ auctionStatus: 'CANCELLED' }).step).toBe('closed');
    expect(step({ auctionStatus: 'FAILED' }).step).toBe('closed');
  });

  it('an auction without a deposit never asks for one', () => {
    expect(step({ depositAmount: 0, auctionStatus: 'ONGOING' }).step).toBe('can-bid');
    expect(step({ depositAmount: 0 }).step).toBe('waiting-start');
  });

  it('follows the award: an offer, the price to pay, a paid purchase, and everything that went wrong', () => {
    expect(
      step({
        auctionStatus: 'FINISHED',
        award: award({ status: 'OFFERED', respondBy: hoursFromNow(2) }),
      }).step,
    ).toBe('offer');
    expect(
      step({
        auctionStatus: 'FINISHED',
        award: award({ status: 'OFFERED', respondBy: hoursFromNow(-1) }),
      }).step,
    ).toBe('award-lost');
    expect(
      step({
        auctionStatus: 'FINISHED',
        award: award({ status: 'ACCEPTED', paymentDueAt: hoursFromNow(10) }),
      }).step,
    ).toBe('pay-final');
    expect(
      step({
        auctionStatus: 'FINISHED',
        award: award({ status: 'ACCEPTED', paymentDueAt: hoursFromNow(-1) }),
      }).step,
    ).toBe('award-lost');
    expect(step({ auctionStatus: 'FINISHED', award: award({ status: 'PAID' }) }).step).toBe('won');
    for (const status of ['DECLINED', 'DEFAULTED', 'EXPIRED'])
      expect(step({ auctionStatus: 'FINISHED', award: award({ status }) }).step, status).toBe(
        'award-lost',
      );
  });

  it('an application can be taken back only until the sale starts', () => {
    expect(step({ status: 'PENDING' }).canWithdraw).toBe(true);
    expect(step().canWithdraw).toBe(true);
    expect(step({ startsAt: hoursFromNow(-1) }).canWithdraw).toBe(false);
    expect(step({ auctionStatus: 'ONGOING' }).canWithdraw).toBe(false);
    expect(step({ status: 'REJECTED' }).canWithdraw).toBe(false);
  });

  it('may bid only when approved, the deposit is settled, the sale runs and no award exists', () => {
    const ok = participation({ depositStatus: 'PAID', auctionStatus: 'ONGOING' });
    expect(canBid(ok)).toBe(true);
    expect(canBid(null)).toBe(false);
    expect(canBid({ ...ok, depositStatus: 'NOT_PAID' })).toBe(false);
    expect(canBid({ ...ok, status: 'PENDING' })).toBe(false);
    expect(canBid({ ...ok, auctionStatus: 'SCHEDULED' })).toBe(false);
    expect(canBid({ ...ok, depositAmount: 0, depositStatus: 'NOT_PAID' })).toBe(true);
    expect(canBid({ ...ok, award: award({}) })).toBe(false);
  });
});

describe('deposit outcome', () => {
  const of = (over = {}) => depositOutcome(participation(over));

  it('says whether the deposit was given back, kept as a penalty or is still held', () => {
    expect(of({ depositStatus: 'REFUNDED', auctionStatus: 'FINISHED' })?.tone).toBe('success');
    expect(of({ depositStatus: 'FORFEITED', auctionStatus: 'FINISHED' })?.tone).toBe('danger');
    expect(of({ depositStatus: 'PAID', auctionStatus: 'ONGOING' })?.tone).toBe('info');
    expect(of({ depositStatus: 'PAID', auctionStatus: 'FINISHED' })).toBeNull();
  });

  it('is silent when there is no deposit to talk about', () => {
    expect(of({ depositAmount: 0, depositStatus: 'REFUNDED' })).toBeNull();
    expect(of({ status: 'PENDING', depositStatus: 'REFUNDED' })).toBeNull();
    expect(of({ depositStatus: 'NOT_PAID' })).toBeNull();
  });
});

describe('payment helpers', () => {
  it('opens only plain https provider pages', () => {
    expect(safeProviderUrl('https://checkout.paycom.uz/abc')).toBe(
      'https://checkout.paycom.uz/abc',
    );
    for (const bad of [
      'http://checkout.paycom.uz',
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.example',
      'not a url',
      '',
      null,
      undefined,
    ])
      expect(safeProviderUrl(bad as string), String(bad)).toBeNull();
  });

  it('tells a provider page from a transfer', () => {
    expect(isRedirectProvider('PAYME')).toBe(true);
    expect(isRedirectProvider('CLICK')).toBe(true);
    expect(isRedirectProvider('BANK_TRANSFER')).toBe(false);
    expect(isRedirectProvider('CARD_TRANSFER')).toBe(false);
  });

  it('what is due: the deposit, or the price of an accepted award; nothing for someone not approved', () => {
    expect(dueFor(participation(), 'DEPOSIT')).toEqual({
      amount: 20_000_000,
      paid: false,
      until: null,
    });
    expect(dueFor(participation({ depositStatus: 'PAID' }), 'DEPOSIT')?.paid).toBe(true);
    expect(dueFor(participation({ depositAmount: 0 }), 'DEPOSIT')).toBeNull();
    expect(dueFor(participation({ status: 'PENDING' }), 'DEPOSIT')).toBeNull();
    expect(dueFor(undefined, 'DEPOSIT')).toBeNull();
    expect(dueFor(participation(), 'FINAL_PAYMENT')).toBeNull();
    const due = hoursFromNow(5);
    expect(
      dueFor(
        participation({ award: award({ status: 'ACCEPTED', paymentDueAt: due }) }),
        'FINAL_PAYMENT',
      ),
    ).toEqual({
      amount: 480,
      paid: false,
      until: due,
    });
    expect(dueFor(participation({ award: award({ status: 'PAID' }) }), 'FINAL_PAYMENT')?.paid).toBe(
      true,
    );
  });

  it('a check can be attached only to a waiting transfer', () => {
    expect(canAttachReceipt(payment())).toBe(true);
    expect(canAttachReceipt(payment({ provider: 'CARD_TRANSFER' }))).toBe(true);
    expect(canAttachReceipt(payment({ provider: 'PAYME' }))).toBe(false);
    expect(canAttachReceipt(payment({ status: 'PAID' }))).toBe(false);
    expect(canAttachReceipt(payment({ purpose: 'REFUND' }))).toBe(false);
  });

  it('picks the payment the person came back for, else the newest', () => {
    const list = [payment({ id: 'new' }), payment({ id: 'old' })];
    expect(pickPayment(list, undefined)?.id).toBe('new');
    expect(pickPayment(list, 'old')?.id).toBe('old');
    expect(pickPayment(list, 'missing')).toBeNull();
    expect(pickPayment([], undefined)).toBeNull();
  });
});

describe('bid helpers', () => {
  it('parses what people type: groups and a comma are fine, anything else is not a number', () => {
    expect(parseAmount('525000000')).toBe(525_000_000);
    expect(parseAmount(' 525 000 000 ')).toBe(525_000_000);
    expect(parseAmount('525 000 000')).toBe(525_000_000);
    expect(parseAmount('1000,50')).toBe(1000.5);
    for (const bad of ['', 'abc', '12abc', '-5', '0', '1e9', '1.234', '1,2,3', '99999999999999999'])
      expect(parseAmount(bad), bad).toBeNull();
  });

  it('suggests the minimum and the minimum plus one, two and five steps', () => {
    expect(quickBids(100, 10).map((q) => q.amount)).toEqual([100, 110, 120, 150]);
  });

  it('tells who leads from the newest bid', () => {
    const bids = [{ participantNumber: 3 }, { participantNumber: 7 }];
    expect(leadership(3, bids)).toBe('leader');
    expect(leadership(7, bids)).toBe('outbid');
    expect(leadership(9, bids)).toBe('other');
    expect(leadership(3, [])).toBe('none');
    expect(leadership(null, bids)).toBe('none');
  });
});
