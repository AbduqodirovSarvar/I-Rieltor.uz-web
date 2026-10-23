import { MyParticipation } from '../../api/models';
import { TextKey } from '../i18n/uz';

/** Where a person stands in one auction, in one word: what they should do or wait for next. */
export type Step =
  | 'withdrawn'
  | 'rejected'
  | 'awaiting-approval'
  | 'pay-deposit'
  | 'waiting-start'
  | 'can-bid'
  | 'finished-lost'
  | 'offer'
  | 'pay-final'
  | 'won'
  | 'award-lost'
  | 'closed';

export interface ParticipationView {
  step: Step;
  /** An application can be taken back until the sale starts. */
  canWithdraw: boolean;
}

export const STEP_TITLE: Record<Step, TextKey> = {
  withdrawn: 'step.withdrawn.title',
  rejected: 'step.rejected.title',
  'awaiting-approval': 'step.awaiting-approval.title',
  'pay-deposit': 'step.pay-deposit.title',
  'waiting-start': 'step.waiting-start.title',
  'can-bid': 'step.can-bid.title',
  'finished-lost': 'step.finished-lost.title',
  offer: 'step.offer.title',
  'pay-final': 'step.pay-final.title',
  won: 'step.won.title',
  'award-lost': 'step.award-lost.title',
  closed: 'step.closed.title',
};

export const STEP_TEXT: Record<Step, TextKey> = {
  withdrawn: 'step.withdrawn.text',
  rejected: 'step.rejected.text',
  'awaiting-approval': 'step.awaiting-approval.text',
  'pay-deposit': 'step.pay-deposit.text',
  'waiting-start': 'step.waiting-start.text',
  'can-bid': 'step.can-bid.text',
  'finished-lost': 'step.finished-lost.text',
  offer: 'step.offer.text',
  'pay-final': 'step.pay-final.text',
  won: 'step.won.text',
  'award-lost': 'step.award-lost.text',
  closed: 'step.closed.text',
};

/**
 * What a participation means right now. The server's own numbers decide (status, deposit, the award with its deadlines, the
 * auction's state); `nowMs` is the SERVER's clock, so a deadline is judged the way the backend judges it.
 */
export function describeParticipation(p: MyParticipation, nowMs: number): ParticipationView {
  const beforeStart = p.auctionStatus === 'SCHEDULED' && nowMs < Date.parse(p.startsAt);
  const canWithdraw = beforeStart && (p.status === 'PENDING' || p.status === 'APPROVED');

  if (p.status === 'WITHDRAWN') return { step: 'withdrawn', canWithdraw: false };
  if (p.status === 'REJECTED') return { step: 'rejected', canWithdraw: false };

  const award = p.award;
  if (award) {
    switch (award.status) {
      case 'OFFERED':
        return {
          step: award.respondBy && Date.parse(award.respondBy) <= nowMs ? 'award-lost' : 'offer',
          canWithdraw: false,
        };
      case 'ACCEPTED':
        return {
          step:
            award.paymentDueAt && Date.parse(award.paymentDueAt) <= nowMs
              ? 'award-lost'
              : 'pay-final',
          canWithdraw: false,
        };
      case 'PAID':
        return { step: 'won', canWithdraw: false };
      default:
        return { step: 'award-lost', canWithdraw: false };
    }
  }

  if (p.status === 'PENDING') return { step: 'awaiting-approval', canWithdraw };

  // APPROVED
  if (p.auctionStatus === 'CANCELLED' || p.auctionStatus === 'FAILED')
    return { step: 'closed', canWithdraw: false };
  if (p.auctionStatus === 'FINISHED') return { step: 'finished-lost', canWithdraw: false };
  const depositDue = p.depositAmount > 0 && p.depositStatus === 'NOT_PAID';
  if (depositDue) return { step: 'pay-deposit', canWithdraw };
  return { step: p.auctionStatus === 'ONGOING' ? 'can-bid' : 'waiting-start', canWithdraw };
}

/** May this participant place a bid now? Approved, deposit settled, the sale running. */
export function canBid(p: MyParticipation | null | undefined): boolean {
  if (!p || p.status !== 'APPROVED' || p.auctionStatus !== 'ONGOING' || p.award) return false;
  return !(p.depositAmount > 0 && p.depositStatus === 'NOT_PAID');
}
