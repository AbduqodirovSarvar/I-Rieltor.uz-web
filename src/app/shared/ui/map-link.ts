import { Component, computed, input } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

export interface MapLinks {
  osm: string;
  google: string;
  yandex: string;
}

/** Places on a world map are 6-decimal numbers; anything else is not a coordinate and gets no link. */
export function isCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** Links to the point on the three maps people in Uzbekistan use. Built from numbers only, so nothing can be injected. */
export function mapLinks(latitude: number, longitude: number): MapLinks {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return {
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    google: `https://www.google.com/maps?q=${lat},${lng}`,
    yandex: `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`,
  };
}

/** The place on a map, as links (no map library and no third-party script on our pages). */
@Component({
  selector: 'app-map-link',
  imports: [TPipe],
  template: `
    @if (links(); as l) {
      <div class="map">
        <p class="muted">
          {{ 'map.coordinates' | t }}: <span class="num">{{ lat() }}, {{ lng() }}</span>
        </p>
        <div class="row">
          <a class="btn btn-secondary" [href]="l.osm" target="_blank" rel="noopener noreferrer"
            >{{ 'map.open' | t }} · OpenStreetMap</a
          >
          <a class="btn btn-secondary" [href]="l.yandex" target="_blank" rel="noopener noreferrer"
            >Yandex</a
          >
          <a class="btn btn-secondary" [href]="l.google" target="_blank" rel="noopener noreferrer"
            >Google</a
          >
        </div>
      </div>
    }
  `,
})
export class MapLink {
  readonly latitude = input<number | null | undefined>(null);
  readonly longitude = input<number | null | undefined>(null);

  protected readonly links = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return isCoordinate(lat, lng) ? mapLinks(lat as number, lng as number) : null;
  });
  protected readonly lat = computed(() => this.latitude()?.toFixed(6) ?? '');
  protected readonly lng = computed(() => this.longitude()?.toFixed(6) ?? '');
}
