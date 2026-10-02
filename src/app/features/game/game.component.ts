import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Athlete } from '../../core/models/athleteModel';
import { GuessResult } from '../../core/models/guess-result.model';
import { GameService } from '../../core/services/game.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent {

  search = '';
  athletes: Athlete[] = [];
  results: GuessResult[] = [];

  gameOver = false;
  won = false;

  constructor(private gameService: GameService) {
    this.athletes = this.gameService.getAthletes();
  }

  get filteredAthletes(): Athlete[] {
    if (!this.search.trim()) return [];
    const v = this.search.toLowerCase();
    return this.athletes
      .filter(a => a.name.toLowerCase().includes(v))
      .slice(0, 5);
  }

  selectAthlete(athlete: Athlete): void {
    if (this.gameOver) return;
    this.search = '';
    this.won = this.gameService.guess(athlete);
    this.results = this.gameService.getResults();
    if (this.won || this.results.length >= 6) this.gameOver = true;
  }

  resetGame(): void {
    this.gameService.resetGame();
    this.results = [];
    this.search = '';
    this.gameOver = false;
    this.won = false;
  }

  getMatchClass(match: string): string {
    return `cell-${match}`;
  }
}