export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          id: number;
          new_data: Json | null;
          occurred_at: string;
          old_data: Json | null;
          record_id: string;
          table_name: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id: string;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          record_id?: string;
          table_name?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          created_at: string;
          creation_key: string | null;
          id: string;
          is_active: boolean;
          logo_path: string | null;
          name: string;
          name_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creation_key?: string | null;
          id?: string;
          is_active?: boolean;
          logo_path?: string | null;
          name: string;
          name_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creation_key?: string | null;
          id?: string;
          is_active?: boolean;
          logo_path?: string | null;
          name?: string;
          name_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_postal_code: string | null;
          address_province: string | null;
          address_street: string | null;
          created_at: string;
          creation_key: string | null;
          email: string | null;
          fallback_logo_path: string | null;
          id: string;
          is_active: boolean;
          legal_name: string;
          tax_code: string | null;
          updated_at: string;
          vat_number: string | null;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_postal_code?: string | null;
          address_province?: string | null;
          address_street?: string | null;
          created_at?: string;
          creation_key?: string | null;
          email?: string | null;
          fallback_logo_path?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name: string;
          tax_code?: string | null;
          updated_at?: string;
          vat_number?: string | null;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_postal_code?: string | null;
          address_province?: string | null;
          address_street?: string | null;
          created_at?: string;
          creation_key?: string | null;
          email?: string | null;
          fallback_logo_path?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name?: string;
          tax_code?: string | null;
          updated_at?: string;
          vat_number?: string | null;
        };
        Relationships: [];
      };
      company_bank_accounts: {
        Row: {
          company_id: string;
          created_at: string;
          creation_key: string | null;
          iban: string;
          id: string;
          is_active: boolean;
          is_default: boolean;
          label: string | null;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          creation_key?: string | null;
          iban: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          label?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          creation_key?: string | null;
          iban?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          label?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_bank_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_brands: {
        Row: {
          brand_id: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          brand_id: string;
          company_id: string;
          created_at?: string;
        };
        Update: {
          brand_id?: string;
          company_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_brands_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_brands_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_postal_code: string | null;
          address_province: string | null;
          address_street: string | null;
          created_at: string;
          creation_key: string | null;
          foreign_tax_id: string | null;
          group_company_id: string | null;
          id: string;
          intent_declaration_date: string | null;
          intent_declaration_number: string | null;
          is_active: boolean;
          name: string;
          pa_office_code: string | null;
          pa_office_name: string | null;
          pec: string | null;
          sdi_code: string | null;
          split_payment: boolean | null;
          subject_type: Database["public"]["Enums"]["customer_subject_type"] | null;
          tax_code: string | null;
          updated_at: string;
          vat_exemption_nature: string | null;
          vat_number: string | null;
          vat_regime: Database["public"]["Enums"]["vat_regime"] | null;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_postal_code?: string | null;
          address_province?: string | null;
          address_street?: string | null;
          created_at?: string;
          creation_key?: string | null;
          foreign_tax_id?: string | null;
          group_company_id?: string | null;
          id?: string;
          intent_declaration_date?: string | null;
          intent_declaration_number?: string | null;
          is_active?: boolean;
          name: string;
          pa_office_code?: string | null;
          pa_office_name?: string | null;
          pec?: string | null;
          sdi_code?: string | null;
          split_payment?: boolean | null;
          subject_type?: Database["public"]["Enums"]["customer_subject_type"] | null;
          tax_code?: string | null;
          updated_at?: string;
          vat_exemption_nature?: string | null;
          vat_number?: string | null;
          vat_regime?: Database["public"]["Enums"]["vat_regime"] | null;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_postal_code?: string | null;
          address_province?: string | null;
          address_street?: string | null;
          created_at?: string;
          creation_key?: string | null;
          foreign_tax_id?: string | null;
          group_company_id?: string | null;
          id?: string;
          intent_declaration_date?: string | null;
          intent_declaration_number?: string | null;
          is_active?: boolean;
          name?: string;
          pa_office_code?: string | null;
          pa_office_name?: string | null;
          pec?: string | null;
          sdi_code?: string | null;
          split_payment?: boolean | null;
          subject_type?: Database["public"]["Enums"]["customer_subject_type"] | null;
          tax_code?: string | null;
          updated_at?: string;
          vat_exemption_nature?: string | null;
          vat_number?: string | null;
          vat_regime?: Database["public"]["Enums"]["vat_regime"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_group_company_id_fkey";
            columns: ["group_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_companies: {
        Row: {
          company_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_companies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_companies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          is_active: boolean;
          password_set_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          password_set_at?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          password_set_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      audit_actor_labels: {
        Args: { actor_ids: string[] };
        Returns: {
          email: string;
          full_name: string;
          user_id: string;
        }[];
      };
      health_check: { Args: never; Returns: Json };
      mark_password_set: { Args: never; Returns: undefined };
      set_bank_account_active: {
        Args: { account_id: string; active: boolean };
        Returns: undefined;
      };
      set_default_bank_account: {
        Args: { account_id: string };
        Returns: undefined;
      };
      user_has_password: { Args: { target_user_id: string }; Returns: boolean };
    };
    Enums: {
      customer_subject_type:
        "company" | "professional" | "private" | "public_administration" | "foreign";
      user_role: "owner" | "sales_manager" | "sales_consultant" | "catalog_admin" | "finance_admin";
      vat_regime: "ordinary" | "exempt" | "reverse_charge" | "intent_declaration";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      customer_subject_type: [
        "company",
        "professional",
        "private",
        "public_administration",
        "foreign",
      ],
      user_role: ["owner", "sales_manager", "sales_consultant", "catalog_admin", "finance_admin"],
      vat_regime: ["ordinary", "exempt", "reverse_charge", "intent_declaration"],
    },
  },
} as const;
