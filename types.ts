
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
  category: '破冰' | '进阶' | '万能句';
}

export const TOPIC_RESOURCES: Record<string, TopicResource[]> = {
  "日常对话": [
    { phrase: "How was your day going so far?", translation: "你今天过得怎么样？", category: "破冰" },
    { phrase: "What do you usually do in your spare time?", translation: "你空闲时间一般做什么？", category: "破冰" },
    { phrase: "That sounds interesting, tell me more!", translation: "听起来很有趣，再多跟我说说！", category: "万能句" },
    { phrase: "I couldn't agree with you more.", translation: "我再同意不过了。", category: "万能句" }
  ],
  "面试准备": [
    { phrase: "Could you please tell me more about the company culture?", translation: "能多跟我讲讲公司文化吗？", category: "破冰" },
    { phrase: "What are the main responsibilities of this role?", translation: "这个职位的核心职责是什么？", category: "进阶" },
    { phrase: "I have a solid background in project management.", translation: "我在项目管理方面有扎实的背景。", category: "进阶" },
    { phrase: "I'm looking for a platform to grow my career.", translation: "我在寻找一个能让职业发展的平台。", category: "万能句" }
  ],
  "旅游场景": [
    { phrase: "Excuse me, how can I get to the nearest station?", translation: "打扰下，请问最近的车站怎么走？", category: "破冰" },
    { phrase: "Could you recommend some local hidden gems?", translation: "能推荐一些当地人才知道的好地方吗？", category: "进阶" },
    { phrase: "Is there a direct bus to the airport?", translation: "有去机场的直达大巴吗？", category: "破冰" },
    { phrase: "Could you take a photo for me, please?", translation: "能帮我拍张照吗？", category: "万能句" }
  ],
  "餐厅点餐": [
    { phrase: "I'd like to book a table for two at seven.", translation: "我想预订今晚七点两个人的位子。", category: "破冰" },
    { phrase: "What's the chef's special today?", translation: "今天的厨师推荐菜是什么？", category: "进阶" },
    { phrase: "Could we have the bill, please?", translation: "请买单。", category: "万能句" },
    { phrase: "Is there any spicy food in this dish?", translation: "这个菜里有辣的东西吗？", category: "万能句" }
  ],
  "学术讨论": [
    { phrase: "From my perspective, the research shows that...", translation: "在我看来，研究表明...", category: "破冰" },
    { phrase: "Could you elaborate on that point?", translation: "你能详尽阐述一下那个观点吗？", category: "进阶" },
    { phrase: "There is a significant correlation between...", translation: "...之间存在显著的相关性。", category: "进阶" },
    { phrase: "I take your point, but have you considered...", translation: "我明白你的意思，但你有没有考虑过...", category: "万能句" }
  ],
  "商务会议": [
    { phrase: "Let's dive into the main agenda for today.", translation: "让我们进入今天的主要议程。", category: "破冰" },
    { phrase: "We need to reach a consensus on this issue.", translation: "我们需要在这个问题上达成共识。", category: "进阶" },
    { phrase: "Could we schedule a follow-up meeting next week?", translation: "我们能把跟进会议定在下周吗？", category: "万能句" },
    { phrase: "What's the bottom line for this project?", translation: "这个项目的底线（盈亏点）是什么？", category: "进阶" }
  ],
  "视觉学习（使用相机）": [
    { phrase: "What is the English name for this object?", translation: "这个东西的英文名字是什么？", category: "破冰" },
    { phrase: "Can you describe the texture of this item?", translation: "你能描述一下这个物体的质感吗？", category: "进阶" },
    { phrase: "How do you use this in daily life?", translation: "生活中怎么使用这个东西？", category: "进阶" },
    { phrase: "Could you give me an example sentence with this word?", translation: "能用这个词给我造个句吗？", category: "万能句" }
  ]
};
