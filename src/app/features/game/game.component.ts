
import { Component, computed, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
  timeout
} from 'rxjs';

import { Athlete } from '../../core/models/athleteModel';
import { GuessResult } from '../../core/models/guess-result.model';

import { GameService } from '../../core/services/game.service';
import { SportsDbService } from '../../core/services/sportsdb.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent {

  private readonly MIN_API_CHARS = 3;
  private readonly MAX_SUGGESTIONS = 10;
  private readonly MAX_ATTEMPTS = 6;
  private readonly destroyRef = inject(DestroyRef);

  private search$ = new Subject<string>();

  // ESTADOS DEL JUEGO

  gameStarted = signal(false);
  loadingGame = signal(true);
  gameError = signal('');

  search = '';

  attempts = signal<Athlete[]>([]);
  guessResults = signal<GuessResult[]>([]);

  apiResults = signal<Athlete[]>([]);
  suggestions = computed(() => {

    const seen = new Set<number>();
    const merged: Athlete[] = [];

    for (const athlete of this.apiResults()) {

      if (seen.has(athlete.id)) {
        continue;
      }

      seen.add(athlete.id);
      merged.push(athlete);

      if (merged.length >= this.MAX_SUGGESTIONS) {
        break;
      }
    }

    return merged;
  });

  loading = signal(false);
  apiError = signal('');

  gameOver = signal(false);
  won = signal(false);

  // CONSTRUCTOR

  constructor(
    public gameService: GameService,
    private sportsDbService: SportsDbService
  ) {

    // INICIALIZAR PARTIDA AUTOMÁTICAMENTE

    this.loadGame();
    

    // BÚSQUEDA DE DEPORTISTAS EN LA API

    this.search$
      .pipe(

        map(query => query.trim()),

        debounceTime(600),

        distinctUntilChanged(),

        tap(() => {
          this.apiError.set('');
        }),

        switchMap(query => {

          if (query.length < this.MIN_API_CHARS) {
            this.loading.set(false);
            return of<Athlete[]>([]);
          }

          this.loading.set(true);

          return this.sportsDbService.searchPlayers(query).pipe(

            timeout({ first: 10000 }),

            catchError(error => {

              console.error(
                'SPORTLE: Error al consultar TheSportsDB:',
                error
              );

              this.handleError(error);

              return of<Athlete[]>([]);

            })

          );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(results => {

        this.loading.set(false);

        this.apiResults.set(
          results.map(athlete => ({
            ...athlete,
            sport: athlete.sport
              ? this.normalizeSport(athlete.sport)
              : null
          }))
        );

        const query = this.search.trim();

        if (
          query.length >= this.MIN_API_CHARS &&
          !this.apiError() &&
          this.apiResults().length === 0
        ) {
          this.apiError.set(
            'No se encontraron deportistas.'
          );
        }

      });

  }

  // NORMALIZAR DEPORTE

  private normalizeSport(sport: string): string {

    const value = this.normalize(sport);

    const aliases: Record<string, string> = {

      'soccer': 'Soccer',
      'futbol': 'Soccer',
      'football': 'Soccer',
      'association football': 'Soccer',
      'futbol soccer': 'Soccer'

    };

    return aliases[value] || sport.trim();
  }

  // NORMALIZAR TEXTO

  private normalize(text: string): string {

    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  // CARGAR PARTIDA AUTOMÁTICAMENTE

  loadGame(): void {

    this.loadingGame.set(true);
    this.gameStarted.set(false);
    this.gameError.set('');

    this.gameOver.set(false);
    this.won.set(false);

    this.attempts.set([]);
    this.guessResults.set([]);

    this.clearSearch();

    this.gameService
      .initializeGame()
      .pipe(
        timeout({ first: 15000 }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: success => {

          if (!success) {
            this.gameError.set(
              'No se pudo seleccionar un deportista.'
            );

            this.loadingGame.set(false);
            return;
          }

          this.gameStarted.set(true);
          this.loadingGame.set(false);

        },

        error: error => {

          console.error(
            'SPORTLE: Error al iniciar la partida:',
            error
          );

          this.gameStarted.set(false);
          this.loadingGame.set(false);

          this.gameError.set(
            error?.name === 'TimeoutError'
              ? 'La API tardó demasiado. Intenta nuevamente.'
              : error?.message ||
                'No se pudo cargar el deportista.'
          );

        }

      });

  }

  // CAMBIO EN EL INPUT DE BÚSQUEDA

  onSearchChange(value: string): void {

    this.search = value;

    const query = value.trim();

    if (!query) {
      this.apiResults.set([]);
      this.apiError.set('');
      this.loading.set(false);
    }

    this.search$.next(value);

  }

  // MANEJAR ERRORES DE LA API

  private handleError(error: any): void {

    if (error?.name === 'TimeoutError') {

      this.apiError.set(
        'La API tardó demasiado. Intenta nuevamente.'
      );

    } else if (
      error?.status === 0 ||
      error?.status === 429
    ) {

      this.apiError.set(
        'TheSportsDB no respondió. Puede existir un límite de peticiones.'
      );

    } else {

      this.apiError.set(
        `Error HTTP: ${error?.status || 'desconocido'}.`
      );

    }

  }

  // SELECCIONAR DEPORTISTA

  selectAthlete(athlete: Athlete): void {

    if (!this.gameStarted() || this.gameOver()) {
      return;
    }

    const alreadySelected = this.attempts().some(
      item => item.id === athlete.id
    );

    if (alreadySelected) {

      this.apiError.set(
        'Ya intentaste con este deportista.'
      );

      return;
    }

    const correct = this.gameService.guess(athlete);

    this.attempts.set(
      [...this.gameService.getAttempts()]
    );

    this.guessResults.set(
      [...this.gameService.getResults()]
    );

    this.won.set(correct);

    this.clearSearch();

    if (
      correct ||
      this.attempts().length >= this.MAX_ATTEMPTS
    ) {
      this.gameOver.set(true);
    }

  }

  // REINICIAR PARTIDA CON UN NUEVO DEPORTISTA

  resetGame(): void {

    this.loadGame();

  }

  // LIMPIAR BÚSQUEDA

  private clearSearch(): void {

    this.search = '';

    this.search$.next('');

    this.apiResults.set([]);

    this.apiError.set('');

    this.loading.set(false);

  }

}
