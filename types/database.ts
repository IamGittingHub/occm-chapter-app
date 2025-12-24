export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Gender = 'male' | 'female';
export type Grade = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad';
export type ContactMethod = 'text' | 'call' | 'email' | 'in_person' | 'other';
export type CommunicationStatus = 'pending' | 'successful' | 'transferred';

export interface Database {
  public: {
    Tables: {
      committee_members: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          first_name?: string;
          last_name?: string;
          gender?: Gender;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "committee_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      members: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          grade: Grade;
          major: string | null;
          minor: string | null;
          church: string | null;
          date_of_birth: string | null;
          email: string | null;
          phone: string | null;
          student_id: string | null;
          is_new_member: boolean;
          expected_graduation: string | null;
          wants_mentor: boolean;
          wants_to_mentor: boolean;
          notes: string | null;
          is_graduated: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          grade: Grade;
          major?: string | null;
          minor?: string | null;
          church?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          phone?: string | null;
          student_id?: string | null;
          is_new_member?: boolean;
          expected_graduation?: string | null;
          wants_mentor?: boolean;
          wants_to_mentor?: boolean;
          notes?: string | null;
          is_graduated?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          gender?: Gender;
          grade?: Grade;
          major?: string | null;
          minor?: string | null;
          church?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          phone?: string | null;
          student_id?: string | null;
          is_new_member?: boolean;
          expected_graduation?: string | null;
          wants_mentor?: boolean;
          wants_to_mentor?: boolean;
          notes?: string | null;
          is_graduated?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prayer_assignments: {
        Row: {
          id: string;
          member_id: string;
          committee_member_id: string;
          bucket_number: number;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          committee_member_id: string;
          bucket_number: number;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          committee_member_id?: string;
          bucket_number?: number;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prayer_assignments_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prayer_assignments_committee_member_id_fkey";
            columns: ["committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          }
        ];
      };
      communication_assignments: {
        Row: {
          id: string;
          member_id: string;
          committee_member_id: string;
          assigned_date: string;
          status: CommunicationStatus;
          last_contact_attempt: string | null;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          committee_member_id: string;
          assigned_date?: string;
          status?: CommunicationStatus;
          last_contact_attempt?: string | null;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          committee_member_id?: string;
          assigned_date?: string;
          status?: CommunicationStatus;
          last_contact_attempt?: string | null;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_assignments_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_assignments_committee_member_id_fkey";
            columns: ["committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          }
        ];
      };
      communication_logs: {
        Row: {
          id: string;
          assignment_id: string;
          committee_member_id: string;
          contact_date: string;
          contact_method: ContactMethod | null;
          notes: string | null;
          was_successful: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          committee_member_id: string;
          contact_date?: string;
          contact_method?: ContactMethod | null;
          notes?: string | null;
          was_successful?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          committee_member_id?: string;
          contact_date?: string;
          contact_method?: ContactMethod | null;
          notes?: string | null;
          was_successful?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_logs_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "communication_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_logs_committee_member_id_fkey";
            columns: ["committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          }
        ];
      };
      transfer_history: {
        Row: {
          id: string;
          member_id: string;
          from_committee_member_id: string;
          to_committee_member_id: string;
          reason: string | null;
          transferred_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          from_committee_member_id: string;
          to_committee_member_id: string;
          reason?: string | null;
          transferred_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          from_committee_member_id?: string;
          to_committee_member_id?: string;
          reason?: string | null;
          transferred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transfer_history_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transfer_history_from_committee_member_id_fkey";
            columns: ["from_committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transfer_history_to_committee_member_id_fkey";
            columns: ["to_committee_member_id"];
            isOneToOne: false;
            referencedRelation: "committee_members";
            referencedColumns: ["id"];
          }
        ];
      };
      app_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_active_committee_member: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type CommitteeMember = Database['public']['Tables']['committee_members']['Row'];
export type CommitteeMemberInsert = Database['public']['Tables']['committee_members']['Insert'];
export type CommitteeMemberUpdate = Database['public']['Tables']['committee_members']['Update'];

export type Member = Database['public']['Tables']['members']['Row'];
export type MemberInsert = Database['public']['Tables']['members']['Insert'];
export type MemberUpdate = Database['public']['Tables']['members']['Update'];

export type PrayerAssignment = Database['public']['Tables']['prayer_assignments']['Row'];
export type PrayerAssignmentInsert = Database['public']['Tables']['prayer_assignments']['Insert'];

export type CommunicationAssignment = Database['public']['Tables']['communication_assignments']['Row'];
export type CommunicationAssignmentInsert = Database['public']['Tables']['communication_assignments']['Insert'];
export type CommunicationAssignmentUpdate = Database['public']['Tables']['communication_assignments']['Update'];

export type CommunicationLog = Database['public']['Tables']['communication_logs']['Row'];
export type CommunicationLogInsert = Database['public']['Tables']['communication_logs']['Insert'];

export type TransferHistory = Database['public']['Tables']['transfer_history']['Row'];
export type TransferHistoryInsert = Database['public']['Tables']['transfer_history']['Insert'];

export type AppSetting = Database['public']['Tables']['app_settings']['Row'];

// Extended types with relations
export type MemberWithAssignments = Member & {
  prayer_assignments?: PrayerAssignment[];
  communication_assignments?: CommunicationAssignment[];
};

export type CommitteeMemberWithAssignments = CommitteeMember & {
  prayer_assignments?: (PrayerAssignment & { member: Member })[];
  communication_assignments?: (CommunicationAssignment & { member: Member })[];
};

export type CommunicationAssignmentWithDetails = CommunicationAssignment & {
  member: Member;
  committee_member: CommitteeMember;
  communication_logs?: CommunicationLog[];
};

export type PrayerAssignmentWithMember = PrayerAssignment & {
  member: Member;
};
