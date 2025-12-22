import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  BloodPressureLog,
  BloodSugarLog,
  TemperatureLog,
  WeightLog,
} from '../types/types';

// 保存用のキー定義
const BP_LOGS_STORAGE_KEY = '@blood_pressure_logs_list';
const WEIGHT_LOGS_STORAGE_KEY = '@weight_logs_list';
const BS_LOGS_STORAGE_KEY = '@blood_sugar_logs_list';
const TEMP_LOGS_STORAGE_KEY = '@temperature_logs_list';

// Contextの型定義
type MeasurementLogContextType = {
  bloodPressureLogs: BloodPressureLog[];
  weightLogs: WeightLog[];
  bloodSugarLogs: BloodSugarLog[];
  temperatureLogs: TemperatureLog[];

  addBloodPressureLog: (
    time: Date,
    systolic: string,
    diastolic: string,
    restingHeartRate: string,
    notes: string,
  ) => Promise<void>;
  updateBloodPressureLog: (
    id: string,
    time: Date,
    systolic: string,
    diastolic: string,
    restingHeartRate: string,
    notes: string,
  ) => Promise<void>;

  addWeightLog: (time: Date, weight: string, notes: string) => Promise<void>;
  updateWeightLog: (
    id: string,
    time: Date,
    weight: string,
    notes: string,
  ) => Promise<void>;

  addBloodSugarLog: (
    time: Date,
    value: string,
    timing: 'before' | 'after' | 'other',
    notes: string,
  ) => Promise<void>;
  updateBloodSugarLog: (
    id: string,
    time: Date,
    value: string,
    timing: 'before' | 'after' | 'other',
    notes: string,
  ) => Promise<void>;

  addTemperatureLog: (time: Date, value: string, notes: string) => Promise<void>;
  updateTemperatureLog: (
    id: string,
    time: Date,
    value: string,
    notes: string,
  ) => Promise<void>;

  deleteBloodPressureLog: (id: string) => Promise<void>;
  deleteWeightLog: (id: string) => Promise<void>;
  deleteBloodSugarLog: (id: string) => Promise<void>;
  deleteTemperatureLog: (id: string) => Promise<void>;

  // ★★★ 追加: 4種類まとめて復元するための関数定義 ★★★
  restoreMeasurements: (data: {
    bloodPressureLogs?: BloodPressureLog[];
    weightLogs?: WeightLog[];
    bloodSugarLogs?: BloodSugarLog[];
    temperatureLogs?: TemperatureLog[];
  }) => Promise<boolean>;
};

const MeasurementLogContext = createContext<MeasurementLogContextType | undefined>(
  undefined,
);

export function MeasurementLogProvider({ children }: { children: ReactNode }) {
  const [bloodPressureLogs, setBloodPressureLogs] = useState<
    BloodPressureLog[]
  >([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [bloodSugarLogs, setBloodSugarLogs] = useState<BloodSugarLog[]>([]);
  const [temperatureLogs, setTemperatureLogs] = useState<TemperatureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初回ロード処理
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const storedBPLogs = await AsyncStorage.getItem(BP_LOGS_STORAGE_KEY);
        if (storedBPLogs) {
          setBloodPressureLogs(
            JSON.parse(storedBPLogs).map((log: any) => ({
              ...log,
              time: new Date(log.time),
            })),
          );
        }
        const storedWeightLogs = await AsyncStorage.getItem(
          WEIGHT_LOGS_STORAGE_KEY,
        );
        if (storedWeightLogs) {
          setWeightLogs(
            JSON.parse(storedWeightLogs).map((log: any) => ({
              ...log,
              time: new Date(log.time),
            })),
          );
        }
        const storedBSLogs = await AsyncStorage.getItem(BS_LOGS_STORAGE_KEY);
        if (storedBSLogs) {
          setBloodSugarLogs(
            JSON.parse(storedBSLogs).map((log: any) => ({
              ...log,
              time: new Date(log.time),
            })),
          );
        }
        const storedTempLogs = await AsyncStorage.getItem(TEMP_LOGS_STORAGE_KEY);
        if (storedTempLogs) {
          setTemperatureLogs(
            JSON.parse(storedTempLogs).map((log: any) => ({
              ...log,
              time: new Date(log.time),
            })),
          );
        }
      } catch (e) {
        console.error('Failed to load logs.', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  // データ変更時の自動保存処理
  useEffect(() => {
    const saveLogs = async () => {
      try {
        await AsyncStorage.setItem(
          BP_LOGS_STORAGE_KEY,
          JSON.stringify(bloodPressureLogs),
        );
        await AsyncStorage.setItem(
          WEIGHT_LOGS_STORAGE_KEY,
          JSON.stringify(weightLogs),
        );
        await AsyncStorage.setItem(
          BS_LOGS_STORAGE_KEY,
          JSON.stringify(bloodSugarLogs),
        );
        await AsyncStorage.setItem(
          TEMP_LOGS_STORAGE_KEY,
          JSON.stringify(temperatureLogs),
        );
      } catch (e) {
        console.error('Failed to save logs.', e);
      }
    };

    if (!isLoading) {
      saveLogs();
    }
  }, [
    bloodPressureLogs,
    weightLogs,
    bloodSugarLogs,
    temperatureLogs,
    isLoading,
  ]);

  // --- 各種ログ操作関数 ---

  const addBloodPressureLog = async (
    time: Date,
    systolic: string,
    diastolic: string,
    restingHeartRate: string,
    notes: string,
  ) => {
    const newLog: BloodPressureLog = {
      id: new Date().toISOString(),
      time,
      systolic,
      diastolic,
      restingHeartRate,
      notes,
    };
    setBloodPressureLogs((prev) => [...prev, newLog]);
  };

  const updateBloodPressureLog = async (
    id: string,
    time: Date,
    systolic: string,
    diastolic: string,
    restingHeartRate: string,
    notes: string,
  ) => {
    setBloodPressureLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? { ...log, time, systolic, diastolic, restingHeartRate, notes }
          : log,
      ),
    );
  };

  const deleteBloodPressureLog = async (id: string) => {
    setBloodPressureLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const addWeightLog = async (time: Date, weight: string, notes: string) => {
    const newLog: WeightLog = {
      id: new Date().toISOString(),
      time,
      weight,
      notes,
    };
    setWeightLogs((prev) => [...prev, newLog]);
  };

  const updateWeightLog = async (
    id: string,
    time: Date,
    weight: string,
    notes: string,
  ) => {
    setWeightLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, time, weight, notes } : log)),
    );
  };

  const deleteWeightLog = async (id: string) => {
    setWeightLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const addBloodSugarLog = async (
    time: Date,
    value: string,
    timing: 'before' | 'after' | 'other',
    notes: string,
  ) => {
    const newLog: BloodSugarLog = {
      id: new Date().toISOString(),
      time,
      value,
      timing,
      notes,
    };
    setBloodSugarLogs((prev) => [...prev, newLog]);
  };

  const updateBloodSugarLog = async (
    id: string,
    time: Date,
    value: string,
    timing: 'before' | 'after' | 'other',
    notes: string,
  ) => {
    setBloodSugarLogs((prev) =>
      prev.map((log) =>
        log.id === id ? { ...log, time, value, timing, notes } : log,
      ),
    );
  };

  const deleteBloodSugarLog = async (id: string) => {
    setBloodSugarLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const addTemperatureLog = async (
    time: Date,
    value: string,
    notes: string,
  ) => {
    const newLog: TemperatureLog = {
      id: new Date().toISOString(),
      time,
      value,
      notes,
    };
    setTemperatureLogs((prev) => [...prev, newLog]);
  };

  const updateTemperatureLog = async (
    id: string,
    time: Date,
    value: string,
    notes: string,
  ) => {
    setTemperatureLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, time, value, notes } : log)),
    );
  };

  const deleteTemperatureLog = async (id: string) => {
    setTemperatureLogs((prev) => prev.filter((log) => log.id !== id));
  };

  // ★★★ 追加: 復元用関数（ここから） ★★★
  const restoreMeasurements = async (data: {
    bloodPressureLogs?: BloodPressureLog[];
    weightLogs?: WeightLog[];
    bloodSugarLogs?: BloodSugarLog[];
    temperatureLogs?: TemperatureLog[];
  }) => {
    try {
      // 1. 血圧ログの復元
      if (data.bloodPressureLogs && Array.isArray(data.bloodPressureLogs)) {
        const parsedLogs = data.bloodPressureLogs.map((log) => ({
          ...log,
          time: new Date(log.time),
        }));
        const newLogs = [...bloodPressureLogs];
        parsedLogs.forEach((item) => {
          const index = newLogs.findIndex((l) => l.id === item.id);
          if (index >= 0) newLogs[index] = item;
          else newLogs.push(item);
        });
        await AsyncStorage.setItem(
          BP_LOGS_STORAGE_KEY,
          JSON.stringify(newLogs),
        );
        setBloodPressureLogs(newLogs);
      }

      // 2. 体重ログの復元
      if (data.weightLogs && Array.isArray(data.weightLogs)) {
        const parsedLogs = data.weightLogs.map((log) => ({
          ...log,
          time: new Date(log.time),
        }));
        const newLogs = [...weightLogs];
        parsedLogs.forEach((item) => {
          const index = newLogs.findIndex((l) => l.id === item.id);
          if (index >= 0) newLogs[index] = item;
          else newLogs.push(item);
        });
        await AsyncStorage.setItem(
          WEIGHT_LOGS_STORAGE_KEY,
          JSON.stringify(newLogs),
        );
        setWeightLogs(newLogs);
      }

      // 3. 血糖値ログの復元
      if (data.bloodSugarLogs && Array.isArray(data.bloodSugarLogs)) {
        const parsedLogs = data.bloodSugarLogs.map((log) => ({
          ...log,
          time: new Date(log.time),
        }));
        const newLogs = [...bloodSugarLogs];
        parsedLogs.forEach((item) => {
          const index = newLogs.findIndex((l) => l.id === item.id);
          if (index >= 0) newLogs[index] = item;
          else newLogs.push(item);
        });
        await AsyncStorage.setItem(
          BS_LOGS_STORAGE_KEY,
          JSON.stringify(newLogs),
        );
        setBloodSugarLogs(newLogs);
      }

      // 4. 体温ログの復元
      if (data.temperatureLogs && Array.isArray(data.temperatureLogs)) {
        const parsedLogs = data.temperatureLogs.map((log) => ({
          ...log,
          time: new Date(log.time),
        }));
        const newLogs = [...temperatureLogs];
        parsedLogs.forEach((item) => {
          const index = newLogs.findIndex((l) => l.id === item.id);
          if (index >= 0) newLogs[index] = item;
          else newLogs.push(item);
        });
        await AsyncStorage.setItem(
          TEMP_LOGS_STORAGE_KEY,
          JSON.stringify(newLogs),
        );
        setTemperatureLogs(newLogs);
      }

      return true;
    } catch (e) {
      console.error('Failed to restore measurement logs.', e);
      return false;
    }
  };
  // ★★★ 追加: 復元用関数（ここまで） ★★★

  return (
    <MeasurementLogContext.Provider
      value={{
        bloodPressureLogs,
        weightLogs,
        bloodSugarLogs,
        temperatureLogs,
        addBloodPressureLog,
        updateBloodPressureLog,
        deleteBloodPressureLog,
        addWeightLog,
        updateWeightLog,
        deleteWeightLog,
        addBloodSugarLog,
        updateBloodSugarLog,
        deleteBloodSugarLog,
        addTemperatureLog,
        updateTemperatureLog,
        deleteTemperatureLog,
        restoreMeasurements, // ★★★ 追加: 最後にこれを渡す
      }}
    >
      {children}
    </MeasurementLogContext.Provider>
  );
}

export function useMeasurementLogs() {
  const context = useContext(MeasurementLogContext);
  if (context === undefined) {
    throw new Error(
      'useMeasurementLogs must be used within a MeasurementLogProvider',
    );
  }
  return context;
}