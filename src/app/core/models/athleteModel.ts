export interface Athlete {
  id: number;
  name: string;
  sport: string | null;
  nationality: string | null;
  age: number | null;
  team: string | null;
  position: string | null;
  league: string | null;
  imageUrl?: string;
  birthDate?: string;
  description?: string;
}