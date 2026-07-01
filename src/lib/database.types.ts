export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

export type Database = {
  public: {
    Tables: {
      profile_views: {
        Row: {
          id: string;
          viewer_id: string;
          viewed_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          viewer_id: string;
          viewed_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          viewer_id?: string;
          viewed_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      profile_view_unlocks: {
        Row: {
          id: string;
          user_id: string;
          unlocked_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unlocked_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unlocked_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      likes_received_unlocks: {
        Row: {
          id: string;
          user_id: string;
          unlocked_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unlocked_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unlocked_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      profile_boosts: {
        Row: {
          id: string;
          user_id: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          starts_at?: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      top_picks: {
        Row: {
          id: string;
          user_id: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          starts_at?: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      super_likes: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      users: {
        Row: {
          id: string;
          full_name: string | null;
          gender: "male" | "female" | "other" | null;
          date_of_birth: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          religion: string | null;
          education: string | null;
          relationship_goal: "dating" | "marriage" | null;
          bio: string | null;
          avatar_url: string | null;
          verification_id_type:
            | "ghana_card"
            | "drivers_license"
            | "nhis"
            | "passport"
            | null;
          verification_id_image_url: string | null;
          verification_selfie_url: string | null;
          verified: boolean;
          verification_status: VerificationStatus;
          verification_note: string | null;
          verification_image_url: string | null;
          submitted_for_verification_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
          referral_code: string | null;
          referred_by: string | null;
          is_admin: boolean;
          is_banned: boolean;
          created_at: string;
          updated_at: string | null;
          last_seen_at: string | null;
          profile_completion: number | null;
          profile_completed_reward: boolean;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          gender?: "male" | "female" | "other" | null;
          date_of_birth?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          religion?: string | null;
          education?: string | null;
          relationship_goal?: "dating" | "marriage" | null;
          bio?: string | null;
          avatar_url?: string | null;
          verification_id_type?:
            | "ghana_card"
            | "drivers_license"
            | "nhis"
            | "passport"
            | null;
          verification_id_image_url?: string | null;
          verification_selfie_url?: string | null;
          verified?: boolean;
          verification_status?: VerificationStatus;
          verification_note?: string | null;
          verification_image_url?: string | null;
          submitted_for_verification_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string | null;
          last_seen_at?: string | null;
          profile_completion?: number | null;
          profile_completed_reward?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          gender?: "male" | "female" | "other" | null;
          date_of_birth?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          religion?: string | null;
          education?: string | null;
          relationship_goal?: "dating" | "marriage" | null;
          bio?: string | null;
          avatar_url?: string | null;
          verification_id_type?:
            | "ghana_card"
            | "drivers_license"
            | "nhis"
            | "passport"
            | null;
          verification_id_image_url?: string | null;
          verification_selfie_url?: string | null;
          verified?: boolean;
          verification_status?: VerificationStatus;
          verification_note?: string | null;
          verification_image_url?: string | null;
          submitted_for_verification_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string | null;
          last_seen_at?: string | null;
          profile_completion?: number | null;
          profile_completed_reward?: boolean;
        };
        Relationships: [];
      };

      daily_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_date: string;
          credits_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_date?: string;
          credits_awarded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reward_date?: string;
          credits_awarded?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      photos: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          photo_url?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: "free" | "premium";
          status: "active" | "inactive" | "cancelled" | "expired";
          started_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type?: "free" | "premium";
          status?: "active" | "inactive" | "cancelled" | "expired";
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: "free" | "premium";
          status?: "active" | "inactive" | "cancelled" | "expired";
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      likes: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          created_at: string;
          is_read: boolean;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          created_at?: string;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          created_at?: string;
          is_read?: boolean;
        };
        Relationships: [];
      };

      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      daily_likes: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          likes_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          likes_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          likes_count?: number;
        };
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message_text: string | null;
          read: boolean;
          created_at: string;
          conversation_id: string;
          content: string;
          type: "text" | "image" | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          message_text?: string | null;
          read?: boolean;
          created_at?: string;
          conversation_id: string;
          content: string;
          type?: "text" | "image" | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          message_text?: string | null;
          read?: boolean;
          created_at?: string;
          conversation_id?: string;
          content?: string;
          type?: "text" | "image" | null;
          image_url?: string | null;
        };
        Relationships: [];
      };

      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      credit_wallets: {
        Row: {
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: string;
          description: string | null;
          created_at: string;
          payment_reference: string | null;
          amount_paid: number | null;
          currency: string | null;
          payment_provider: string | null;
          subscription_plan: string | null;
          subscription_months: number | null;
          subscription_expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: string;
          description?: string | null;
          created_at?: string;
          payment_reference?: string | null;
          amount_paid?: number | null;
          currency?: string | null;
          payment_provider?: string | null;
          subscription_plan?: string | null;
          subscription_months?: number | null;
          subscription_expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: string;
          description?: string | null;
          created_at?: string;
          payment_reference?: string | null;
          amount_paid?: number | null;
          currency?: string | null;
          payment_provider?: string | null;
          subscription_plan?: string | null;
          subscription_months?: number | null;
          subscription_expires_at?: string | null;
        };
        Relationships: [];
      };

      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_user_id: string;
          reward_credits: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_user_id: string;
          reward_credits?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_user_id?: string;
          reward_credits?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {};

    Functions: {

      get_user_activity_summary: {
  Args: {
    p_user_id: string;
  };
  Returns: Json;
};

      get_user_subscription: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };

      has_active_premium: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };

      activate_premium_subscription: {
        Args: {
          p_user_id: string;
          p_months?: number;
        };
        Returns: Json;
      };

      has_active_likes_received_unlock: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };

      unlock_likes_received: {
        Args: {
          p_user_id: string;
          p_cost?: number;
        };
        Returns: Json;
      };

      award_profile_completion_reward: {
        Args: {
          p_user_id: string;
          p_completion: number;
          p_reward?: number;
        };
        Returns: Json;
      };

      record_profile_view: {
        Args: {
          p_viewer_id: string;
          p_viewed_user_id: string;
        };
        Returns: void;
      };

      unlock_profile_viewers: {
        Args: {
          p_user_id: string;
          p_cost?: number;
        };
        Returns: Json;
      };

      has_active_profile_view_unlock: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };

      activate_profile_boost: {
        Args: {
          p_user_id: string;
          p_duration_minutes: number;
          p_cost: number;
        };
        Returns: Json;
      };

      activate_top_pick: {
        Args: {
          duration_minutes: number;
          cost: number;
        };
        Returns: Json;
      };

      get_discovery_profiles_with_boosts: {
        Args: {
          p_current_user_id: string;
        };
        Returns: Database["public"]["Tables"]["users"]["Row"][];
      };

      send_super_like: {
        Args: {
          target_user_id: string;
          super_like_message?: string | null;
        };
        Returns: Json;
      };

      send_credit_message: {
        Args: {
          p_conversation_id: string;
          p_sender_id: string;
          p_receiver_id: string;
          p_content: string;
          p_image_url?: string | null;
          p_message_type?: string;
        };
        Returns: Database["public"]["Tables"]["messages"]["Row"];
      };

      claim_daily_reward: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };

      apply_referral_reward: {
  Args: {
    p_new_user_id: string;
    p_referral_code: string;
  };
  Returns: Json;
};

      ensure_user_referral_code: {
        Args: {
          p_user_id: string;
        };
        Returns: string;
      };

      create_user_wallet_if_missing: {
        Args: {
          p_user_id: string;
        };
        Returns: void;
      };
    };

    Enums: {};
  };
};