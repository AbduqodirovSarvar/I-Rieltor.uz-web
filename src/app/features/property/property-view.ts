import { PublicMedia, PublicPropertyDetail } from '../../api/models';
import { GalleryItem } from '../../shared/ui/gallery';

/** Pure helpers for the object page: what to show from the backend's answer. */

/** Photos and videos for the gallery: the cover first, then the rest in the backend's order. Documents are not shown here. */
export function galleryItems(
  property: Pick<PublicPropertyDetail, 'title' | 'media' | 'cover'>,
  fileUrl: (url: string | null | undefined) => string,
  describe: (title: string, n: number) => string,
): GalleryItem[] {
  const media = (property.media ?? []).filter(
    (m) => (m.kind === 'IMAGE' || m.kind === 'VIDEO') && m.file?.url,
  );
  const ordered = [...media.filter((m) => m.isCover), ...media.filter((m) => !m.isCover)];
  const title = property.title ?? '';
  const items: GalleryItem[] = ordered.map((m, i) => ({
    url: fileUrl(m.file.url),
    alt: m.title || m.file.alt || describe(title, i + 1),
    kind: m.kind === 'VIDEO' ? 'video' : 'image',
  }));
  // An object whose pictures were not uploaded as media may still have a cover.
  if (items.length === 0 && property.cover?.url)
    items.push({
      url: fileUrl(property.cover.url),
      alt: property.cover.alt || title,
      kind: 'image',
    });
  return items;
}

export function documentsOf(property: Pick<PublicPropertyDetail, 'media'>): PublicMedia[] {
  return (property.media ?? []).filter((m) => m.kind === 'DOCUMENT' && m.file?.url);
}

/** A short plain text for a search result and a link preview: the description cut at a word, or the basic facts. */
export function summaryOf(property: PublicPropertyDetail, max = 160): string {
  const text = (property.description ?? '').replace(/\s+/g, ' ').trim();
  if (!text)
    return [property.categoryName, property.region, property.district].filter(Boolean).join(', ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40))}…`;
}

/** schema.org data of an object with an auction. Only facts the backend gave; nothing is invented. */
export function productJsonLd(
  property: PublicPropertyDetail,
  url: string,
  images: string[],
  description: string,
): Record<string, unknown> {
  const auction = property.auction;
  const price = auction ? (auction.currentPrice ?? auction.startingPrice) : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: property.title,
    description,
    url,
    ...(images.length ? { image: images } : {}),
    ...(property.categoryName ? { category: property.categoryName } : {}),
    ...(price !== null
      ? {
          offers: {
            '@type': 'Offer',
            url,
            price,
            priceCurrency: 'UZS',
            availability:
              property.status === 'SOLD'
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}
