import { Component } from '@angular/core';
import { GameComponent } from './features/game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}