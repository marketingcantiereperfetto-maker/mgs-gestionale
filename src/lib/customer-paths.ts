export const customersPath = "/clienti";
export const newCustomerPath = "/clienti/nuovo";
export const incompleteCustomersPath = "/clienti/da-completare";

export function customerPath(id: string): string {
  return `${customersPath}/${id}`;
}
