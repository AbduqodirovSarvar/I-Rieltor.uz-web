import type { components } from './schema';

/** Short names for the backend's view models the web uses. */
type Schemas = components['schemas'];

export type PublicPropertyListItem = Schemas['PublicPropertyListItemViewModel'];
export type PublicPropertyDetail = Schemas['PublicPropertyDetailViewModel'];
export type PublicAuctionSummary = Schemas['PublicAuctionSummaryViewModel'];
export type PublicAuctionDetail = Schemas['PublicAuctionDetailViewModel'];
export type PublicBid = Schemas['PublicBidViewModel'];
export type PublicFile = Schemas['PublicFileViewModel'];
export type PublicMedia = Schemas['PublicPropertyMediaViewModel'];
export type PublicSlide = Schemas['PublicSlideViewModel'];
export type PublicCategory = Schemas['PublicPropertyCategoryViewModel'];
export type AuctionStatus = Schemas['AuctionStatus'];
export type PropertyStatus = Schemas['PropertyStatus'];
