export const companiesPath = "/impostazioni/societa-e-brand";
export const newCompanyPath = `${companiesPath}/societa/nuova`;

export function companyPath(id: string): string {
  return `${companiesPath}/societa/${id}`;
}
export const newBrandPath = `${companiesPath}/brand/nuovo`;

export function brandPath(id: string): string {
  return `${companiesPath}/brand/${id}`;
}
