export const companiesPath = "/impostazioni/societa-e-brand";
export const newCompanyPath = `${companiesPath}/societa/nuova`;

export function companyPath(id: string): string {
  return `${companiesPath}/societa/${id}`;
}
