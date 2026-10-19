import type { SquadOrdinal, TerrainObjectId } from '../catalog/lexicon';

/**
 * Typowane drzewo składni komendy (SPEC 4.3, krok 2). Identyfikatory zgodne z katalogiem
 * (`src/core/catalog`), nazwy pól wg glosariusza SPEC 5.1.
 */

/** Adresat: drużyna z liczebnikiem porządkowym („Pierwsza drużyna”) albo bez („Drużyna”). */
export interface Addressee {
  readonly ordinal: SquadOrdinal | null;
}

export type Side = 'LEFT' | 'RIGHT';
export type TurnDirection = Side | 'ABOUT';
export type FormationName = 'SINGLE_RANK' | 'DOUBLE_RANK' | 'FILE' | 'COLUMN_OF_TWOS';
export type MarchDirection = 'FORWARD' | 'RIGHT' | 'LEFT' | 'ABOUT_RIGHT' | 'ABOUT_LEFT' | 'HALF_RIGHT' | 'HALF_LEFT';
export type ShiftDirection = 'FORWARD' | 'BACK' | 'RIGHT' | 'LEFT';

/** Żołnierz wskazany w komendzie: skrzydłowy albo po nazwisku (mianownik, gdy nazwisko jest znane). */
export type SoldierRef =
  | { readonly kind: 'flank'; readonly side: Side }
  | { readonly kind: 'soldier'; readonly surname: string; readonly known: boolean };

interface Base<Id extends string> {
  readonly id: Id;
  readonly addressee: Addressee | null;
}

export type CommandAst =
  | (Base<'P-1'> & { readonly addressee: Addressee })
  | Base<'P-2'>
  | Base<'P-3'>
  | (Base<'Z-1'> & { readonly direction: TurnDirection })
  | (Base<'ZB-1'> & { readonly formation: FormationName })
  | (Base<'ZB-2'> & {
      readonly formation: FormationName;
      readonly terrain: 'PLAZA' | 'ROAD' | null;
      readonly anchor: { readonly part: 'RIGHT_FLANK' | 'HEAD'; readonly object: TerrainObjectId };
      readonly frontTo: TerrainObjectId | null;
    })
  | (Base<'ZB-3'> & { readonly formation: FormationName })
  | (Base<'ZB-4'> & { readonly destination: TerrainObjectId | null; readonly running: boolean })
  | (Base<'R-1'> & { readonly side: Side })
  | (Base<'R-2'> & { readonly countTo: number | null })
  | (Base<'O-1'> & { readonly from: SoldierRef; readonly side: Side | null; readonly steps: number; readonly running: boolean })
  | (Base<'O-2'> & { readonly to: SoldierRef; readonly side: Side | null; readonly running: boolean })
  | Base<'S-1'>
  | Base<'S-2'>
  | (Base<'S-3'> & { readonly steps: number; readonly direction: ShiftDirection })
  | (Base<'S-4'> & { readonly side: Side })
  | (Base<'M-1'> & { readonly direction: MarchDirection })
  | Base<'M-2'>
  | Base<'M-3'>
  | Base<'M-4'>
  | Base<'M-5'>
  | Base<'M-6'>
  | Base<'M-7'>
  | Base<'M-8'>
  | (Base<'M-9'> & { readonly direction: Exclude<MarchDirection, 'FORWARD'> })
  | Base<'M-10'>
  | (Base<'M-11'> & { readonly side: Side })
  | Base<'MS-1'>
  | Base<'MS-2'>
  | Base<'X-1'>;

/** Komenda z regulaminu spoza MVP (E_OUT_OF_SCOPE), z identyfikatorem wpisu „N-…”. */
export interface OutOfScopeAst {
  readonly id: 'OUT_OF_SCOPE';
  readonly entryId: string;
}

export type CommandId = CommandAst['id'];
export type ParsedCommand = CommandAst | OutOfScopeAst;
