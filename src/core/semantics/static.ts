import type { CommandAst, FormationName } from '../grammar/ast';
import type { MessageCode } from '../messages';

/**
 * Reguły regulaminu, które da się sprawdzić z samej komendy, bez stanu drużyny (krok 4 potoku,
 * SPEC 4.3). Warunki wstępne zależne od stanu (postawa, szyk, ruch…) dochodzą od etapu E2.
 */

export interface RuleViolation {
  readonly code: MessageCode;
  readonly message: string;
  readonly points: readonly string[];
}

const DEPLOYED: readonly FormationName[] = ['SINGLE_RANK', 'DOUBLE_RANK'];

export function staticViolations(command: CommandAst): RuleViolation[] {
  switch (command.id) {
    case 'ZB-2': {
      const deployed = DEPLOYED.includes(command.formation);
      if (deployed && command.anchor.part === 'HEAD') {
        return [
          {
            code: 'E_PRECOND_FORMATION',
            message:
              '„Czoło” dotyczy kolumny (rząd, kolumna dwójkowa). W szeregu i dwuszeregu wskazuje się prawe skrzydło: „…, prawe skrzydło na wysokości …”.',
            points: ['69'],
          },
        ];
      }
      if (!deployed && command.anchor.part === 'RIGHT_FLANK') {
        return [
          {
            code: 'E_PRECOND_FORMATION',
            message:
              '„Prawe skrzydło” dotyczy szyku rozwiniętego (szereg, dwuszereg). W rzędzie i kolumnie dwójkowej wskazuje się czoło: „…, czoło na wysokości …”.',
            points: ['69'],
          },
        ];
      }
      return [];
    }
    case 'S-3': {
      if (command.direction === 'BACK' && command.steps > 1) {
        return [
          {
            code: 'E_RULE',
            message:
              'Szyk przesuwa się w tył najwyżej o krok. Aby przesunąć go dalej, najpierw „W tył – ZWROT”, potem przesunięcie na wprost.',
            points: ['74'],
          },
        ];
      }
      if (command.direction === 'LEFT' || command.direction === 'RIGHT') {
        return [
          {
            code: 'E_RULE',
            message:
              'Przesunięcie szyku w prawo (w lewo) wykonuje się po zmianie frontu: najpierw zwrot, potem przesunięcie na wprost.',
            points: ['74'],
          },
        ];
      }
      return [];
    }
    default:
      return [];
  }
}
