export interface TutorSession {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  custom_prompt?: string | null;
  deleted_at: string | null;
}

export interface TutorMessage {
  id: string;
  session_id: string;
  role: string;
  text_content: string;
  created_at: string | null;
}

export interface TutorMemory {
  id: string;
  category: string;
  fact: string;
  created_at: string | null;
}
