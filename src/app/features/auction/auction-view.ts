import { AuctionStatus, PublicAuctionDetail, PublicBid } from '../../api/models';
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

/** How many bids the history shows. */
export const BID_HISTORY_LIMIT = 20;

const bidKey = (b: PublicBid) => `${b.participantNumber}|${b.amount}|${b.placedAt}`;

/**
 * The bid history: what the server listed plus what arrived live since, newest first, each bid once (a bid can come both
 * from the list and from the stream), cut to {@link BID_HISTORY_LIMIT}.
 */
export function mergeBids(
  server: PublicBid[],
  live: PublicBid[],
  limit = BID_HISTORY_LIMIT,
): PublicBid[] {
  const seen = new Set<string>();
  return [...live, ...server]
    .filter((b) => {
      const key = bidKey(b);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt) || b.amount - a.amount)
    .slice(0, limit);
}

/** The history entry a live bid message stands for. */
export function bidFromEvent(event: BidPlacedEvent): PublicBid {
  return {
    participantNumber: event.participantNumber,
    amount: event.amount,
    placedAt: event.placedAt,
  };
}
