import { Injectable } from '@angular/core';
import { Athlete } from '../models/athleteModel';
import { ATHLETES } from '../data/athletes.data';
import { GuessResult, FieldResult } from '../models/guess-result.model';

@Injectable({ providedIn: 'root' })
export class GameService {

  private athletes: Athlete[] = ATHLETES;
  private target: Athlete = this.getRandomAthlete();
  private attempts: Athlete[] = [];
  private results: GuessResult[] = [];

  getAthletes(): Athlete[] { return this.athletes; }
  getTarget(): Athlete { return this.target; }
  getAttempts(): Athlete[] { return this.attempts; }
  getResults(): GuessResult[] { return this.results; }

  guess(athlete: Athlete): boolean {
    this.attempts.push(athlete);
    this.results.push(this.evaluateGuess(athlete));
    return this.isCorrect(athlete);
  }

  isCorrect(athlete: Athlete): boolean {
    return athlete.id === this.target.id;
  }

  resetGame(): void {
    this.attempts = [];
    this.results = [];
    this.target = this.getRandomAthlete();
  }

  private evaluateGuess(athlete: Athlete): GuessResult {
    return {
      athlete,
      fields: {
        nationality: this.compareText(athlete.nationality, this.target.nationality),
        team:        this.compareText(athlete.team, this.target.team),
        position:    this.compareText(athlete.position, this.target.position),
        league:      this.compareText(athlete.league, this.target.league),
        age:         this.compareAge(athlete.age, this.target.age)
      }
    };
  }

  private compareText(value: string, target: string): FieldResult {
    if (value === target) return { value, match: 'exact' };
    return { value, match: 'wrong' };
  }

  private compareAge(value: number, target: number): FieldResult {
    if (value === target) return { value, match: 'exact' };
    if (Math.abs(value - target) <= 2) return { value, match: 'partial' };
    return { value, match: value > target ? 'lower' : 'higher' };
  }

  private getRandomAthlete(): Athlete {
    const i = Math.floor(Math.random() * this.athletes.length);
    return this.athletes[i];
  }
}