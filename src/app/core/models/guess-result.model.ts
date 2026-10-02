import { Athlete } from "./athleteModel";

export type MatchType = 'exact' | 'partial' | 'wrong' | 'higher' | 'lower';

export interface FieldResult {
  value: string | number;
  match: MatchType;
}

export interface GuessResult {
  athlete: Athlete;
  fields: {
    nationality: FieldResult;
    team: FieldResult;
    position: FieldResult;
    league: FieldResult;
    age: FieldResult;
  };
}