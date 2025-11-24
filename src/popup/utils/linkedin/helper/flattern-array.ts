export function splitAndFlattenArray(queriesArray: string[]): string[] {
  return queriesArray
    .flatMap((query) =>
      query
        // split only on uppercase "OR" with spaces around OR, or comma
        .split(/\s+OR\s+|,/)
        .map((term) => term.trim().toUpperCase())
    )
    .filter((term) => term.length > 0);
}
