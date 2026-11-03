import { createSupabaseServerClient } from "@/server/supabase";

export type Brand = {
  id: string;
  name: string;
  isActive: boolean;
  logoPath: string | null;
  companyIds: string[];
};

type BrandRow = {
  id: string;
  name: string;
  is_active: boolean;
  logo_path: string | null;
  company_brands: { company_id: string }[];
};

function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    logoPath: row.logo_path,
    companyIds: row.company_brands.map((link) => link.company_id),
  };
}

const columns = "id, name, is_active, logo_path, company_brands(company_id)";

export async function listBrands(): Promise<Brand[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("brands").select(columns).order("name");
  if (error) throw new Error(`Brand non letti: ${error.message}`);
  return data.map(toBrand);
}

export async function getBrand(id: string): Promise<Brand | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("brands").select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error(`Brand non letto: ${error.message}`);
  return data ? toBrand(data) : null;
}
