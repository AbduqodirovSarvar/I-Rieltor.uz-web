import { MyParticipation, Payment } from '../api/models';

export const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

/** A participation as the backend lists it: approved, deposit not paid, the sale still ahead. */
export const participation = (over: Partial<MyParticipation> = {}): MyParticipation =>
  ({
    id: 'pt1',
    auctionId: 'a1',
    lotNumber: '2026-014',
    auctionTitle: 'Chilonzordagi kvartira',
    auctionStatus: 'SCHEDULED',
    startsAt: hoursFromNow(5),
    endsAt: hoursFromNow(30),
    depositAmount: 20_000_000,
    status: 'APPROVED',
    participantNumber: 7,
    depositStatus: 'NOT_PAID',
    rejectReason: null,
    createdAt: hoursFromNow(-10),
    award: null,
    ...over,
  }) as MyParticipation;

export const payment = (over: Partial<Payment> = {}): Payment =>
  ({
    id: 'pay1',
    createdAt: hoursFromNow(-1),
    userId: 'u1',
    auctionId: 'a1',
    lotNumber: '2026-014',
    auctionTitle: 'Chilonzordagi kvartira',
    participantId: 'pt1',
    purpose: 'DEPOSIT',
    amount: 20_000_000,
    status: 'PENDING',
    provider: 'BANK_TRANSFER',
    providerTransactionId: null,
    paidAt: null,
    cancelledAt: null,
    note: null,
    receipts: [],
    ...over,
  }) as unknown as Payment;
