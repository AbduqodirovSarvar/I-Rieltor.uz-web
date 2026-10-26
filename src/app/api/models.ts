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
export type MyParticipation = Schemas['MyParticipationViewModel'];
export type MyAward = Schemas['MyAwardViewModel'];
export type Payment = Schemas['PaymentViewModel'];
export type PaymentReceipt = Schemas['PaymentReceiptViewModel'];
export type Checkout = Schemas['CheckoutViewModel'];
export type PlacedBid = Schemas['PlacedBidViewModel'];
export type PaymentProvider = Schemas['PaymentProvider'];
export type MyNotification = Schemas['MyNotificationViewModel'];
export type PaymentPurpose = Schemas['PaymentPurpose'];
