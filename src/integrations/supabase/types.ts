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
      absence_renewal_records: {
        Row: {
          absence_days: number | null
          absence_end: string
          absence_start: string
          assigned_course_id: string | null
          created_at: string | null
          created_by: string | null
          firm_id: string | null
          id: string
          reason: string | null
          requires_bilgi_yenileme: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          absence_days?: number | null
          absence_end: string
          absence_start: string
          assigned_course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          firm_id?: string | null
          id?: string
          reason?: string | null
          requires_bilgi_yenileme?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          absence_days?: number | null
          absence_end?: string
          absence_start?: string
          assigned_course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          firm_id?: string | null
          id?: string
          reason?: string | null
          requires_bilgi_yenileme?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_renewal_records_assigned_course_id_fkey"
            columns: ["assigned_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_renewal_records_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
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
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          published: boolean
          published_at: string
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          read_time?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          read_time?: string | null
          slug?: string
          title?: string
          updated_at?: string
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      company_topic4_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          custom_content_url: string | null
          custom_risk_data: Json | null
          firm_id: string
          id: string
          is_active: boolean | null
          topic4_pack_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          custom_content_url?: string | null
          custom_risk_data?: Json | null
          firm_id: string
          id?: string
          is_active?: boolean | null
          topic4_pack_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          custom_content_url?: string | null
          custom_risk_data?: Json | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          topic4_pack_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_topic4_assignments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_topic4_assignments_topic4_pack_id_fkey"
            columns: ["topic4_pack_id"]
            isOneToOne: false
            referencedRelation: "topic4_sector_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string | null
          firm_id: string | null
          generated_by: string | null
          id: string
          pdf_url: string | null
          report_data: Json | null
          report_type: string
        }
        Insert: {
          created_at?: string | null
          firm_id?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          report_data?: Json | null
          report_type: string
        }
        Update: {
          created_at?: string | null
          firm_id?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          report_data?: Json | null
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
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
      course_join_requests: {
        Row: {
          course_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          firm_id: string | null
          id: string
          note: string | null
          requested_at: string
          status: Database["public"]["Enums"]["join_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          firm_id?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          firm_id?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_template_rules: {
        Row: {
          course_id: string
          created_at: string | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id: string
          max_exam_attempts: number | null
          min_topic4_hours: number
          min_total_hours: number
          passing_score: number | null
          recurrence_months: number | null
          requires_final_assessment: boolean | null
          requires_pre_assessment: boolean | null
          topic4_method: Database["public"]["Enums"]["lesson_delivery_method"]
          training_type: Database["public"]["Enums"]["training_type_enum"]
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          max_exam_attempts?: number | null
          min_topic4_hours?: number
          min_total_hours?: number
          passing_score?: number | null
          recurrence_months?: number | null
          requires_final_assessment?: boolean | null
          requires_pre_assessment?: boolean | null
          topic4_method?: Database["public"]["Enums"]["lesson_delivery_method"]
          training_type: Database["public"]["Enums"]["training_type_enum"]
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          hazard_class?: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          max_exam_attempts?: number | null
          min_topic4_hours?: number
          min_total_hours?: number
          passing_score?: number | null
          recurrence_months?: number | null
          requires_final_assessment?: boolean | null
          requires_pre_assessment?: boolean | null
          topic4_method?: Database["public"]["Enums"]["lesson_delivery_method"]
          training_type?: Database["public"]["Enums"]["training_type_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_template_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          auto_certificate: boolean | null
          category_id: string | null
          certificate_template_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          hazard_class_new:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          legacy_regulation: boolean | null
          min_total_hours: number | null
          require_sequential: boolean
          thumbnail_url: string | null
          title: string
          training_type:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
          updated_at: string | null
        }
        Insert: {
          auto_certificate?: boolean | null
          category_id?: string | null
          certificate_template_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          hazard_class_new?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          legacy_regulation?: boolean | null
          min_total_hours?: number | null
          require_sequential?: boolean
          thumbnail_url?: string | null
          title: string
          training_type?:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
          updated_at?: string | null
        }
        Update: {
          auto_certificate?: boolean | null
          category_id?: string | null
          certificate_template_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          hazard_class_new?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          legacy_regulation?: boolean | null
          min_total_hours?: number | null
          require_sequential?: boolean
          thumbnail_url?: string | null
          title?: string
          training_type?:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
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
      document_templates: {
        Row: {
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          id: string
          is_active: boolean | null
          name: string
          template_html: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          id?: string
          is_active?: boolean | null
          name: string
          template_html?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          id?: string
          is_active?: boolean | null
          name?: string
          template_html?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          deleted_at: string | null
          expires_at: string | null
          firm_id: string | null
          id: string
          progress_percent: number | null
          recurrence_due_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          training_type:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          progress_percent?: number | null
          recurrence_due_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          training_type?:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          progress_percent?: number | null
          recurrence_due_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          training_type?:
            | Database["public"]["Enums"]["training_type_enum"]
            | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      face_to_face_attendance: {
        Row: {
          admin_verified: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          duration_minutes: number | null
          end_of_session_ack: boolean | null
          enrollment_id: string | null
          id: string
          ip_address: string | null
          join_method: string | null
          notes: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status_enum"] | null
          trainer_verified: boolean | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
          verification_method: string | null
        }
        Insert: {
          admin_verified?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_of_session_ack?: boolean | null
          enrollment_id?: string | null
          id?: string
          ip_address?: string | null
          join_method?: string | null
          notes?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status_enum"] | null
          trainer_verified?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          verification_method?: string | null
        }
        Update: {
          admin_verified?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_of_session_ack?: boolean | null
          enrollment_id?: string | null
          id?: string
          ip_address?: string | null
          join_method?: string | null
          notes?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status_enum"] | null
          trainer_verified?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "face_to_face_attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "f2f_sessions_student_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "face_to_face_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      face_to_face_sessions: {
        Row: {
          attendance_code: string | null
          capacity: number | null
          course_id: string | null
          created_at: string | null
          end_time: string
          firm_id: string | null
          id: string
          lesson_id: string | null
          location: string
          notes: string | null
          qr_token: string | null
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_code?: string | null
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          end_time: string
          firm_id?: string | null
          id?: string
          lesson_id?: string | null
          location: string
          notes?: string | null
          qr_token?: string | null
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_code?: string | null
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          end_time?: string
          firm_id?: string | null
          id?: string
          lesson_id?: string | null
          location?: string
          notes?: string | null
          qr_token?: string | null
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "face_to_face_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      firms: {
        Row: {
          address: string | null
          bg_color: string | null
          created_at: string | null
          custom_css: string | null
          deleted_at: string | null
          email: string | null
          favicon_url: string | null
          firm_code: string | null
          footer_text: string | null
          hazard_class_new:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id: string
          is_active: boolean | null
          login_bg_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          risk_profile: Json | null
          secondary_color: string | null
          sector: string | null
          sector_id: string | null
          tax_number: string | null
          updated_at: string | null
          welcome_message: string | null
          workplace_type_id: string | null
        }
        Insert: {
          address?: string | null
          bg_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          deleted_at?: string | null
          email?: string | null
          favicon_url?: string | null
          firm_code?: string | null
          footer_text?: string | null
          hazard_class_new?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          is_active?: boolean | null
          login_bg_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          risk_profile?: Json | null
          secondary_color?: string | null
          sector?: string | null
          sector_id?: string | null
          tax_number?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          workplace_type_id?: string | null
        }
        Update: {
          address?: string | null
          bg_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          deleted_at?: string | null
          email?: string | null
          favicon_url?: string | null
          firm_code?: string | null
          footer_text?: string | null
          hazard_class_new?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          is_active?: boolean | null
          login_bg_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          risk_profile?: Json | null
          secondary_color?: string | null
          sector?: string | null
          sector_id?: string | null
          tax_number?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          workplace_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firms_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firms_workplace_type_id_fkey"
            columns: ["workplace_type_id"]
            isOneToOne: false
            referencedRelation: "workplace_types"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string | null
          document_data: Json | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          enrollment_id: string | null
          firm_id: string | null
          id: string
          pdf_url: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_data?: Json | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          enrollment_id?: string | null
          firm_id?: string | null
          id?: string
          pdf_url?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_data?: Json | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          enrollment_id?: string | null
          firm_id?: string | null
          id?: string
          pdf_url?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
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
          deleted_at: string | null
          firm_id: string | null
          group_key: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          firm_id?: string | null
          group_key: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
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
      homepage_content_blocks: {
        Row: {
          block_type: string
          content: string | null
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          block_type: string
          content?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          content?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_method_rules: {
        Row: {
          allowed_methods: Database["public"]["Enums"]["lesson_delivery_method"][]
          created_at: string | null
          id: string
          lesson_id: string
          min_duration_minutes: number | null
          required_method:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          topic_group: number | null
        }
        Insert: {
          allowed_methods?: Database["public"]["Enums"]["lesson_delivery_method"][]
          created_at?: string | null
          id?: string
          lesson_id: string
          min_duration_minutes?: number | null
          required_method?:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          topic_group?: number | null
        }
        Update: {
          allowed_methods?: Database["public"]["Enums"]["lesson_delivery_method"][]
          created_at?: string | null
          id?: string
          lesson_id?: string
          min_duration_minutes?: number | null
          required_method?:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          topic_group?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_method_rules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
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
          deleted_at: string | null
          delivery_method:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          duration_minutes: number
          exam_id: string | null
          id: string
          is_active: boolean
          min_live_duration_minutes: number
          scorm_package_id: string | null
          sort_order: number
          title: string
          topic_group: number | null
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string
          deleted_at?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          is_active?: boolean
          min_live_duration_minutes?: number
          scorm_package_id?: string | null
          sort_order?: number
          title: string
          topic_group?: number | null
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["lesson_delivery_method"]
            | null
          duration_minutes?: number
          exam_id?: string | null
          id?: string
          is_active?: boolean
          min_live_duration_minutes?: number
          scorm_package_id?: string | null
          sort_order?: number
          title?: string
          topic_group?: number | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      recurrence_rules: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          enrollment_id: string | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id: string
          next_due_at: string
          notified_at: string | null
          recurrence_months: number
          status: string | null
          training_type: Database["public"]["Enums"]["training_type_enum"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          next_due_at: string
          notified_at?: string | null
          recurrence_months: number
          status?: string | null
          training_type?: Database["public"]["Enums"]["training_type_enum"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          enrollment_id?: string | null
          hazard_class?: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          next_due_at?: string
          notified_at?: string | null
          recurrence_months?: number
          status?: string | null
          training_type?: Database["public"]["Enums"]["training_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
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
          manifest_data: Json | null
          package_url: string
          scorm_version: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          entry_point?: string | null
          id?: string
          manifest_data?: Json | null
          package_url: string
          scorm_version?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          entry_point?: string | null
          id?: string
          manifest_data?: Json | null
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
      scorm_runtime_data: {
        Row: {
          cmi_key: string
          cmi_value: string | null
          enrollment_id: string
          id: string
          lesson_id: string | null
          sco_id: string | null
          updated_at: string | null
        }
        Insert: {
          cmi_key: string
          cmi_value?: string | null
          enrollment_id: string
          id?: string
          lesson_id?: string | null
          sco_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cmi_key?: string
          cmi_value?: string | null
          enrollment_id?: string
          id?: string
          lesson_id?: string | null
          sco_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_runtime_data_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_runtime_data_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorm_runtime_data_sco_id_fkey"
            columns: ["sco_id"]
            isOneToOne: false
            referencedRelation: "scorm_scos"
            referencedColumns: ["id"]
          },
        ]
      }
      scorm_scos: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          launch_path: string
          order_index: number
          package_id: string
          parameters: string | null
          scorm_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          launch_path: string
          order_index?: number
          package_id: string
          parameters?: string | null
          scorm_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          launch_path?: string
          order_index?: number
          package_id?: string
          parameters?: string | null
          scorm_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorm_scos_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          code: string | null
          created_at: string | null
          default_hazard_class:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          default_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          default_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      sub_sectors: {
        Row: {
          created_at: string | null
          hazard_class_override:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id: string
          name: string
          sector_id: string
        }
        Insert: {
          created_at?: string | null
          hazard_class_override?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          name: string
          sector_id: string
        }
        Update: {
          created_at?: string | null
          hazard_class_override?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          id?: string
          name?: string
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      topic4_sector_packs: {
        Row: {
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id: string
          is_active: boolean | null
          key_hazards: Json | null
          name: string
          scorm_package_id: string | null
          sector_id: string | null
          updated_at: string | null
        }
        Insert: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          is_active?: boolean | null
          key_hazards?: Json | null
          name: string
          scorm_package_id?: string | null
          sector_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          hazard_class?: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          is_active?: boolean | null
          key_hazards?: Json | null
          name?: string
          scorm_package_id?: string | null
          sector_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic4_sector_packs_scorm_package_id_fkey"
            columns: ["scorm_package_id"]
            isOneToOne: false
            referencedRelation: "scorm_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic4_sector_packs_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      training_types: {
        Row: {
          code: Database["public"]["Enums"]["training_type_enum"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_duration_hours: number | null
          name: string
          requires_exam: boolean | null
          requires_face_to_face: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: Database["public"]["Enums"]["training_type_enum"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_duration_hours?: number | null
          name: string
          requires_exam?: boolean | null
          requires_face_to_face?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: Database["public"]["Enums"]["training_type_enum"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_duration_hours?: number | null
          name?: string
          requires_exam?: boolean | null
          requires_face_to_face?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
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
      workplace_change_records: {
        Row: {
          assigned_courses: Json | null
          change_date: string
          created_at: string | null
          created_by: string | null
          id: string
          new_firm_id: string | null
          new_hazard_class:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          new_sector_id: string | null
          notes: string | null
          previous_firm_id: string | null
          previous_hazard_class:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          previous_sector_id: string | null
          requires_ise_baslama: boolean | null
          requires_topic4_update: boolean | null
          user_id: string
        }
        Insert: {
          assigned_courses?: Json | null
          change_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_firm_id?: string | null
          new_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          new_sector_id?: string | null
          notes?: string | null
          previous_firm_id?: string | null
          previous_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          previous_sector_id?: string | null
          requires_ise_baslama?: boolean | null
          requires_topic4_update?: boolean | null
          user_id: string
        }
        Update: {
          assigned_courses?: Json | null
          change_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_firm_id?: string | null
          new_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          new_sector_id?: string | null
          notes?: string | null
          previous_firm_id?: string | null
          previous_hazard_class?:
            | Database["public"]["Enums"]["hazard_class_enum"]
            | null
          previous_sector_id?: string | null
          requires_ise_baslama?: boolean | null
          requires_topic4_update?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplace_change_records_new_firm_id_fkey"
            columns: ["new_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_change_records_new_sector_id_fkey"
            columns: ["new_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_change_records_previous_firm_id_fkey"
            columns: ["previous_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_change_records_previous_sector_id_fkey"
            columns: ["previous_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      workplace_types: {
        Row: {
          created_at: string | null
          hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
          id: string
          name: string
          sector_id: string | null
        }
        Insert: {
          created_at?: string | null
          hazard_class?: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          name: string
          sector_id?: string | null
        }
        Update: {
          created_at?: string | null
          hazard_class?: Database["public"]["Enums"]["hazard_class_enum"]
          id?: string
          name?: string
          sector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workplace_types_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      xapi_statements: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          object_id: string
          object_type: string
          result: Json | null
          user_id: string
          verb: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          object_id: string
          object_type: string
          result?: Json | null
          user_id: string
          verb: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          object_id?: string
          object_type?: string
          result?: Json | null
          user_id?: string
          verb?: string
        }
        Relationships: []
      }
    }
    Views: {
      f2f_sessions_student_view: {
        Row: {
          capacity: number | null
          course_id: string | null
          created_at: string | null
          end_time: string | null
          firm_id: string | null
          id: string | null
          lesson_id: string | null
          location: string | null
          notes: string | null
          session_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          end_time?: string | null
          firm_id?: string | null
          id?: string | null
          lesson_id?: string | null
          location?: string | null
          notes?: string | null
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          end_time?: string | null
          firm_id?: string | null
          id?: string | null
          lesson_id?: string | null
          location?: string | null
          notes?: string | null
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["f2f_session_status"] | null
          trainer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "face_to_face_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_sessions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_to_face_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
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
      approve_join_request: {
        Args: { _note?: string; _request_id: string }
        Returns: string
      }
      check_topic4_f2f_completion: {
        Args: {
          _course_id: string
          _enrollment_id: string
          _hazard_class: Database["public"]["Enums"]["hazard_class_enum"]
        }
        Returns: boolean
      }
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
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
        }
        Returns: undefined
      }
      mask_tc_identity: { Args: { tc: string }; Returns: string }
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
      reject_join_request: {
        Args: { _note?: string; _request_id: string }
        Returns: undefined
      }
      save_scorm_runtime_data: {
        Args: {
          _cmi_data?: Json
          _enrollment_id: string
          _lesson_id: string
          _sco_id?: string
        }
        Returns: undefined
      }
      soft_delete_record: {
        Args: { _record_id: string; _table_name: string }
        Returns: undefined
      }
      trainer_update_attendance: {
        Args: {
          _attendance_id: string
          _check_in_time?: string
          _check_out_time?: string
          _duration_minutes?: number
          _end_of_session_ack?: boolean
          _notes?: string
          _status?: Database["public"]["Enums"]["attendance_status_enum"]
          _trainer_verified?: boolean
          _verification_method?: string
        }
        Returns: undefined
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
        | "trainer"
      attendance_status_enum:
        | "pending"
        | "attended"
        | "absent"
        | "late"
        | "partially_attended"
        | "trainer_verified"
        | "admin_verified"
      danger_class: "low" | "medium" | "high"
      document_type_enum:
        | "temel_egitim_belgesi"
        | "tekrar_egitim_belgesi"
        | "ise_baslama_kaydi"
        | "bilgi_yenileme_kaydi"
        | "yuz_yuze_katilim_tutanagi"
        | "faaliyet_raporu"
        | "sinav_sonuc_belgesi"
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
      f2f_session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      hazard_class_enum: "az_tehlikeli" | "tehlikeli" | "cok_tehlikeli"
      join_request_status: "pending" | "approved" | "rejected" | "cancelled"
      lesson_delivery_method: "scorm" | "bbb_live" | "face_to_face" | "hybrid"
      lesson_type: "scorm" | "exam" | "live" | "content" | "face_to_face"
      question_type: "multiple_choice" | "true_false"
      training_type_enum:
        | "ise_baslama"
        | "temel"
        | "tekrar"
        | "bilgi_yenileme"
        | "ilave"
        | "ozel_grup"
        | "destek_elemani"
        | "calisan_temsilcisi"
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
        "trainer",
      ],
      attendance_status_enum: [
        "pending",
        "attended",
        "absent",
        "late",
        "partially_attended",
        "trainer_verified",
        "admin_verified",
      ],
      danger_class: ["low", "medium", "high"],
      document_type_enum: [
        "temel_egitim_belgesi",
        "tekrar_egitim_belgesi",
        "ise_baslama_kaydi",
        "bilgi_yenileme_kaydi",
        "yuz_yuze_katilim_tutanagi",
        "faaliyet_raporu",
        "sinav_sonuc_belgesi",
      ],
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
      f2f_session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      hazard_class_enum: ["az_tehlikeli", "tehlikeli", "cok_tehlikeli"],
      join_request_status: ["pending", "approved", "rejected", "cancelled"],
      lesson_delivery_method: ["scorm", "bbb_live", "face_to_face", "hybrid"],
      lesson_type: ["scorm", "exam", "live", "content", "face_to_face"],
      question_type: ["multiple_choice", "true_false"],
      training_type_enum: [
        "ise_baslama",
        "temel",
        "tekrar",
        "bilgi_yenileme",
        "ilave",
        "ozel_grup",
        "destek_elemani",
        "calisan_temsilcisi",
      ],
    },
  },
} as const
