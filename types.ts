
export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface TranscriptionEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Added TopicResource interface to fix missing member error in suggestionService.ts
export interface TopicResource {
  phrase: string;
  translation: string;
  category: string;
}

export interface TutorConfig {
  topic: string;
  difficulty: '入门' | '进阶' | '专业';
  voice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  personality: '幽默达人' | '电影编剧' | '严厉教官';
  isTranslationMode: boolean;
  showTranscription: boolean;
}

export const TUTOR_TOPICS = [
  "日常对话",
  "面试准备",
  "旅游场景",
  "餐厅点餐",
  "学术讨论",
  "商务会议",
  "看图说话"
];
