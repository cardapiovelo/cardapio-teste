/** Agrupa os produtos nas seções exibidas no cardápio. */
import { hasPromo } from '../domain/pricing.js';
import { matchesQuery } from '../domain/search.js';

/**
 * @returns {{ id: string, title: string, products: object[] }[]}
 * Ordem: Mais vendidos, Promoções e depois as categorias na ordem do painel.
 */
export function buildSections(store, query = '') {
  const visible = store.products.filter((product) => product.active && matchesQuery(product, query));
  const sections = [];

  const featured = visible.filter((product) => product.featured);
  if (featured.length) sections.push({ id: 'destaques', title: 'Mais vendidos', products: featured });

  const promos = visible.filter(hasPromo);
  if (promos.length) sections.push({ id: 'promocoes', title: 'Promoções', products: promos });

  for (const category of store.categories) {
    if (!category.active) continue;
    const products = visible.filter((product) => product.categoryId === category.id);
    if (products.length) sections.push({ id: `cat-${category.id}`, title: category.name, products });
  }
  return sections;
}
