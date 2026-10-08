/** Busca sem acento e sem diferenciar maiúsculas. */
export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function matchesQuery(product, query) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeText(
    [product.name, product.description, ...product.optionGroups.flatMap((g) => g.options.map((o) => o.name))].join(' '),
  );
  return terms.every((term) => haystack.includes(term));
}
