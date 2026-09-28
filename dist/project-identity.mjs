const clean = value => typeof value === 'string' ? value.trim() : '';

export function productNameFor(project = {}) {
  return clean(project.productName) || clean(project.name) || clean(project.title) || 'Unnamed product';
}

export function withProductName(project = {}) {
  return { ...project, productName: productNameFor(project) };
}
