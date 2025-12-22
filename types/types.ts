// types.ts

// ▼▼▼ 修正: インポートを削除し、ここで定義する ▼▼▼
export type TimeFormat = 'auto' | 'h12' | 'h24';
export type WeatherSetting = 'on' | 'off';
// ▲▲▲ --- ▲▲▲

export type RepeatPattern =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'triweekly'
  | 'fourweekly';

export type Alarm = {
  id: string;
  time: Date;
  notificationId: string;
  notificationIds?: string[];
  title?: string;
  detail?: string;
  medicationName?: string;
  medicationAmount?: string;
  medicationUnit?: string;
  days?: number[];
  repeatPattern?: RepeatPattern;
  skippedDates?: string[];
  soundKey?: string;
};

export type WeatherData = {
  temp: number;
  pressure: number;
  icon: string;
  description: string;
};

export type HealthLog = {
  id: string;
  time: Date;
  symptoms: string[];
  conditionRating: number;
  notes?: string;
  weather?: WeatherData;
  forecast?: WeatherData;
  forecast6h?: WeatherData;
  pastWeather?: WeatherData;
  pastWeather6h?: WeatherData;
};

export type MedicationLog = {
  id: string;
  time: Date;
  name: string;
  amount: string;
  unit: string;
  notes?: string;
};

export type BloodPressureLog = {
  id: string;
  time: Date;
  systolic: string;
  diastolic: string;
  restingHeartRate: string;
  notes?: string;
};

export type WeightLog = {
  id: string;
  time: Date;
  weight: string;
  notes?: string;
};

export type BloodSugarLog = {
  id: string;
  time: Date;
  value: string;
  timing: 'before' | 'after' | 'other';
  notes?: string;
};

export type TemperatureLog = {
  id: string;
  time: Date;
  value: string;
  notes?: string;
};

export type VisitLog = {
  id: string;
  time: Date;
  hospitalName: string;
  symptoms: string;
  hasMedication: boolean;
  notes?: string;
  imageUris?: string[];
};

export type RootStackParamList = {
  List: { title?: string };
  Settings: undefined;
  SettingsRecurring: undefined;
  HealthLog: { id?: string };
  MedicationLog: {
    id?: string;
    prefillName?: string;
    prefillAmount?: string;
    prefillUnit?: string;
    fromReservation?: string;
  };
  BloodPressureLog: { id?: string; prefillNotes?: string };
  WeightLog: { id?: string; prefillNotes?: string };
  BloodSugarLog: { id?: string; prefillNotes?: string };
  TemperatureLog: { id?: string; prefillNotes?: string };
  VisitLog: { id?: string; prefillHospitalName?: string };
  ReservationSettings: { label?: string; id?: string };
};