import { AuctionStatus, PublicAuctionDetail } from '../../api/models';
import { TextKey } from '../../core/i18n/uz';
import { AuctionStatusChangedEvent, BidPlacedEvent } from '../../core/realtime/auction-live';

export const STATUS_TEXT: Record<AuctionStatus, TextKey> = {
  DRAFT: 'auction.text.DRAFT',
  SCHEDULED: 'auction.text.SCHEDULED',
  ONGOING: 'auction.text.ONGOING',
  FINISHED: 'auction.text.FINISHED',
  FAILED: 'auction.text.FAILED',
  CANCELLED: 'auction.text.CANCELLED',
};

export const OUTCOME_TEXT: Record<NonNullable<PublicAuctionDetail['outcome']>, TextKey> = {
  SOLD: 'auction.outcome.SOLD',
  AWAITING_PAYMENT: 'auction.outcome.AWAITING_PAYMENT',
  AWAITING_RUNNER_UP: 'auction.outcome.AWAITING_RUNNER_UP',
  NOT_SOLD: 'auction.outcome.NOT_SOLD',
  NO_PARTICIPANTS: 'auction.outcome.NO_PARTICIPANTS',
  NO_BIDS: 'auction.outcome.NO_BIDS',
};

/** What the live stream changed since the page was loaded. Applied on top of the loaded auction; a reload clears it. */
export type LivePatch = Partial<
  Pick<PublicAuctionDetail, 'currentPrice' | 'minNextBid' | 'endsAt' | 'bidCount' | 'status'>
>;

/** A bid message → the fields it changes. Messages for another auction, or older than what is shown, change nothing. */
export function patchFromBid(
  auctionId: string,
  current: Pick<PublicAuctionDetail, 'bidCount'>,
  event: BidPlacedEvent,
): LivePatch | null {
  if (event.auctionId !== auctionId || event.bidCount < current.bidCount) return null;
  return {
    currentPrice: event.currentPrice,
    minNextBid: event.minNextBid,
    endsAt: event.endsAt,
    bidCount: event.bidCount,
  };
}

export function patchFromStatus(
  auctionId: string,
  event: AuctionStatusChangedEvent,
): LivePatch | null {
  if (event.auctionId !== auctionId) return null;
  return { status: event.status as AuctionStatus, endsAt: event.endsAt };
}

/** The price that matters in the state the auction is in. */
export function headlinePrice(a: PublicAuctionDetail): { key: TextKey; amount: number | null } {
  if (a.status === 'FINISHED') {
    return { key: 'auction.finalPrice', amount: a.finalPrice ?? a.currentPrice ?? a.startingPrice };
  }
  if (a.status === 'ONGOING') {
    return { key: 'auction.currentPrice', amount: a.currentPrice ?? a.startingPrice };
  }
  return { key: 'auction.startingPrice', amount: a.startingPrice };
}

/** True while it makes sense to hold a live connection: before the end, not after. */
export function isLiveStatus(status: AuctionStatus): boolean {
  return status === 'SCHEDULED' || status === 'ONGOING';
}
