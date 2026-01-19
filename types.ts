
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
  "看图说话（开启相机）"
];

export interface TopicResource {
  phrase: string;
  translation: string;
  category: '继续追问' | '情绪回应' | '地道俚语';
}
