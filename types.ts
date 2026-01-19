
export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  RECONNECTING = 'RECONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export enum MainMode {
  PRACTICE = 'PRACTICE',
  DICTIONARY = 'DICTIONARY',
  HISTORY = 'HISTORY'
}

export interface TranscriptionEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SessionHistory {
  id: string;
  title: string;
  date: string;
  topic: string;
  entries: TranscriptionEntry[];
}

export interface TutorConfig {
  topic: string;
  difficulty: '入门' | '进阶' | '专业';
  voice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  personality: '幽默达人' | '电影编剧' | '严厉教官';
  isTranslationMode: boolean;
  isCorrectionMode: boolean;
  showTranscription: boolean;
}

export const TUTOR_TOPICS = [
  "日常对话",
  "面试准备",
  "旅游场景",
  "餐厅点餐",
  "学术讨论",
  "商务会议",
  "视觉学习（使用相机）"
];

export interface TopicResource {
  phrase: string;
  translation: string;
  category: '破冰' | '进阶' | '万能句' | '情绪回应' | '继续追问' | '深层表达';
}

export const TOPIC_RESOURCES: Record<string, TopicResource[]> = {
  // ... (保持现有资源不变)
};
