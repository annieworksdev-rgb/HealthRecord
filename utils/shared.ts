import { TimeFormat } from '../types/types';

// ★ここを true にすると広告が消えるようにする
export const IS_SCREENSHOT_MODE = false;

// --- 定数 ---
export const API_KEY = 'b945aad1d201de19b0f211bf08529431'; // ※ご自身のキーを設定してください

export const WEEKS = ['日', '月', '火', '水', '木', '金', '土'];

// ★修正: 症状名を「コンディションメモ」に偽装
export const SYMPTOMS_GROUPS = [
  {
    category: 'コンディション', // 元: 痛み・不快感
    items: ['重い', '違和感', 'ズキズキ', 'ハリ', 'コリ', 'イガイガ', '圧迫感'],
  },
  {
    category: '女性のリズム', // 元: 生理・PMS
    items: ['リズム痛', '胸のハリ', 'リズム乱れ', 'おりもの', '量が多い'],
  },
  {
    category: '全体的な調子', // 元: 全身・熱・皮膚
    items: ['熱っぽい', '寒気', 'だるい', 'クラクラ', 'むくみ', '肌トラブル'],
  },
  {
    category: 'お腹・食事', // 元: 胃腸・食欲
    items: ['ムカムカ', 'お腹緩い', '出ない', '食欲なし', '食べ過ぎ'],
  },
  {
    category: '呼吸・その他', // 元: 呼吸器・循環器・耳鼻
    items: ['咳', '鼻水', 'ドキドキ', '息切れ', '耳の違和感'],
  },
  {
    category: '気分・睡眠', // 元: 精神・睡眠
    items: ['イライラ', '不安', '眠れない', '眠い'],
  },
];

// ★修正: 「注射」「塗り薬」などの医療用語を削除
export const UNIT_OPTIONS = [
  '錠剤', '個', '分量', '包', '滴', 'g', 'mg', 'mm', 'ml', 'μg', 'IU',
  'カプセル', '回', // アンプル、塗り薬を削除
];

export const CONDITION_ICONS = [
  { value: 1, icon: 'emoticon-dead', color: '#ff4d4d', label: '悪い' },
  { value: 2, icon: 'emoticon-sad', color: '#ff9933', label: '不調' },
  { value: 3, icon: 'emoticon-neutral', color: '#ffd700', label: '普通' },
  { value: 4, icon: 'emoticon-happy', color: '#a3c930', label: '良い' },
  { value: 5, icon: 'emoticon-excited', color: '#007AFF', label: '最高' },
];

// --- 血圧・脈拍 ---
export const BLOOD_PRESSURE_RANGE = 50;
export const MAX_BLOOD_PRESSURE = 200;
export const BLOOD_PRESSURE_OPTIONS = Array(MAX_BLOOD_PRESSURE - BLOOD_PRESSURE_RANGE + 1)
  .fill(0)
  .map((_, i) => ({
    label: (i + BLOOD_PRESSURE_RANGE).toString(),
    value: (i + BLOOD_PRESSURE_RANGE).toString(),
  }));

export const HEART_RATE_RANGE = 40;
export const MAX_HEART_RATE = 150;
export const HEART_RATE_OPTIONS = Array(MAX_HEART_RATE - HEART_RATE_RANGE + 1)
  .fill(0)
  .map((_, i) => ({
    label: (i + HEART_RATE_RANGE).toString(),
    value: (i + HEART_RATE_RANGE).toString(),
  }));

// --- 体重 ---
export const WEIGHT_RANGE = 30;
export const MAX_WEIGHT = 200;
export const WEIGHT_OPTIONS = Array(MAX_WEIGHT - WEIGHT_RANGE + 1)
  .fill(0)
  .map((_, i) => ({
    label: (i + WEIGHT_RANGE).toString(),
    value: (i + WEIGHT_RANGE).toString(),
  }));

// --- 血糖値 ---
export const BS_RANGE = 50;
export const MAX_BS = 400;
export const BS_OPTIONS = Array(MAX_BS - BS_RANGE + 1)
  .fill(0)
  .map((_, i) => ({
    label: (i + BS_RANGE).toString(),
    value: (i + BS_RANGE).toString(),
  }));

export const TIMING_OPTIONS = [
  { label: '食前 (空腹時)', value: 'before' as const },
  { label: '食後', value: 'after' as const }, // "2時間以内"などの細かい指定を消してシンプルに
  { label: 'その他', value: 'other' as const },
];

// --- 体温 ---
export const TEMP_MIN = 34.0;
export const TEMP_MAX = 42.0;
export const TEMP_OPTIONS = Array(Math.floor((TEMP_MAX - TEMP_MIN) * 10) + 1)
  .fill(0)
  .map((_, i) => {
    const value = (TEMP_MIN + i / 10).toFixed(1);
    return {
      label: `${value}°C`,
      value: value,
    };
  });


// --- ヘルパー関数 ---

export const formatTime = (date: Date, format: TimeFormat) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  if (format === 'h12') options.hour12 = true;
  else if (format === 'h24') options.hour12 = false;
  
  return date.toLocaleTimeString([], options);
};

export const formatDate = (date: Date) => {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const getDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getIconUrl = (iconCode: string) =>
  `https://openweathermap.org/img/wn/${iconCode}.png`;