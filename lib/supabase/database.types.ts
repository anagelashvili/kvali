
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "artists": {
                  Row: {
                    "address": string | null,"avatar_path": string | null,"bio_en": string | null,"bio_ka": string | null,"city": string,"created_at": string,"display_name": string,"id": string,"instagram": string | null,"languages": (string)[],"phone": string | null,"price_from": number | null,"price_to": number | null,"slug": string,"status": Database["public"]['Enums']["artist_status"],"studio": string | null,"updated_at": string
                  }
                  Insert: {
                    "address"?: string | null,"avatar_path"?: string | null,"bio_en"?: string | null,"bio_ka"?: string | null,"city"?: string,"created_at"?: string,"display_name": string,"id": string,"instagram"?: string | null,"languages"?: (string)[],"phone"?: string | null,"price_from"?: number | null,"price_to"?: number | null,"slug": string,"status"?: Database["public"]['Enums']["artist_status"],"studio"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"avatar_path"?: string | null,"bio_en"?: string | null,"bio_ka"?: string | null,"city"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"instagram"?: string | null,"languages"?: (string)[],"phone"?: string | null,"price_from"?: number | null,"price_to"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["artist_status"],"studio"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_events": {
                  Row: {
                    "bucket": string,"created_at": string,"key": string
                  }
                  Insert: {
                    "bucket": string,"created_at"?: string,"key": string
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"requests": {
                  Row: {
                    "artist_id": string,"body_view": string,"body_zone": string | null,"contact_email": string | null,"contact_instagram": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"id": string,"idea": string,"language": string,"placement": string | null,"pos_x": number | null,"pos_y": number | null,"reference_paths": (string)[],"size": Database["public"]['Enums']["tattoo_size"] | null,"size_cm": number | null,"status": Database["public"]['Enums']["request_status"],"style": string | null,"updated_at": string
                  }
                  Insert: {
                    "artist_id": string,"body_view"?: string,"body_zone"?: string | null,"contact_email"?: string | null,"contact_instagram"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"idea": string,"language"?: string,"placement"?: string | null,"pos_x"?: number | null,"pos_y"?: number | null,"reference_paths"?: (string)[],"size"?: Database["public"]['Enums']["tattoo_size"] | null,"size_cm"?: number | null,"status"?: Database["public"]['Enums']["request_status"],"style"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "artist_id"?: string,"body_view"?: string,"body_zone"?: string | null,"contact_email"?: string | null,"contact_instagram"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"idea"?: string,"language"?: string,"placement"?: string | null,"pos_x"?: number | null,"pos_y"?: number | null,"reference_paths"?: (string)[],"size"?: Database["public"]['Enums']["tattoo_size"] | null,"size_cm"?: number | null,"status"?: Database["public"]['Enums']["request_status"],"style"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requests_artist_id_fkey"
      columns: ["artist_id"]
isOneToOne: false
      referencedRelation: "artists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requests_style_fkey"
      columns: ["style"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["slug"]
    }
                  ]
                },"tags": {
                  Row: {
                    "kind": Database["public"]['Enums']["tag_kind"],"name_en": string,"name_ka": string,"slug": string,"sort": number
                  }
                  Insert: {
                    "kind": Database["public"]['Enums']["tag_kind"],"name_en": string,"name_ka": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "kind"?: Database["public"]['Enums']["tag_kind"],"name_en"?: string,"name_ka"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"work_tags": {
                  Row: {
                    "tag": string,"work_id": string
                  }
                  Insert: {
                    "tag": string,"work_id": string
                  }
                  Update: {
                    "tag"?: string,"work_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_tags_tag_fkey"
      columns: ["tag"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "work_tags_work_id_fkey"
      columns: ["work_id"]
isOneToOne: false
      referencedRelation: "works"
      referencedColumns: ["id"]
    }
                  ]
                },"works": {
                  Row: {
                    "artist_id": string,"caption": string | null,"created_at": string,"feel_color": number | null,"feel_detail": number | null,"feel_scale": number | null,"feel_weight": number | null,"height": number,"id": string,"image_path": string,"position": number,"published": boolean,"thumb_path": string,"width": number
                  }
                  Insert: {
                    "artist_id": string,"caption"?: string | null,"created_at"?: string,"feel_color"?: number | null,"feel_detail"?: number | null,"feel_scale"?: number | null,"feel_weight"?: number | null,"height": number,"id"?: string,"image_path": string,"position"?: number,"published"?: boolean,"thumb_path": string,"width": number
                  }
                  Update: {
                    "artist_id"?: string,"caption"?: string | null,"created_at"?: string,"feel_color"?: number | null,"feel_detail"?: number | null,"feel_scale"?: number | null,"feel_weight"?: number | null,"height"?: number,"id"?: string,"image_path"?: string,"position"?: number,"published"?: boolean,"thumb_path"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "works_artist_id_fkey"
      columns: ["artist_id"]
isOneToOne: false
      referencedRelation: "artists"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "explore_works":
{ Args: { "p_before"?: string,"p_before_id"?: string,"p_limit"?: number,"p_q"?: string,"p_styles"?: (string)[],"p_vibes"?: (string)[] }; Returns: {
              "artist_name": string,"artist_slug": string,"artist_studio": string,"caption": string,"created_at": string,"feel_color": number,"feel_detail": number,"feel_scale": number,"feel_weight": number,"height": number,"id": string,"image_path": string,"tags": (string)[],"thumb_path": string,"width": number
            }[]
                           },
"hit_rate":
{ Args: { "p_bucket": string,"p_key": string,"p_max": number,"p_window": string }; Returns: boolean
                           },
"search_artists":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_q"?: string,"p_styles"?: (string)[] }; Returns: {
              "avatar_path": string,"city": string,"display_name": string,"id": string,"languages": (string)[],"preview": (string)[],"price_from": number,"price_to": number,"slug": string,"studio": string,"styles": (string)[],"work_count": number
            }[]
                           }
          }
          Enums: {
            "artist_status": "pending"|"approved"|"hidden","request_status": "new"|"replied"|"booked"|"declined","tag_kind": "style"|"vibe","tattoo_size": "tiny"|"small"|"medium"|"large"|"xl"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "artist_status": ["pending", "approved", "hidden"],"request_status": ["new", "replied", "booked", "declined"],"tag_kind": ["style", "vibe"],"tattoo_size": ["tiny", "small", "medium", "large", "xl"]
          }
        }
} as const
