import { Athlete } from './athleteModel';

export type MatchType =
  | 'exact'
  | 'partial'
  | 'wrong'
  | 'higher'
  | 'lower'
  | 'unknown';

export interface FieldResult {
  value: string | number | null;
  match: MatchType;
}

export interface GuessResult {
  athlete: Athlete;

  fields: {
    sport: FieldResult;
    nationality: FieldResult;
    team: FieldResult;
    position: FieldResult;
    league: FieldResult;
    age: FieldResult;
  };
}