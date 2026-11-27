import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  Observable,
  catchError,
  map,
  of,
  shareReplay,
  switchMap,
  timeout
} from 'rxjs';

interface WikipediaSummary {
  type?: string;
  thumbnail?: { source: string };
}

@Injectable({
  providedIn: 'root'
})
export class PlayerPhotoService {

  private http = inject(HttpClient);

  // IDIOMAS DE WIKIPEDIA EN ORDEN DE BÚSQUEDA
  private readonly LANGUAGES = ['en', 'es'];

  // CACHÉ: UNA SOLA CONSULTA POR DEPORTISTA
  private cache = new Map<string, Observable<string | null>>();

  // OBTENER LA FOTO DE UN DEPORTISTA POR SU NOMBRE (API REST DE WIKIPEDIA)
  getPhoto(name: string): Observable<string | null> {

    const key = name.trim();

    if (!key) {
      return of(null);
    }

    let photo$ = this.cache.get(key);

    if (!photo$) {

      photo$ = this.searchInLanguage(key, 0).pipe(
        shareReplay(1)
      );

      this.cache.set(key, photo$);
    }

    return photo$;
  }

  // CONSULTAR UN IDIOMA Y, SI NO HAY FOTO, PROBAR EL SIGUIENTE
  private searchInLanguage(
    name: string,
    index: number
  ): Observable<string | null> {

    if (index >= this.LANGUAGES.length) {
      return of(null);
    }

    const title = encodeURIComponent(
      name.replace(/\s+/g, '_')
    );

    const url =
      `https://${this.LANGUAGES[index]}.wikipedia.org` +
      `/api/rest_v1/page/summary/${title}`;

    return this.http.get<WikipediaSummary>(url).pipe(

      timeout({ first: 8000 }),

      map(summary =>
        summary.type === 'standard'
          ? summary.thumbnail?.source ?? null
          : null
      ),

      catchError(() => of(null)),

      switchMap(photo =>
        photo
          ? of(photo)
          : this.searchInLanguage(name, index + 1)
      )

    );
  }

}
