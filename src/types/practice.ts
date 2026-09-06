export type PracticeSessionMode = 'free' | 'interview';
export type InterviewSeniority = 'junior' | 'pleno' | 'senior' | 'lead';
export type InterviewType = 'behavioral' | 'technical' | 'mixed' | 'english';

export interface InterviewConfig {
  mode: 'interview';
  jobTitle: string;
  seniority: InterviewSeniority;
  interviewType: InterviewType;
  companyName?: string;
  resumeText?: string;
  jobDescriptionText?: string;
  attachedFileNames?: string[];
  avatarId?: string;
}

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

export function parseInterviewConfig(session: TutorSession | null | undefined): InterviewConfig | null {
  if (!session?.custom_prompt) return null;
  try {
    const parsed = JSON.parse(session.custom_prompt);
    if (parsed && typeof parsed === 'object' && parsed.mode === 'interview') {
      return parsed as InterviewConfig;
    }
  } catch {
    // Plain text custom prompt -> free mode
    return null;
  }
  return null;
}

export function isInterviewSession(session: TutorSession | null | undefined): boolean {
  return parseInterviewConfig(session) !== null;
}

