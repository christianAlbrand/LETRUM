import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import {
    Observable,
    map,
    of,
    tap,
    switchMap
} from 'rxjs';

import { Athlete } from '../models/athleteModel';

import {
    SportsDbPlayer,
    SportsDbPlayersResponse,
    SportsDbTeam,
    SportsDbTeamsResponse,
    SportsDbLeague,
    SportsDbLeagueApi,
    SportsDbLeaguesResponse
} from '../models/sportsdb.model';

@Injectable({
    providedIn: 'root'
})

export class SportsDbService {

    private http = inject(HttpClient);

    private readonly API_URL = 'https://www.thesportsdb.com/api/v1/json/123';

    private cache = new Map<string, Athlete[]>();

    // BUSCAR DEPORTISTAS POR NOMBRE
    searchPlayers(name: string): Observable<Athlete[]> {

        const cleanName = this.normalize(name);

        if (cleanName.length < 3) {
            return of([]);
        }

        const cacheKey = cleanName.toLowerCase();

        const cached = this.cache.get(cacheKey);

        if (cached) {
            return of(cached);
        }

        const params = new HttpParams()
            .set('p', cleanName.replace(/\s+/g, '_'));

        return this.http.get<SportsDbPlayersResponse>(
            `${this.API_URL}/searchplayers.php`,
            { params }
        ).pipe(

            map(response =>
                (response.player ?? [])
                    .filter(player =>
                        player.idPlayer && player.strPlayer
                    )
                    .map(player => this.mapPlayer(player))
            ),

            tap(players => {
                this.cache.set(cacheKey, players);
            })

        );
    }

    // OBTENER UN DEPORTISTA POR SU ID
    getPlayerById(id: number): Observable<Athlete | null> {

        const params = new HttpParams()
            .set('id', id.toString());

        return this.http.get<SportsDbPlayersResponse>(
            `${this.API_URL}/lookupplayer.php`,
            { params }
        ).pipe(

            map(response => {
                const player = response.player?.[0];

                return player
                    ? this.mapPlayer(player)
                    : null;
            })

        );
    }

    // OBTENER EQUIPOS DE UN DEPORTE

    getLeaguesBySport(sport: string): Observable<SportsDbLeague[]> {
        const params = new HttpParams().set('s', sport);

        return this.http.get<SportsDbLeaguesResponse>(
            `${this.API_URL}/search_all_leagues.php`,
            { params }
        ).pipe(
            map(response => {
                const leagues = response?.countries;

                if (!Array.isArray(leagues)) {
                    console.error('SPORTLE: Respuesta de ligas inesperada:', response);
                    return [];
                }

                return leagues
                    .filter((league): league is SportsDbLeagueApi =>
                        !!league?.idLeague &&
                        !!league?.strLeague &&
                        !!league?.strSport
                    )
                    .map(league => ({
                        id: league.idLeague,
                        name: league.strLeague
                    }));
            })
        );
    }

    getTeamsByLeagueId(idLeague: string): Observable<SportsDbTeam[]> {
        const params = new HttpParams().set('id', idLeague);

        return this.http.get<SportsDbTeamsResponse>(
            `${this.API_URL}/lookup_all_teams.php`,
            { params }
        ).pipe(
            map(response => {
                const teams = response?.teams;

                if (!Array.isArray(teams)) {
                    console.error('SPORTLE: Respuesta de equipos:', response);
                    return [];
                }

                return teams.filter(team =>
                    !!team?.idTeam && !!team?.strTeam
                );
            })
        );
    }


    // OBTENER JUGADORES DE UN EQUIPO ALEATORIO

    getPlayersFromRandomTeam(sport: string): Observable<Athlete[]> {
        return this.getLeaguesBySport(sport).pipe(
            switchMap(leagues => {
                if (!leagues.length) {
                    throw new Error('TheSportsDB no devolvió ligas para este deporte.');
                }

                const randomLeague =
                    leagues[Math.floor(Math.random() * leagues.length)];

                console.log('SPORTLE: Liga seleccionada:', randomLeague.name);

                return this.getTeamsByLeagueId(randomLeague.id);
            }),
            switchMap(teams => {
                if (!teams.length) {
                    throw new Error('TheSportsDB no devolvió equipos para la liga.');
                }

                const randomTeam =
                    teams[Math.floor(Math.random() * teams.length)];

                console.log('SPORTLE: Equipo seleccionado:', randomTeam.strTeam);

                const params = new HttpParams().set('id', randomTeam.idTeam);

                return this.http.get<SportsDbPlayersResponse>(
                    `${this.API_URL}/lookup_all_players.php`,
                    { params }
                ).pipe(
                    map(response => {
                        const players = response?.player;

                        if (!Array.isArray(players)) {
                            console.error('SPORTLE: Respuesta de jugadores inesperada:', response);
                            return [];
                        }

                        return players
                            .filter(player =>
                                player &&
                                player.idPlayer &&
                                player.strPlayer
                            )
                            .map(player => this.mapPlayer(player));
                    })
                );
            })
        );
    }


    // CONVERTIR RESPUESTA DE API A ATHLETE
    private mapPlayer(player: SportsDbPlayer): Athlete {

        return {
            id: Number(player.idPlayer),

            name: player.strPlayer.trim(),

            sport: this.cleanValue(player.strSport),

            nationality: this.cleanValue(
                player.strNationality
            ),

            age: this.calculateAge(player.dateBorn),

            team: this.cleanValue(player.strTeam),

            position: this.cleanValue(player.strPosition),

            league: this.cleanValue(player.strLeague),

            imageUrl:
                player.strThumb ||
                player.strCutout ||
                undefined,

            birthDate: player.dateBorn || undefined
        };
    }

    // LIMPIAR VALORES VACÍOS
    private cleanValue(
        value?: string | null
    ): string | null {

        const clean = value?.trim();

        return clean ? clean : null;
    }

    // NORMALIZAR TEXTO
    private normalize(value: string): string {

        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    }

    // CALCULAR EDAD
    private calculateAge(
        date?: string | null
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
