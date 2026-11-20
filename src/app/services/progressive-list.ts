import { Observable, concatMap, defer, from, map, of, switchMap, tap, timer } from 'rxjs';

/**
 * Révèle progressivement le premier instantané, puis transmet les suivants immédiatement.
 *
 * @param snapshots Flux temps réel de listes déjà triées et validées.
 * @param intervalMs Délai entre deux éléments de la première liste.
 * @param onInitialListRevealed Appelé après la révélation complète du premier instantané.
 * @returns Une liste partielle par élément initial, puis chaque instantané complet suivant.
 */
export function revealInitialList<T>(
  snapshots: Observable<T[]>,
  intervalMs = 200,
  onInitialListRevealed?: () => void,
): Observable<T[]> {
  return defer(() => {
    let isInitialSnapshot = true;

    return snapshots.pipe(
      switchMap((items) => {
        if (!isInitialSnapshot) {
          return of(items);
        }

        isInitialSnapshot = false;
        const initialList = items.length
          ? from(items).pipe(
              concatMap((_, index) =>
                timer(index === 0 ? 0 : intervalMs).pipe(map(() => items.slice(0, index + 1))),
              ),
            )
          : of([]);

        return initialList.pipe(tap({ complete: () => onInitialListRevealed?.() }));
      }),
    );
  });
}
