// Tipos del esquema public. El schema `scoring` no se expone en la API
// de PostgREST a proposito, por eso no aparece aqui.
// Regenerar con: npx supabase gen types typescript --project-id wacdxpgslvbarfauivqj

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "candidate";
export type JobStatus = "draft" | "published" | "closed";
export type ApplicationStatus =
  | "applied" | "in_progress" | "completed" | "shortlisted" | "rejected" | "hired";
export type AttemptStatus = "in_progress" | "submitted" | "scored" | "expired" | "disqualified";
export type ItemType = "mcq_single" | "likert" | "sjt" | "forced_choice" | "mcq_image" | "free_response";
export type ScoringStrategy =
  | "key_sum" | "key_sum_subscale" | "likert_reverse" | "sjt_weighted" | "ipsative";
export type Severity = "info" | "warn" | "critical";
export type ProctorEvent =
  | "tab_hidden" | "window_blur" | "fullscreen_enter" | "fullscreen_exit"
  | "copy" | "paste" | "contextmenu" | "devtools" | "heartbeat_gap";

export type Profile = {
  id: string;
  full_name: string;
  doc_number: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
  granted_at: string;
  granted_by: string | null;
};

export type Test = {
  id: string;
  slug: string;
  version: number;
  name: string;
  description: string | null;
  instructions: string | null;
  source: "seed_licensed" | "original";
  scoring_strategy: ScoringStrategy;
  scoring_config: Json;
  is_timed: boolean;
  time_limit_seconds: number | null;
  item_time_limit_seconds: number | null;
  shuffle_items: boolean;
  shuffle_options: boolean;
  min_n_for_percentile: number;
  is_active: boolean;
  created_at: string;
};

export type TestSubscale = {
  id: string;
  test_id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
};

export type Assessment = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  target_role: string | null;
  is_active: boolean;
  created_at: string;
};

export type AssessmentTest = {
  assessment_id: string;
  test_id: string;
  position: number;
  weight: number;
  is_required: boolean;
};

export type JobPosting = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  assessment_id: string;
  status: JobStatus;
  show_results_to_candidate: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_by: string | null;
  created_at: string;
  is_internal: boolean;
};

export type Application = {
  id: string;
  candidate_id: string;
  job_posting_id: string;
  status: ApplicationStatus;
  applied_at: string;
  completed_at: string | null;
  admin_notes: string | null;
  is_test: boolean;
};

export type TestAttempt = {
  id: string;
  application_id: string;
  test_id: string;
  status: AttemptStatus;
  shuffle_seed: number;
  started_at: string;
  deadline_at: string | null;
  last_heartbeat_at: string;
  submitted_at: string | null;
  scored_at: string | null;
  duration_seconds: number | null;
  integrity_level: Severity;
  events_warn: number;
  events_critical: number;
  integrity_strikes: number;
  disqualified_at: string | null;
  disqualification_reason: string | null;
  gender: string | null;
};

export type AttemptScore = {
  attempt_id: string;
  raw_score: number;
  max_score: number;
  percent: number | null;
  percentile: number | null;
  band: string | null;
  norm_n: number | null;
  algorithm_version: number;
  computed_at: string;
};

export type AttemptSubscaleScore = {
  attempt_id: string;
  subscale_id: string;
  raw_score: number;
  max_score: number;
  percent: number | null;
  percentile: number | null;
  band: string | null;
};

export type AttemptResponse = {
  attempt_id: string;
  item_id: string;
  option_id: string | null;
  value_numeric: number | null;
  value_text: string | null;
  least_option_id: string | null;
  answered_at: string;
  client_elapsed_ms: number | null;
  revisions: number;
};

export type TestItem = {
  id: string;
  test_id: string;
  position: number;
  item_type: ItemType;
  stem: string;
  media_url: string | null;
  subscale_id: string | null;
  time_limit_seconds: number | null;
  config: Json;
  is_active: boolean;
};

export type TestItemOption = {
  id: string;
  item_id: string;
  code: string;
  label: string;
  media_url: string | null;
  display_order: number;
};

export type ProctoringEventRow = {
  id: number;
  attempt_id: string;
  event_type: ProctorEvent;
  severity: Severity;
  client_ts: string | null;
  server_ts: string;
  meta: Json;
};

// Forma que devuelve la RPC get_attempt_state.
export type AttemptItemOption = {
  id: string;
  code: string;
  label: string;
  media_url: string | null;
};

export type AttemptItem = {
  id: string;
  type: ItemType;
  stem: string;
  media_url: string | null;
  options: AttemptItemOption[];
};

export type AttemptState = {
  attempt_id: string;
  status: AttemptStatus;
  test: {
    name: string;
    instructions: string | null;
    is_timed: boolean;
    item_time_limit_seconds: number | null;
  };
  server_now: string;
  deadline_at: string | null;
  seconds_remaining: number | null;
  items: AttemptItem[];
  responses: Record<
    string,
    {
      option_id: string | null;
      value: number | null;
      value_text: string | null;
      least_option_id: string | null;
    }
  >;
};

export type LikertLabel = { value: number; label: string };
export type ScoringBand = { min: number; max: number; label: string };

type Row<T, I = Partial<T>, U = Partial<T>> = { Row: T; Insert: I; Update: U; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Row<Profile>;
      user_roles: Row<UserRoleRow>;
      tests: Row<Test>;
      test_subscales: Row<TestSubscale>;
      assessments: Row<Assessment>;
      assessment_tests: Row<AssessmentTest>;
      job_postings: Row<JobPosting>;
      applications: Row<Application>;
      test_attempts: Row<TestAttempt>;
      attempt_responses: Row<AttemptResponse>;
      attempt_scores: Row<AttemptScore>;
      attempt_subscale_scores: Row<AttemptSubscaleScore>;
      proctoring_events: Row<ProctoringEventRow>;
      test_items: Row<TestItem>;
      test_item_options: Row<TestItemOption>;
    };
    Views: Record<never, never>;
    Functions: {
      apply_to_job: { Args: { p_job_id: string }; Returns: string };
      start_admin_test_preview: { Args: { p_test_id: string }; Returns: string };
      discard_test_application: { Args: { p_application_id: string }; Returns: void };
      start_attempt: { Args: { p_application_id: string; p_test_id: string }; Returns: string };
      get_attempt_state: { Args: { p_attempt_id: string }; Returns: Json };
      save_response: {
        Args: {
          p_attempt_id: string;
          p_item_id: string;
          p_option_id?: string | null;
          p_value_numeric?: number | null;
          p_client_elapsed_ms?: number | null;
          p_value_text?: string | null;
          p_least_option_id?: string | null;
        };
        Returns: Json;
      };
      attempt_heartbeat: { Args: { p_attempt_id: string }; Returns: Json };
      finish_attempt: { Args: { p_attempt_id: string }; Returns: Json };
      report_proctoring_event: {
        Args: {
          p_attempt_id: string;
          p_event_type: ProctorEvent;
          p_severity?: Severity;
          p_meta?: Json;
        };
        Returns: Json;
      };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      admin_get_test_items: { Args: { p_test_id: string }; Returns: Json };
      admin_upsert_item: {
        Args: {
          p_test_id: string;
          p_item_id?: string | null;
          p_stem: string;
          p_item_type: ItemType;
          p_subscale_id?: string | null;
          p_options: Json;
          p_is_reverse?: boolean;
          p_media_url?: string | null;
          p_answer_key?: { accepted: string[]; points?: number } | null;
          p_forced_choice_key?: Record<string, { most: string[]; least: string[] }> | null;
        };
        Returns: string;
      };
      admin_set_item_active: { Args: { p_item_id: string; p_is_active: boolean }; Returns: void };
    };
    Enums: {
      app_role: AppRole;
      application_status: ApplicationStatus;
      attempt_status: AttemptStatus;
      item_type: ItemType;
      job_status: JobStatus;
      proctor_event: ProctorEvent;
      scoring_strategy: ScoringStrategy;
      severity: Severity;
      test_source: "seed_licensed" | "original";
    };
    CompositeTypes: Record<never, never>;
  };
};
