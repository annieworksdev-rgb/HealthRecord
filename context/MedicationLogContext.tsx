// context/MedicationLogContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { MedicationLog } from '../types/types';

// --- ストレージキー ---
const LOGS_STORAGE_KEY = '@medication_logs_list';

// --- Contextで提供する値の型 ---
type MedicationLogContextType = {
  medicationLogs: MedicationLog[];
  addMedicationLog: (time: Date, name: string, amount: string, unit: string, notes: string) => Promise<void>;
  updateMedicationLog: (id: string, time: Date, name: string, amount: string, unit: string, notes: string) => Promise<void>;
  deleteMedicationLog: (id: string) => Promise<void>;
  restoreMedicationLogs: (logs: MedicationLog[]) => Promise<boolean>;
};

// --- Contextオブジェクトの作成 ---
const MedicationLogContext = createContext<MedicationLogContextType | undefined>(
  undefined,
);

// --- Contextを提供するコンポーネント ---
export function MedicationLogProvider({ children }: { children: ReactNode }) {
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 起動時にAsyncStorageから読み込む ---
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem(LOGS_STORAGE_KEY);
        if (storedLogs) {
          const parsedLogs: MedicationLog[] = JSON.parse(storedLogs).map(
            (log: any) => ({
              ...log,
              time: new Date(log.time),
            }),
          );
          setMedicationLogs(parsedLogs);
        }
      } catch (e) {
        console.error('Failed to load medication logs.', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  // --- logs state が変更されたらAsyncStorageに保存 ---
  useEffect(() => {
    const saveLogs = async () => {
      try {
        const jsonValue = JSON.stringify(medicationLogs);
        await AsyncStorage.setItem(LOGS_STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error('Failed to save medication logs.', e);
      }
    };
    if (!isLoading) {
      saveLogs();
    }
  }, [medicationLogs, isLoading]);

  // --- (A) 服薬記録を追加する処理 ---
  const addMedicationLog = async (
    time: Date,
    name: string,
    amount: string,
    unit: string,
    notes: string
  ) => {
    const newLog: MedicationLog = {
      id: new Date().toISOString(),
      time: time,
      name: name,
      amount: amount,
      unit: unit,
      notes: notes,
    };
    setMedicationLogs((currentLogs) => [...currentLogs, newLog]);
  };

  // --- (A-2) 服薬記録を更新する処理 ---
  const updateMedicationLog = async (
    id: string,
    time: Date,
    name: string,
    amount: string,
    unit: string,
    notes: string
  ) => {
    setMedicationLogs((currentLogs) =>
      currentLogs.map((log) =>
        log.id === id
          ? { ...log, time, name, amount, unit, notes }
          : log
      )
    );
  };

  // --- (B) 服薬記録を削除する処理 ---
  const deleteMedicationLog = async (id: string) => {
    setMedicationLogs((currentLogs) =>
      currentLogs.filter((log) => log.id !== id),
    );
  };

  const restoreMedicationLogs = async (backupLogs: MedicationLog[]) => {
    try {
      const parsedLogs = backupLogs.map(log => ({ ...log, time: new Date(log.time) }));
      const newLogs = [...medicationLogs];
      parsedLogs.forEach(item => {
        const index = newLogs.findIndex(l => l.id === item.id);
        if (index >= 0) newLogs[index] = item;
        else newLogs.push(item);
      });
      
      await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(newLogs));
      setMedicationLogs(newLogs);
      return true;
    } catch (e) { return false; }
  };

  return (
    <MedicationLogContext.Provider
      value={{
        medicationLogs,
        addMedicationLog,
        updateMedicationLog,
        deleteMedicationLog,
        restoreMedicationLogs,
      }}
    >
      {children}
    </MedicationLogContext.Provider>
  );
}

// --- カスタムフック ---
export function useMedicationLogs() {
  const context = useContext(MedicationLogContext);
  if (context === undefined) {
    throw new Error(
      'useMedicationLogs must be used within a MedicationLogProvider',
    );
  }
  return context;
}