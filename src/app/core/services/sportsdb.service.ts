
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
    Observable,
    forkJoin,
    map,
    of,
    tap
} from 'rxjs';

import { Athlete } from '../models/athleteModel';

@Injectable({
    providedIn: 'root'
})
export class SportsDbService {

    private http = inject(HttpClient);

    private readonly DATA_URL = 'assets/data';

    private cache = new Map<string, Athlete[]>();

    // OBTENER EL ARCHIVO JSON SEGÚN EL DEPORTE
    private getFileName(sport: string): string {

        const normalized = sport
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        const files: Record<string, string> = {
            soccer: 'soccer.json',
            football: 'soccer.json',
            futbol: 'soccer.json',
            'futbol soccer': 'soccer.json',

            basketball: 'basketball.json',
            basquetbol: 'basketball.json',

            'american football': 'american-football.json',
            'futbol americano': 'american-football.json',

            baseball: 'baseball.json',
            beisbol: 'baseball.json',

            formula1: 'formula1.json',
            'formula 1': 'formula1.json',
            'f1': 'formula1.json'
        };

        const file = files[normalized];

        if (!file) {
            throw new Error(
                `No existe un catálogo para el deporte: ${sport}`
            );
        }

        return file;
    }

    // CARGAR TODOS LOS DEPORTISTAS DE UN DEPORTE
    getPlayersFromRandomTeam(sport: string): Observable<Athlete[]> {

        const fileName = this.getFileName(sport);

        const cached = this.cache.get(fileName);

        if (cached) {
            return of(cached);
        }

        return this.http
            .get<Athlete[]>(`${this.DATA_URL}/${fileName}`)
            .pipe(
                map(players => {

                    if (!Array.isArray(players)) {
                        throw new Error(
                            `El archivo ${fileName} no contiene un catálogo válido.`
                        );
                    }

                    return players
                        .filter(player =>
                            player &&
                            Number.isFinite(Number(player.id)) &&
                            !!player.name
                        )
                        .map(player => ({
                            ...player,
                            id: Number(player.id),
                            age: this.calculateAge(
                                player.birthDate
                            )
                        }));
                }),

                tap(players => {
                    this.cache.set(fileName, players);
                })
            );
    }

    // BUSCAR DEPORTISTAS POR NOMBRE
    searchPlayers(name: string): Observable<Athlete[]> {

        const cleanName = this.normalize(name);

        if (cleanName.length < 3) {
            return of([]);
        }

        return this.getAllPlayers().pipe(
            map(players =>
                players.filter(player =>
                    this.normalize(player.name)
                        .includes(cleanName)
                )
            )
        );
    }

    // OBTENER UN DEPORTISTA POR SU ID
    getPlayerById(id: number): Observable<Athlete | null> {

        return this.getAllPlayers().pipe(
            map(players =>
                players.find(player => player.id === id) ?? null
            )
        );
    }

    // CARGAR LOS CUATRO CATÁLOGOS
    private getAllPlayers(): Observable<Athlete[]> {

        return forkJoin([
            this.getPlayersFromRandomTeam('Soccer'),
            this.getPlayersFromRandomTeam('Basketball'),
            this.getPlayersFromRandomTeam('American Football'),
            this.getPlayersFromRandomTeam('Baseball'),
            this.getPlayersFromRandomTeam('Formula 1')
        ]).pipe(
            map(catalogs => catalogs.flat())
        );
    }

    // NORMALIZAR TEXTO
    private normalize(value: string): string {

        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    // CALCULAR EDAD A PARTIR DE LA FECHA DE NACIMIENTO
    private calculateAge(
        date?: string
    ): number | null {

        if (!date) {
            return null;
        }

        const birth = new Date(`${date}T00:00:00`);

        if (Number.isNaN(birth.getTime())) {
            return null;
        }

        const today = new Date();

        let age =
            today.getFullYear() - birth.getFullYear();

        const birthdayNotReached =
            today.getMonth() < birth.getMonth() ||
            (
                today.getMonth() === birth.getMonth() &&
                today.getDate() < birth.getDate()
            );

        if (birthdayNotReached) {
            age--;
        }

        return age >= 0 ? age : null;
    }
}
