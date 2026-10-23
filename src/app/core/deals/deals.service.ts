import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Checkout,
  MyParticipation,
  Payment,
  PaymentProvider,
  PaymentPurpose,
  PlacedBid,
} from '../../api/models';
import { ApiClient } from '../http/api-client';

/** What a signed-in person does around an auction: applications, payments, bids. One place for those endpoints. */
@Injectable({ providedIn: 'root' })
export class DealsService {
  private readonly api = inject(ApiClient);

  // ---- applications

  myParticipations(): Observable<MyParticipation[]> {
    return this.api
      .getPage<MyParticipation>('api/Participation/my')
      .pipe(map((page) => page.items));
  }

  withdraw(auctionId: string): Observable<boolean> {
    return this.api.post<boolean>('api/Participation/withdraw', { auctionId });
  }

  /** The buyer gives up (the deposit is forfeited). */
  refuse(auctionId: string): Observable<boolean> {
    return this.api.post<boolean>('api/Participation/refuse', { auctionId });
  }

  acceptOffer(auctionId: string): Observable<boolean> {
    return this.api.post<boolean>('api/Participation/offer/accept', { auctionId });
  }

  declineOffer(auctionId: string): Observable<boolean> {
    return this.api.post<boolean>('api/Participation/offer/decline', { auctionId });
  }

  // ---- payments

  /** The payment methods that are switched on. */
  providers(): Observable<PaymentProvider[]> {
    return this.api.get<PaymentProvider[]>('api/Payment/providers');
  }

  checkout(
    auctionId: string,
    purpose: PaymentPurpose,
    provider: PaymentProvider,
  ): Observable<Checkout> {
    return this.api.post<Checkout>('api/Payment/checkout', { auctionId, purpose, provider });
  }

  myPayments(): Observable<Payment[]> {
    return this.api
      .getPage<Payment>('api/Payment/my', {
        pageSize: 50,
        sortBy: 'CreatedAt',
        sortDirection: 'desc',
      })
      .pipe(map((page) => page.items));
  }

  // ---- bids

  placeBid(auctionId: string, amount: number): Observable<PlacedBid> {
    return this.api.post<PlacedBid>('api/Bid', { auctionId, amount });
  }
}

/**
 * The address a payment provider's page lives at. It comes from the backend's settings, but it is still checked: only a
 * plain https address may be opened, never `javascript:` or anything else a link could run.
 */
export function safeProviderUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Methods that give a page to pay on (the person leaves the site) versus details to pay by transfer. */
export function isRedirectProvider(provider: PaymentProvider): boolean {
  return provider === 'PAYME' || provider === 'CLICK' || provider === 'UZUM';
}

/** Parses an amount typed by a person: spaces and a comma are allowed; anything else is "not a number". */
export function parseAmount(text: string): number | null {
  // `\s` covers the non-breaking space the app itself writes between the digit groups.
  const cleaned = text.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 && value < 1e15 ? value : null;
}
