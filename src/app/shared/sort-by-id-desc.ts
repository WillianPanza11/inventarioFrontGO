export function sortByIdDesc<T extends { id?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.id) - Number(a.id));
}
