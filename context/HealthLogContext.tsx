import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { HealthLog, VisitLog, WeatherData } from '../types/types';

const LOGS_STORAGE_KEY = '@health_logs_list';
const VISIT_LOGS_STORAGE_KEY = '@visit_logs_list';

type HealthLogContextType = {
  logs: HealthLog[];
  visitLogs: VisitLog[];
  addLog: (
    time: Date,
    symptoms: string[],
    conditionRating: number,
    notes: string,
    weather?: WeatherData | null,
    forecast?: WeatherData | null,
    pastWeather?: WeatherData | null,
    forecast6h?: WeatherData | null,
    pastWeather6h?: WeatherData | null,
  ) => Promise<void>;
  updateLog: (
    id: string,
    time: Date,
    symptoms: string[],
    conditionRating: number,
    notes: string,
    weather?: WeatherData | null,
    forecast?: WeatherData | null,
    pastWeather?: WeatherData | null,
    forecast6h?: WeatherData | null,
    pastWeather6h?: WeatherData | null,
  ) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  addVisitLog: (
    time: Date,
    hospitalName: string,
    symptoms: string,
    hasMedication: boolean,
    notes: string,
    imageUris?: string[],
  ) => Promise<void>;
  updateVisitLog: (
    id: string,
    time: Date,
    hospitalName: string,
    symptoms: string,
    hasMedication: boolean,
    notes: string,
    imageUris?: string[],
  ) => Promise<void>;
  deleteVisitLog: (id: string) => Promise<void>;
  restoreHealthLogs: (logs: HealthLog[]) => Promise<boolean>;
};

const HealthLogContext = createContext<HealthLogContextType | undefined>(
  undefined,
);

export function HealthLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem(LOGS_STORAGE_KEY);
        if (storedLogs) {
          const parsedLogs: HealthLog[] = JSON.parse(storedLogs).map(
            (log: any) => ({
              ...log,
              time: new Date(log.time),
            }),
          );
          setLogs(parsedLogs);
        }
        const storedVisitLogs = await AsyncStorage.getItem(
          VISIT_LOGS_STORAGE_KEY,
        );
        if (storedVisitLogs) {
          const parsedVisitLogs: VisitLog[] = JSON.parse(storedVisitLogs).map(
            (log: any) => ({
              ...log,
              time: new Date(log.time),
            }),
          );
          setVisitLogs(parsedVisitLogs);
        }
      } catch (e) {
        console.error('Failed to load health logs.', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, []);

  useEffect(() => {
    const saveLogs = async () => {
      try {
        const jsonValue = JSON.stringify(logs);
        await AsyncStorage.setItem(LOGS_STORAGE_KEY, jsonValue);
        const jsonVisitValue = JSON.stringify(visitLogs);
        await AsyncStorage.setItem(VISIT_LOGS_STORAGE_KEY, jsonVisitValue);
      } catch (e) {
        console.error('Failed to save health logs.', e);
      }
    };
    if (!isLoading) {
      saveLogs();
    }
  }, [logs, visitLogs, isLoading]);

  const addLog = async (
    time: Date,
    symptoms: string[],
    conditionRating: number,
    notes: string,
    weather?: WeatherData | null,
    forecast?: WeatherData | null,
    pastWeather?: WeatherData | null,
    forecast6h?: WeatherData | null,
    pastWeather6h?: WeatherData | null,
  ) => {
    const newLog: HealthLog = {
      id: new Date().toISOString(),
      time: time,
      symptoms: symptoms,
      conditionRating: conditionRating,
      notes: notes,
      weather: weather || undefined,
      forecast: forecast || undefined,
      pastWeather: pastWeather || undefined,
      forecast6h: forecast6h || undefined,
      pastWeather6h: pastWeather6h || undefined,
    };
    setLogs((currentLogs) => [...currentLogs, newLog]);
  };

  const updateLog = async (
    id: string,
    time: Date,
    symptoms: string[],
    conditionRating: number,
    notes: string,
    weather?: WeatherData | null,
    forecast?: WeatherData | null,
    pastWeather?: WeatherData | null,
    forecast6h?: WeatherData | null,
    pastWeather6h?: WeatherData | null,
  ) => {
    setLogs((currentLogs) =>
      currentLogs.map((log) =>
        log.id === id
          ? {
              ...log,
              time,
              symptoms,
              conditionRating,
              notes,
              weather: weather || undefined,
              forecast: forecast || undefined,
              pastWeather: pastWeather || undefined,
              forecast6h: forecast6h || undefined,
              pastWeather6h: pastWeather6h || undefined,
            }
          : log,
      ),
    );
  };

  const deleteLog = async (id: string) => {
    setLogs((currentLogs) => currentLogs.filter((log) => log.id !== id));
  };

  const restoreHealthLogs = async (backupLogs: HealthLog[]) => {
    try {
      const parsedLogs = backupLogs.map(log => ({
        ...log,
        time: new Date(log.time) 
      }));

      const newLogs = [...logs];
      parsedLogs.forEach(backupLog => {
        const index = newLogs.findIndex(l => l.id === backupLog.id);
        if (index >= 0) {
          newLogs[index] = backupLog; 
        } else {
          newLogs.push(backupLog); 
        }
      });

      await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(newLogs));
      setLogs(newLogs);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };
  
  const addVisitLog = async (
    time: Date,
    hospitalName: string,
    symptoms: string,
    hasMedication: boolean,
    notes: string,
    imageUris?: string[],
  ) => {
    const newLog: VisitLog = {
      id: new Date().toISOString(),
      time: time,
      hospitalName: hospitalName,
      symptoms: symptoms,
      hasMedication: hasMedication,
      notes: notes,
      imageUris: imageUris || [],
    };
    setVisitLogs((currentLogs) => [...currentLogs, newLog]);
  };

  const updateVisitLog = async (
    id: string,
    time: Date,
    hospitalName: string,
    symptoms: string,
    hasMedication: boolean,
    notes: string,
    imageUris?: string[],
  ) => {
    setVisitLogs((currentLogs) =>
      currentLogs.map((log) =>
        log.id === id
          ? { ...log, time, hospitalName, symptoms, hasMedication, notes, imageUris: imageUris || [] }
          : log,
      ),
    );
  };

  const deleteVisitLog = async (id: string) => {
    setVisitLogs((currentLogs) => currentLogs.filter((log) => log.id !== id));
  };

  return (
    <HealthLogContext.Provider
      value={{
        logs,
        visitLogs,
        addLog,
        updateLog,
        deleteLog,
        addVisitLog,
        updateVisitLog,
        deleteVisitLog,
        restoreHealthLogs,
      }}
    >
      {children}
    </HealthLogContext.Provider>
  );
}

export function useHealthLogs() {
  const context = useContext(HealthLogContext);
  if (context === undefined) {
    throw new Error('useHealthLogs must be used within a HealthLogProvider');
  }
  return context;
}