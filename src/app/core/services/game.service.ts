
import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { Athlete } from '../models/athleteModel';

import {
  GuessResult,
  FieldResult
} from '../models/guess-result.model';

import { SportsDbService } from './sportsdb.service';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private sportsDb = inject(SportsDbService);

  private catalog = new Map<number, Athlete>();

  private target: Athlete | null = null;

  private attempts: Athlete[] = [];

  private results: GuessResult[] = [];

  // DEPORTE ACTUAL
  private selectedSport: string | null = null;

  // OBTENER CATÁLOGO
  getCatalog(): Athlete[] {
    return Array.from(this.catalog.values());
  }

  // OBTENER DEPORTISTA OBJETIVO
  getTarget(): Athlete | null {
    return this.target;
  }

  // OBTENER DEPORTE SELECCIONADO
  getSelectedSport(): string | null {
    return this.selectedSport;
  }

  // OBTENER INTENTOS
  getAttempts(): Athlete[] {
    return [...this.attempts];
  }

  // OBTENER RESULTADOS
  getResults(): GuessResult[] {
    return [...this.results];
  }

  // TAMAÑO DEL CATÁLOGO
  getCatalogSize(): number {
    return this.catalog.size;
  }

  // INICIALIZAR PARTIDA SEGÚN EL DEPORTE SELECCIONADO
  initializeGame(sport: string): Observable<boolean> {

    this.selectedSport = sport;

    return this.sportsDb
      .getPlayersFromRandomTeam(sport)
      .pipe(
        map(players => {

          this.catalog.clear();

          for (const player of players) {

            if (
              player.id &&
              Number.isFinite(player.id) &&
              player.name
            ) {
              this.catalog.set(player.id, player);
            }

          }

          if (this.catalog.size < 2) {
            throw new Error(
              `No se encontraron suficientes jugadores de ${sport}.`
            );
          }

          return this.startGame();
        })
      );
  }

  // INICIAR PARTIDA
  startGame(): boolean {

    const players = this.getCatalog();

    if (players.length < 2) {
      return false;
    }

    this.attempts = [];

    this.results = [];

    const randomIndex = Math.floor(
      Math.random() * players.length
    );

    this.target = players[randomIndex];

    return true;
  }

  // REGISTRAR INTENTO
  guess(athlete: Athlete): boolean {

    if (!this.target) {
      return false;
    }

    const alreadyGuessed = this.attempts.some(
      attempt => attempt.id === athlete.id
    );

    if (alreadyGuessed) {
      return false;
    }

    this.attempts.push(athlete);

    this.results.push(
      this.evaluateGuess(athlete)
    );

    return this.isCorrect(athlete);
  }

  // VERIFICAR SI ADIVINÓ
  isCorrect(athlete: Athlete): boolean {

    return (
      !!this.target &&
      athlete.id === this.target.id
    );
  }

  // REINICIAR CON OTRO JUGADOR DEL CATÁLOGO ACTUAL
  resetGame(): boolean {

    return this.startGame();
  }

  // EVALUAR TODOS LOS CAMPOS
  private evaluateGuess(
    athlete: Athlete
  ): GuessResult {

    if (!this.target) {
      throw new Error(
        'No hay un deportista objetivo.'
      );
    }

    return {

      athlete,

      fields: {

        sport: this.compareText(
          athlete.sport,
          this.target.sport,
          true
        ),

        nationality: this.compareText(
          athlete.nationality,
          this.target.nationality
        ),

        team: this.compareText(
          athlete.team,
          this.target.team
        ),

        position: this.compareText(
          athlete.position,
          this.target.position
        ),

        league: this.compareText(
          athlete.league,
          this.target.league
        ),

        age: this.compareAge(
          athlete.age,
          this.target.age
        )

      }

    };
  }

  // NORMALIZAR TEXTO
  private normalize(value: string): string {

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  // NORMALIZAR DEPORTES Y SINÓNIMOS
  private normalizeSport(value: string): string {

    const normalized = this.normalize(value);

    const aliases: Record<string, string> = {

      soccer: 'soccer',

      football: 'soccer',

      futbol: 'soccer',

      'association football': 'soccer',

      'futbol soccer': 'soccer'

    };

    return aliases[normalized] ?? normalized;
  }

  // COMPARAR CAMPOS DE TEXTO
  private compareText(
    value: string | null,
    target: string | null,
    isSport = false
  ): FieldResult {

    if (!value || !target) {
      return {
        value,
        match: 'unknown'
      };
    }

    const normalizedValue = isSport
      ? this.normalizeSport(value)
      : this.normalize(value);

    const normalizedTarget = isSport
      ? this.normalizeSport(target)
      : this.normalize(target);

    if (normalizedValue === normalizedTarget) {

      return {
        value,
        match: 'exact'
      };

    }

    if (
      normalizedValue.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedValue)
    ) {

      return {
        value,
        match: 'partial'
      };

    }

    return {
      value,
      match: 'wrong'
    };
  }

  // COMPARAR EDADES
  private compareAge(
    value: number | null,
    target: number | null
  ): FieldResult {

    if (value === null || target === null) {

      return {
        value,
        match: 'unknown'
      };

    }

    if (value === target) {

      return {
        value,
        match: 'exact'
      };

    }

    if (Math.abs(value - target) <= 2) {

      return {
        value,
        match: 'partial'
      };

    }

    return {
      value,
      match: value > target ? 'higher' : 'lower'
    };
  }

}
