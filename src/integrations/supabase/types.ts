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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          accent_color: string | null
          background_color: string | null
          body_text: string | null
          created_at: string | null
          description: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          body_text?: string | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          body_text?: string | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string | null
          course_title: string
          created_at: string | null
          danger_class: Database["public"]["Enums"]["danger_class"] | null
          duration_hours: number | null
          enrollment_id: string
          expiry_date: string | null
          holder_name: string
          holder_tc: string | null
          id: string
          is_valid: boolean | null
          issue_date: string | null
          pdf_url: string | null
          qr_code: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id?: string | null
          course_title: string
          created_at?: string | null
          danger_class?: Database["public"]["Enums"]["danger_class"] | null
          duration_hours?: number | null
          enrollment_id: string
          expiry_date?: string | null
          holder_name: string
          holder_tc?: string | null
          id?: string
          is_valid?: boolean | null
          issue_date?: string | null
          pdf_url?: string | null
          qr_code?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string | null
          course_title?: string
          created_at?: string | null
          danger_class?: Database["public"]["Enums"]["danger_class"] | null
          duration_hours?: number | null
          enrollment_id?: string
          expiry_date?: string | null
          holder_name?: string
          holder_tc?: string | null
          id?: string
          is_valid?: boolean | null
          issue_date?: string | null
          pdf_url?: string | null
          qr_code?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string | null
          danger_class: Database["public"]["Enums"]["danger_class"]
          description: string | null
          id: string
          name: string
          required_hours: number
        }
        Insert: {
          created_at?: string | null
          danger_class: Database["public"]["Enums"]["danger_class"]
          description?: string | null
          id?: string
          name: string
          required_hours: number
        }
        Update: {
          created_at?: string | null
          danger_class?: Database["public"]["Enums"]["danger_class"]
          description?: string | null
          id?: string
          name?: string
          required_hours?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          auto_certificate: boolean | null
          category_id: string | null
          certificate_template_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          require_sequential: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auto_certificate?: boolean | null
          category_id?: string | null
          certificate_template_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          require_sequential?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auto_certificate?: boolean | null
          category_id?: string | null
          certificate_template_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          require_sequential?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          expires_at: string | null
          firm_id: string | null
          id: string
          progress_percent: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          completed_at: string | null
          correct_answers: number
          created_at: string | null
          enrollment_id: string
          exam_id: string
          id: string
          score: number
          started_at: string | null
          status: Database["public"]["Enums"]["exam_status"] | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          correct_answers: number
          created_at?: string | null
          enrollment_id: string
          exam_id: string
          id?: string
          score: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"] | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          correct_answers?: number
          created_at?: string | null
          enrollment_id?: string
          exam_id?: string
          id?: string
          score?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"] | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string | null
          duration_minutes: number | null
          exam_type: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          passing_score: number | null
          question_count: number | null
          randomize_questions: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          question_count?: number | null
          randomize_questions?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          question_count?: number | null
          randomize_questions?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          bg_color: string | null
          created_at: string | null
          custom_css: string | null
          email: string | null
          favicon_url: string | null
          firm_code: string | null
          footer_text: string | null
          id: string
          is_active: boolean | null
          login_bg_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          sector: string | null
          tax_number: string | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          address?: string | null
          bg_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          email?: string | null
          favicon_url?: string | null
          firm_code?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          login_bg_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sector?: string | null
          tax_number?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          address?: string | null
          bg_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          email?: string | null
          favicon_url?: string | null
          firm_code?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          login_bg_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sector?: string | null
          tax_number?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      group_courses: {
        Row: {
          course_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          firm_id: string | null
          group_key: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          group_key: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          group_key?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          created_at: string | null
          enrollment_id: string
          id: string
          lesson_id: string | null
          lesson_location: string | null
          lesson_status: string | null
          score_max: number | null
          score_min: number | null
          score_raw: number | null
          scorm_package_id: string | null
          suspend_data: string | null
          total_time: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_id: string
          id?: string
          lesson_id?: string | null
          lesson_location?: string | null
          lesson_status?: string | null
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          scorm_package_id?: string | null
          suspend_data?: string | null
          total_time?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string
          id?: string
          lesson_id?: string | null
          lesson_location?: string | null
          lesson_status?: string | null
          score_max?: number | null
          score_min?: number | null
          score_raw?: number | null
          scorm_package_id?: string | null
          suspend_data?: string | null
          total_time?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string
          duration_minutes: number
          exam_id: string | null
          id: string
          is_active: boolean
          scorm_package_id: string | null
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          is_active?: boolean
          scorm_package_id?: string | null
          sort_order?: number
          title: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          is_active?: boolean
          scorm_package_id?: string | null
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_tracking: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          joined_at: string
          left_at: string | null
          live_session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          live_session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          live_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_tracking_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lesson_id: string
          room_key: string
          room_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lesson_id: string
          room_key: string
          room_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lesson_id?: string
          room_key?: string
          room_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          firm_id: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          tc_identity: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          firm_id?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          tc_identity?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          firm_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          tc_identity?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          exam_id: string
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"] | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          exam_id: string
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          exam_id?: string
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_packages: {
        Row: {
          course_id: string
          created_at: string | null
          entry_point: string | null
          id: string
          package_url: string
          scorm_version: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          entry_point?: string | null
          id?: string
          package_url: string
          scorm_version?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          entry_point?: string | null
          id?: string
          package_url?: string
          scorm_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_packages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users_to_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_to_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_certificates: {
        Row: {
          certificate_number: string | null
          course_title: string | null
          danger_class: Database["public"]["Enums"]["danger_class"] | null
          duration_hours: number | null
          holder_name_short: string | null
          holder_tc_masked: string | null
          is_valid: boolean | null
          issue_date: string | null
        }
        Insert: {
          certificate_number?: string | null
          course_title?: string | null
          danger_class?: Database["public"]["Enums"]["danger_class"] | null
          duration_hours?: number | null
          holder_name_short?: never
          holder_tc_masked?: never
          is_valid?: boolean | null
          issue_date?: string | null
        }
        Update: {
          certificate_number?: string | null
          course_title?: string | null
          danger_class?: Database["public"]["Enums"]["danger_class"] | null
          duration_hours?: number | null
          holder_name_short?: never
          holder_tc_masked?: never
          is_valid?: boolean | null
          issue_date?: string | null
        }
        Relationships: []
      }
      questions_for_students: {
        Row: {
          exam_id: string | null
          id: string | null
          options: Json | null
          points: number | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
        }
        Insert: {
          exam_id?: string | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
        }
        Update: {
          exam_id?: string | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      complete_enrollment: {
        Args: { _enrollment_id: string }
        Returns: undefined
      }
      get_email_by_tc: { Args: { tc_no: string }; Returns: string }
      get_my_firm_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      join_live_session: { Args: { _live_session_id: string }; Returns: string }
      leave_live_session: {
        Args: { _duration_seconds: number; _tracking_id: string }
        Returns: undefined
      }
      record_lesson_progress: {
        Args: {
          _enrollment_id: string
          _lesson_id: string
          _lesson_location?: string
          _lesson_status: string
          _score_raw?: number
          _scorm_package_id?: string
          _suspend_data?: string
          _total_time?: number
        }
        Returns: string
      }
      update_enrollment_progress: {
        Args: {
          _enrollment_id: string
          _progress_percent: number
          _status?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "company_admin"
        | "student"
        | "firm_admin"
      danger_class: "low" | "medium" | "high"
      enrollment_status:
        | "pending"
        | "active"
        | "completed"
        | "failed"
        | "expired"
      exam_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "passed"
        | "failed"
      lesson_type: "scorm" | "exam" | "live" | "content"
      question_type: "multiple_choice" | "true_false"
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
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "company_admin",
        "student",
        "firm_admin",
      ],
      danger_class: ["low", "medium", "high"],
      enrollment_status: [
        "pending",
        "active",
        "completed",
        "failed",
        "expired",
      ],
      exam_status: [
        "not_started",
        "in_progress",
        "completed",
        "passed",
        "failed",
      ],
      lesson_type: ["scorm", "exam", "live", "content"],
      question_type: ["multiple_choice", "true_false"],
    },
  },
} as const
