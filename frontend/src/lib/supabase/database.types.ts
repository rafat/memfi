export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      feedback: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          id: number
          strategy_id: number | null
          user_address: string | null
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          id?: number
          strategy_id?: number | null
          user_address?: string | null
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          id?: number
          strategy_id?: number | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_address"]
          },
        ]
      }
      learned_patterns: {
        Row: {
          avg_trade_size: number | null
          last_seen: string | null
          risk_bucket: string | null
          top_pairs: string[] | null
          user_address: string
        }
        Insert: {
          avg_trade_size?: number | null
          last_seen?: string | null
          risk_bucket?: string | null
          top_pairs?: string[] | null
          user_address: string
        }
        Update: {
          avg_trade_size?: number | null
          last_seen?: string | null
          risk_bucket?: string | null
          top_pairs?: string[] | null
          user_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "learned_patterns_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_address"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string | null
          executed_at: string | null
          gas_cost: number | null
          id: number
          intent: Json | null
          net_gain_usd: number | null
          roi_pct: number | null
          status: string | null
          success_rating: number | null
          title: string | null
          user_address: string | null
        }
        Insert: {
          created_at?: string | null
          executed_at?: string | null
          gas_cost?: number | null
          id?: number
          intent?: Json | null
          net_gain_usd?: number | null
          roi_pct?: number | null
          status?: string | null
          success_rating?: number | null
          title?: string | null
          user_address?: string | null
        }
        Update: {
          created_at?: string | null
          executed_at?: string | null
          gas_cost?: number | null
          id?: number
          intent?: Json | null
          net_gain_usd?: number | null
          roi_pct?: number | null
          status?: string | null
          success_rating?: number | null
          title?: string | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_address"]
          },
        ]
      }
      strategy_steps: {
        Row: {
          action: string | null
          amount_in: string | null
          amount_out: string | null
          id: number
          protocol: string | null
          step_order: number | null
          strategy_id: number | null
          token_in: string | null
          token_out: string | null
          tx_hash: string | null
        }
        Insert: {
          action?: string | null
          amount_in?: string | null
          amount_out?: string | null
          id?: number
          protocol?: string | null
          step_order?: number | null
          strategy_id?: number | null
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
        }
        Update: {
          action?: string | null
          amount_in?: string | null
          amount_out?: string | null
          id?: number
          protocol?: string | null
          step_order?: number | null
          strategy_id?: number | null
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_steps_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_steps_tx_hash_fkey"
            columns: ["tx_hash"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["tx_hash"]
          },
        ]
      }
      transactions: {
        Row: {
          action: string | null
          amount_in: string | null
          amount_out: string | null
          block_time: string | null
          gas_used: string | null
          id: number
          status: string | null
          token_in: string | null
          token_out: string | null
          tx_hash: string | null
          user_address: string | null
        }
        Insert: {
          action?: string | null
          amount_in?: string | null
          amount_out?: string | null
          block_time?: string | null
          gas_used?: string | null
          id?: number
          status?: string | null
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
          user_address?: string | null
        }
        Update: {
          action?: string | null
          amount_in?: string | null
          amount_out?: string | null
          block_time?: string | null
          gas_used?: string | null
          id?: number
          status?: string | null
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
          user_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_address_fkey"
            columns: ["user_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_address"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          user_address: string
        }
        Insert: {
          created_at?: string | null
          user_address: string
        }
        Update: {
          created_at?: string | null
          user_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
