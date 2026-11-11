export interface SportsDbPlayer {
  idPlayer: string;
  strPlayer: string;
  idTeam?: string | null;
  strTeam?: string | null;
  strSport?: string | null;
  strNationality?: string | null;
  dateBorn?: string | null;
  strPosition?: string | null;
  strLeague?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
}

export interface SportsDbPlayersResponse {
  player: SportsDbPlayer[] | null;
}

export interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
}

export interface SportsDbTeamsResponse {
  teams: SportsDbTeam[] | null;
}

// Liga normalizada para SPORTLE
export interface SportsDbLeague {
  id: string;
  name: string;
}

// Estructura original de TheSportsDB
export interface SportsDbLeagueApi {
  idLeague: string;
  strLeague: string;
  strSport: string;
}

export interface SportsDbLeaguesResponse {
  countries: SportsDbLeagueApi[] | null;
}