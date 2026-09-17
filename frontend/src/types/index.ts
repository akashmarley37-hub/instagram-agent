// ---- Media Types ----
export interface Media {
  id: string;
  filename: string;
  original_name: string;
  file_type: 'image' | 'video';
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  url: string;
  drive_file_id?: string;
  drive_url?: string;
  created_at: string;
}

// ---- Post Types ----
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type Tone = 'professional' | 'friendly' | 'creative' | 'minimal' | 'promotional' | 'inspirational';

export interface PublishingAttempt {
  id: string;
  attempted_at: string;
  status: 'success' | 'failed';
  response_code?: number;
  error_message?: string;
  is_demo?: boolean;
}

export interface Post {
  id: string;
  media_id?: string;
  caption?: string;
  hashtags: string[];
  call_to_action?: string;
  topic?: string;
  tone?: Tone;
  language?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  instagram_media_id?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
  media?: Media;
  publishing_attempts: PublishingAttempt[];
}

export interface PostCreate {
  media_id?: string;
  caption?: string;
  hashtags?: string[];
  call_to_action?: string;
  topic?: string;
  tone?: Tone;
  language?: string;
  status?: PostStatus;
}

export interface PostUpdate {
  media_id?: string;
  caption?: string;
  hashtags?: string[];
  call_to_action?: string;
  topic?: string;
  tone?: Tone;
  language?: string;
  status?: PostStatus;
}

// ---- AI Types ----
export interface GenerateRequest {
  topic: string;
  tone: Tone;
  language: string;
  media_context?: string;
  brand_instructions?: string;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
  call_to_action?: string;
  is_demo?: boolean;
}

export type RegenerateAdjustment = 'shorten' | 'professional' | 'casual' | 'engaging' | 'regenerate';

export interface RegenerateRequest {
  caption: string;
  hashtags: string[];
  adjustment: RegenerateAdjustment;
  topic?: string;
  tone?: string;
}

// ---- Activity Types ----
export type ActivityStatus = 'success' | 'warning' | 'error' | 'info';

export interface ActivityLog {
  id: string;
  post_id?: string;
  action: string;
  description?: string;
  status: ActivityStatus;
  metadata?: Record<string, any>;
  created_at: string;
}

// ---- Integration Types ----
export type IntegrationStatus = 'connected' | 'not_configured' | 'error';

export interface Integration {
  service: string;
  display_name: string;
  description: string;
  status: IntegrationStatus;
  is_demo?: boolean;
  configured: boolean;
  icon: string;
  setup_guide?: string;
}

// ---- API Types ----
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AppConfig {
  demo_mode?: boolean;
  app_mode: 'live' | 'demo';
  openai_configured: boolean;
  instagram_configured: boolean;
  google_configured: boolean;
  google_sheets_configured?: boolean;
  openai_model?: string;
}

// ---- Drive Types ----
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  thumbnailLink?: string;
  webViewLink?: string;
  modifiedTime: string;
}
