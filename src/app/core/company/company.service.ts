import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import type { components } from '../../api/schema';
import { ApiClient } from '../http/api-client';

export type PublicCompany = components['schemas']['PublicCompanyViewModel'];

/**
 * The company card (name, contacts, logo) the footer and the "About us" page show. The company may not be filled in yet: the
 * backend answers 404 then, which is "no data", not an error.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = inject(ApiClient);
  private cached$: Observable<PublicCompany | null> | null = null;

  get company$(): Observable<PublicCompany | null> {
    return (this.cached$ ??= this.api.get<PublicCompany>('api/Company/public').pipe(
      catchError(() => of(null)),
      shareReplay(1),
    ));
  }
}
