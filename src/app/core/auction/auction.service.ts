import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PublicAuctionDetail, PublicBid } from '../../api/models';
import { ApiClient } from '../http/api-client';
import { plainParams } from '../http/query-params';
import { Page } from '../http/response-model';

/** One auction as anyone may see it: the numbers, the dates, the bids (participant numbers only). */
@Injectable({ providedIn: 'root' })
export class AuctionService {
  private readonly api = inject(ApiClient);

  detail(id: string): Observable<PublicAuctionDetail> {
    return this.api.get<PublicAuctionDetail>('api/Auction/public', plainParams({ Id: id }));
  }

  /** Newest bid first. */
  bids(auctionId: string, pageSize = 20): Observable<Page<PublicBid>> {
    return this.api.getPage<PublicBid>('api/Bid/list', {
      pageIndex: 0,
      pageSize,
      extra: { AuctionId: auctionId },
    });
  }
}
