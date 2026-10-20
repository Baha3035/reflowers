export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["deal_event_type"]
          id: string
          order_id: string
          payload: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["deal_event_type"]
          id?: string
          order_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["deal_event_type"]
          id?: string
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["boost_kind"]
          listing_id: string
          price: number
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          kind: Database["public"]["Enums"]["boost_kind"]
          listing_id: string
          price: number
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["boost_kind"]
          listing_id?: string
          price?: number
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          boost_bump_until: string | null
          boost_highlight_until: string | null
          boost_top_until: string | null
          category: string
          city: string
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string | null
          district: string | null
          expires_at: string
          favorites_count: number
          id: string
          images: string[]
          original_price: number | null
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          urgent: boolean
          views: number
        }
        Insert: {
          boost_bump_until?: string | null
          boost_highlight_until?: string | null
          boost_top_until?: string | null
          category: string
          city?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          district?: string | null
          expires_at?: string
          favorites_count?: number
          id?: string
          images?: string[]
          original_price?: number | null
          price: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          urgent?: boolean
          views?: number
        }
        Update: {
          boost_bump_until?: string | null
          boost_highlight_until?: string | null
          boost_top_until?: string | null
          category?: string
          city?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          district?: string | null
          expires_at?: string
          favorites_count?: number
          id?: string
          images?: string[]
          original_price?: number | null
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          urgent?: boolean
          views?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          meta: Json
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          meta?: Json
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          meta?: Json
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          order_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          buyer_id: string
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string
          responded_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          amount: number
          buyer_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          responded_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          amount?: number
          buyer_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          responded_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "offers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_note: string | null
          cancel_reason: string | null
          commission: number
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          deal_status: Database["public"]["Enums"]["deal_status"]
          delivery_cost: number | null
          dispute_reason: string | null
          final_price: number | null
          id: string
          listing_id: string
          paid_at: string | null
          payment_details: string | null
          payment_method: string | null
          prepayment_amount: number | null
          prepayment_deadline: string | null
          price: number
          seller_amount: number
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_note?: string | null
          cancel_reason?: string | null
          commission?: number
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          delivery_cost?: number | null
          dispute_reason?: string | null
          final_price?: number | null
          id?: string
          listing_id: string
          paid_at?: string | null
          payment_details?: string | null
          payment_method?: string | null
          prepayment_amount?: number | null
          prepayment_deadline?: string | null
          price: number
          seller_amount?: number
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_note?: string | null
          cancel_reason?: string | null
          commission?: number
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["deal_status"]
          delivery_cost?: number | null
          dispute_reason?: string | null
          final_price?: number | null
          id?: string
          listing_id?: string
          paid_at?: string | null
          payment_details?: string | null
          payment_method?: string | null
          prepayment_amount?: number | null
          prepayment_deadline?: string | null
          price?: number
          seller_amount?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          contact_call: boolean
          contact_whatsapp: boolean
          created_at: string
          display_name: string | null
          district: string | null
          id: string
          phone: string | null
          phone_verified_at: string | null
          rating: number
          reviews_count: number
          seller_type: Database["public"]["Enums"]["seller_type"]
          shop_name: string | null
          telegram_id: number | null
          telegram_username: string | null
          telegram_notify: boolean
          updated_at: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          contact_call?: boolean
          contact_whatsapp?: boolean
          created_at?: string
          display_name?: string | null
          district?: string | null
          id: string
          phone?: string | null
          phone_verified_at?: string | null
          rating?: number
          reviews_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          shop_name?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          telegram_notify?: boolean
          updated_at?: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          contact_call?: boolean
          contact_whatsapp?: boolean
          created_at?: string
          display_name?: string | null
          district?: string | null
          id?: string
          phone?: string | null
          phone_verified_at?: string | null
          rating?: number
          reviews_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          shop_name?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          telegram_notify?: boolean
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          body: string | null
          created_at: string
          id: string
          sent_at: string | null
          tag: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          tag?: string | null
          title: string
          url?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          sent_at?: string | null
          tag?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_success_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_success_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_success_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          order_id: string | null
          rating: number
          reviewer_id: string
          target_user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          rating: number
          reviewer_id: string
          target_user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          rating?: number
          reviewer_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_tokens: {
        Row: {
          created_at: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          district: string | null
          id: string | null
          phone_verified: boolean | null
          rating: number | null
          reviews_count: number | null
          seller_type: Database["public"]["Enums"]["seller_type"] | null
          shop_name: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          district?: string | null
          id?: string | null
          phone_verified?: boolean | null
          rating?: number | null
          reviews_count?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"] | null
          shop_name?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          district?: string | null
          id?: string | null
          phone_verified?: boolean | null
          rating?: number | null
          reviews_count?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"] | null
          shop_name?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_cancel_deal: {
        Args: { _actor: string; _order_id: string; _reason: string }
        Returns: undefined
      }
      admin_review_boost: {
        Args: { _approve: boolean; _boost_id: string }
        Returns: undefined
      }
      boost_hours: {
        Args: { _kind: Database["public"]["Enums"]["boost_kind"] }
        Returns: number
      }
      boost_price: {
        Args: { _kind: Database["public"]["Enums"]["boost_kind"] }
        Returns: number
      }
      extend_listing: { Args: { _listing_id: string }; Returns: string }
      get_listing_contacts: {
        Args: { _listing_id: string }
        Returns: {
          call: boolean
          phone: string
          telegram: boolean
          telegram_username: string
          whatsapp: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      boost_kind: "bump" | "highlight" | "top" | "urgent"
      deal_event_type:
        | "buyer_requested"
        | "seller_confirmed"
        | "seller_declined"
        | "seller_set_terms"
        | "buyer_sent_prepayment"
        | "seller_confirmed_prepayment"
        | "seller_rejected_prepayment"
        | "bouquet_ready_pickup"
        | "bouquet_shipped"
        | "buyer_received"
        | "buyer_sent_full"
        | "seller_confirmed_full"
        | "cancelled"
        | "problem_reported"
      deal_status:
        | "awaiting_confirmation"
        | "awaiting_payment"
        | "in_progress"
        | "awaiting_completion"
        | "completed"
        | "cancelled"
        | "disputed"
      listing_condition: "new" | "fresh" | "day_old"
      listing_status: "active" | "sold" | "hidden" | "expired" | "reserved"
      message_kind: "text" | "offer" | "location" | "system" | "image"
      offer_status: "pending" | "accepted" | "declined" | "cancelled"
      order_status: "pending" | "paid" | "completed" | "cancelled" | "refunded"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      seller_type: "private" | "shop"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      boost_kind: ["bump", "highlight", "top", "urgent"],
      deal_event_type: [
        "buyer_requested",
        "seller_confirmed",
        "seller_declined",
        "seller_set_terms",
        "buyer_sent_prepayment",
        "seller_confirmed_prepayment",
        "seller_rejected_prepayment",
        "bouquet_ready_pickup",
        "bouquet_shipped",
        "buyer_received",
        "buyer_sent_full",
        "seller_confirmed_full",
        "cancelled",
        "problem_reported",
      ],
      deal_status: [
        "awaiting_confirmation",
        "awaiting_payment",
        "in_progress",
        "awaiting_completion",
        "completed",
        "cancelled",
        "disputed",
      ],
      listing_condition: ["new", "fresh", "day_old"],
      listing_status: ["active", "sold", "hidden", "expired", "reserved"],
      message_kind: ["text", "offer", "location", "system", "image"],
      offer_status: ["pending", "accepted", "declined", "cancelled"],
      order_status: ["pending", "paid", "completed", "cancelled", "refunded"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      seller_type: ["private", "shop"],
    },
  },
} as const
