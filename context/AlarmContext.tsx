import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Platform, NativeModules } from 'react-native';
import { Alarm, RepeatPattern, TimeFormat, WeatherSetting } from '../types/types';

const { AlarmModule } = NativeModules;

// 通知の基本設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ALARMS_STORAGE_KEY = '@alarms_list';
const TIME_FORMAT_STORAGE_KEY = '@time_format';
const WEATHER_SETTING_KEY = '@weather_setting';

type AlarmContextType = {
  alarms: Alarm[];
  addAlarm: (
    time: Date,
    title?: string,
    detail?: string,
    repeatPattern?: RepeatPattern,
    days?: number[],
    medicationData?: { name: string; amount: string; unit: string },
    soundKey?: string,
  ) => Promise<Date>;
  updateAlarm: (
    id: string,
    time: Date,
    title?: string,
    detail?: string,
    repeatPattern?: RepeatPattern,
    days?: number[],
    medicationData?: { name: string; amount: string; unit: string },
    soundKey?: string,
  ) => Promise<Date>;
  deleteAlarm: (id: string) => Promise<void>;
  completeAlarm: (id: string) => Promise<void>;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  weatherSetting: WeatherSetting;
  setWeatherSetting: (setting: WeatherSetting) => void;
  skipAlarm: (id: string, dateStr: string) => Promise<void>;
  restoreAlarms: (alarms: Alarm[]) => Promise<boolean>;
  snoozeAlarm: (id: string, title?: string, detail?: string) => Promise<void>;
  autoSnoozeAlarm: (id: string) => Promise<void>;
};

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('auto');
  const [weatherSetting, setWeatherSettingState] =
    useState<WeatherSetting>('off');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const responseListener = useRef<Notifications.Subscription | undefined>(
    undefined,
  );

  const getTargetScreen = (title?: string) => {
    if (!title) return null;
    if (title.includes('体調')) return '/health-log';
    if (title.includes('服薬')) return '/medication-log';
    if (title.includes('通院')) return '/visit-log';
    if (title.includes('血圧') || title.includes('脈拍'))
      return '/blood-pressure-log';
    if (title.includes('体重')) return '/weight-log';
    if (title.includes('血糖')) return '/blood-sugar-log';
    if (title.includes('体温')) return '/temperature-log';
    return null;
  };

  // 初期化・通知リスナー設定
  useEffect(() => {
    // 1. 通知を受け取った時の共通処理関数
    const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
      const notification = response.notification;
      const notificationId = notification.request.identifier;
      const data = notification.request.content.data as {
        title?: string;
        id?: string;
        detail?: string;
        medicationName?: string;
        medicationAmount?: string;
        medicationUnit?: string;
      };

      const targetId = data.id || notificationId;
      
      if (notificationId) {
        await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
      }

      const target = getTargetScreen(data.title);

      if (target) {
        setTimeout(() => {
          const commonParams = {
            fromReservation: 'true',
            alarmId: targetId,
          };

          if (target === '/medication-log') {
            router.push({
              pathname: target,
              params: {
                ...commonParams,
                prefillName: data.medicationName,
                prefillAmount: data.medicationAmount,
                prefillUnit: data.medicationUnit,
              },
            });
          } else if (target === '/visit-log') {
            router.push({
              pathname: target,
              params: {
                ...commonParams,
                prefillHospitalName: data.detail,
              },
            });
          } else {
            router.push({
              pathname: target as any,
              params: {
                ...commonParams,
                prefillNotes: data.detail,
              },
            });
          }
        }, 800);
      }
    };

    // 2. 初期化処理 & コールドスタート検知 & チャンネル作成
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', 'アラームを鳴らすには、通知の許可が必要です。');
      }
      // 古いカテゴリ設定の掃除
      await Notifications.deleteNotificationCategoryAsync('record-reminder');

      // コールドスタート検知
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        console.log('コールドスタート検知: 通知から起動しました');
        // 少し待ってから処理（ナビゲーション準備のため）
        setTimeout(() => handleNotificationResponse(lastResponse), 500);
      }
    })();

    // 3. リスナー登録
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    responseListener.current = subscription;

    return () => {
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  // データ削除処理
  useEffect(() => {
    if (!isLoading && pendingDeleteId) {
      deleteAlarm(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [isLoading, pendingDeleteId, alarms]);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedAlarms = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
        if (storedAlarms) {
          const parsedAlarms: Alarm[] = JSON.parse(storedAlarms).map(
            (alarm: any) => ({ ...alarm, time: new Date(alarm.time) }),
          );
          setAlarms(parsedAlarms);
        }
        const storedFormat = await AsyncStorage.getItem(TIME_FORMAT_STORAGE_KEY);
        if (storedFormat) setTimeFormatState(storedFormat as TimeFormat);
        const storedWeather = await AsyncStorage.getItem(WEATHER_SETTING_KEY);
        if (storedWeather)
          setWeatherSettingState(storedWeather as WeatherSetting);
      } catch (e) {
        console.error('Failed to load settings.', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // データ保存
  useEffect(() => {
    const saveAlarms = async () => {
      try {
        const jsonValue = JSON.stringify(alarms);
        await AsyncStorage.setItem(ALARMS_STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error('Failed to save alarms.', e);
      }
    };
    if (!isLoading) saveAlarms();
  }, [alarms, isLoading]);

  const setTimeFormat = async (format: TimeFormat) => {
    setTimeFormatState(format);
    await AsyncStorage.setItem(TIME_FORMAT_STORAGE_KEY, format).catch(
      console.error,
    );
  };
  const setWeatherSetting = async (setting: WeatherSetting) => {
    setWeatherSettingState(setting);
    await AsyncStorage.setItem(WEATHER_SETTING_KEY, setting).catch(
      console.error,
    );
  };

  const scheduleNotification = async (
    triggerTime: Date,
    title?: string,
    detail?: string,
    id?: string,
    medicationData?: { name: string; amount: string; unit: string },
    soundKey: string = 'default',
  ) => {
    const alarmId = id || new Date().toISOString();

    const rawTitle = title || '記録';
    const subject = rawTitle.replace(/の?記録$/, ''); 
    let displayTitle = `${subject}の記録の時間です`;

    if (medicationData?.name) {
        displayTitle += ` (${medicationData.name})`;
    } else if (detail) {
        displayTitle += ` (${detail})`;
    }

    console.log(`Nativeアラームセット: ${triggerTime.toLocaleString()} タイトル:${displayTitle}`);
    AlarmModule.setAlarm(triggerTime.getTime(), displayTitle, alarmId);
    
    return alarmId;
  };

  const addAlarm = async (
    time: Date,
    title?: string,
    detail?: string,
    repeatPattern: RepeatPattern = 'none',
    days?: number[],
    medicationData?: { name: string; amount: string; unit: string },
    soundKey: string = 'default',
  ): Promise<Date> => {
    const triggerTime = new Date(time);
    triggerTime.setSeconds(0);
    triggerTime.setMilliseconds(0);

    const newAlarmId = new Date().toISOString();
    const notificationId = await scheduleNotification(
      triggerTime,
      title,
      detail,
      newAlarmId,
      medicationData,
      soundKey,
    );

    const newAlarm: Alarm = {
      id: newAlarmId,
      time: triggerTime,
      notificationId: notificationId,
      title,
      detail,
      repeatPattern,
      days,
      medicationName: medicationData?.name,
      medicationAmount: medicationData?.amount,
      medicationUnit: medicationData?.unit,
      soundKey,
    };
    setAlarms((prev) => [...prev, newAlarm]);
    return triggerTime;
  };

  const updateAlarm = async (
    id: string,
    time: Date,
    title?: string,
    detail?: string,
    repeatPattern: RepeatPattern = 'none',
    days?: number[],
    medicationData?: { name: string; amount: string; unit: string },
    soundKey: string = 'default',
  ): Promise<Date> => {
    const triggerTime = new Date(time);
    triggerTime.setSeconds(0);
    triggerTime.setMilliseconds(0);

    const target = alarms.find((a) => a.id === id);
    if (target?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        target.notificationId,
      ).catch(() => {});
    }

    const notificationId = await scheduleNotification(
      triggerTime,
      title,
      detail,
      id,
      medicationData,
      soundKey
    );

    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              time: triggerTime,
              notificationId,
              title,
              detail,
              repeatPattern,
              days,
              medicationName: medicationData?.name,
              medicationAmount: medicationData?.amount,
              medicationUnit: medicationData?.unit,
              soundKey,
            }
          : a,
      ),
    );

    return triggerTime;
  };

  const deleteAlarm = async (id: string) => {
    setAlarms((prev) => {
      const target = prev.find((a) => a.id === id || a.notificationId === id);
      if (target) {
        // 現在鳴っている音を止める
        AlarmModule.stopAlarm();

        // Androidの予約台帳からも削除（これがないと鳴り続ける）
        AlarmModule.cancelAlarm(target.id);

        // Expo通知のキャンセル（念のため）
        if (target.notificationId) {
          Notifications.cancelScheduledNotificationAsync(
            target.notificationId,
          ).catch(() => {});
        }
        return prev.filter((a) => a.id !== target.id);
      }
      return prev;
    });
  };

  const completeAlarm = async (id: string) => {
    AlarmModule.stopAlarm();

    let targetAlarm: Alarm | undefined;
    setAlarms((prev) => {
      targetAlarm = prev.find((a) => a.id === id || a.notificationId === id);
      return prev;
    });

    if (!targetAlarm) return;
    
    // ネイティブアラームをキャンセル
    AlarmModule.cancelAlarm(targetAlarm.id);

    if (targetAlarm.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(targetAlarm.notificationId).catch(() => {});
        await Notifications.dismissNotificationAsync(targetAlarm.notificationId).catch(() => {});
    }

    if (
      targetAlarm.repeatPattern === 'none' ||
      (!targetAlarm.repeatPattern &&
        (!targetAlarm.days || targetAlarm.days.length === 0))
    ) {
      await deleteAlarm(targetAlarm.id);
      return;
    }

    const nextTime = new Date(targetAlarm.time);

    if (targetAlarm.repeatPattern === 'daily') {
      nextTime.setDate(nextTime.getDate() + 1);
    } else if (targetAlarm.repeatPattern === 'biweekly') {
      nextTime.setDate(nextTime.getDate() + 14);
    } else if (targetAlarm.repeatPattern === 'triweekly') {
      nextTime.setDate(nextTime.getDate() + 21);
    } else if (targetAlarm.repeatPattern === 'fourweekly') {
      nextTime.setDate(nextTime.getDate() + 28);
    } else if (
      targetAlarm.repeatPattern === 'weekly' ||
      (!targetAlarm.repeatPattern && targetAlarm.days)
    ) {
      const days = targetAlarm.days || [];
      if (days.length === 0) {
        await deleteAlarm(targetAlarm.id);
        return;
      }
      let daysToAdd = 1;
      while (true) {
        const checkDate = new Date(nextTime);
        checkDate.setDate(checkDate.getDate() + daysToAdd);
        const dayOfWeek = checkDate.getDay();
        if (days.includes(dayOfWeek)) {
          nextTime.setDate(nextTime.getDate() + daysToAdd);
          break;
        }
        daysToAdd++;
        if (daysToAdd > 14) break;
      }
    }

    const medData = targetAlarm.medicationName
      ? {
          name: targetAlarm.medicationName,
          amount: targetAlarm.medicationAmount || '',
          unit: targetAlarm.medicationUnit || '錠剤',
        }
      : undefined;

    const newNotificationId = await scheduleNotification(
      nextTime,
      targetAlarm.title,
      targetAlarm.detail,
      targetAlarm.id,
      medData,
      targetAlarm.soundKey,
    );

    setAlarms((prev) =>
      prev.map((a) =>
        a.id === targetAlarm!.id
          ? {
              ...a,
              time: nextTime,
              notificationId: newNotificationId,
            }
          : a,
      ),
    );
  };

  const skipAlarm = async (id: string, dateStr: string) => {
    await completeAlarm(id);
  };

  const snoozeAlarm = async (
    originalId: string,
    title?: string,
    detail?: string,
  ) => {
    const target = alarms.find((a) => a.id === originalId);
    await completeAlarm(originalId);

    const now = new Date();
    const snoozeTime = new Date(now.getTime() + 30 * 60 * 1000);

    const medData = target?.medicationName
      ? {
          name: target.medicationName,
          amount: target.medicationAmount || '',
          unit: target.medicationUnit || '錠剤',
        }
      : undefined;

    await addAlarm(snoozeTime, title, detail, 'none', undefined, medData, target?.soundKey);
  };

  const autoSnoozeAlarm = async (id: string) => {
    const target = alarms.find((a) => a.id === id);
    if (!target) return;

    const now = new Date();
    const diffMinutes = (target.time.getTime() - now.getTime()) / (60 * 1000);

    if (diffMinutes > 10) { 
        console.log(`Skipped auto snooze for future alarm ${id}. Remaining: ${diffMinutes.toFixed(0)} min`);
        return; 
    }

    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);

    const medData = target.medicationName
      ? {
          name: target.medicationName,
          amount: target.medicationAmount || '',
          unit: target.medicationUnit || '錠剤',
        }
      : undefined;

    const isRecurring = target.repeatPattern !== 'none' || (target.days && target.days.length > 0);

    if (isRecurring) {
      // パターンA: 繰り返し予約なら、元の予約は「完了（＝次回へ移動）」させて、新しく一時的なスヌーズを作る
      await completeAlarm(id);

      // 5分後の一回限りアラームを追加
      await addAlarm(
        snoozeTime,
        target.title,
        target.detail,
        'none', // 繰り返しなし
        undefined,
        medData,
        target.soundKey
      );
    } else {
      // パターンB: 一回限りの予約（または既にスヌーズ中の予約）なら、時間を更新するだけでOK
      await updateAlarm(
        id,
        snoozeTime, // 5分後に更新
        target.title,
        target.detail,
        'none',
        undefined, // days情報は消す（念のため）
        medData,
        target.soundKey 
      );
    }
  };

  const restoreAlarms = async (backupAlarms: Alarm[]) => {
    try {
      const parsedAlarms = backupAlarms.map(alarm => ({ ...alarm, time: new Date(alarm.time) }));
      const newAlarms = [...alarms];
      parsedAlarms.forEach(item => {
        const index = newAlarms.findIndex(a => a.id === item.id);
        if (index >= 0) newAlarms[index] = item;
        else newAlarms.push(item);
      });

      await AsyncStorage.setItem('alarms', JSON.stringify(newAlarms));
      setAlarms(newAlarms);
      return true;
    } catch (e) { return false; }
  };

  return (
    <AlarmContext.Provider
      value={{
        alarms,
        addAlarm,
        updateAlarm,
        deleteAlarm,
        completeAlarm,
        timeFormat,
        setTimeFormat,
        weatherSetting,
        setWeatherSetting,
        skipAlarm,
        restoreAlarms,
        snoozeAlarm,
        autoSnoozeAlarm,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarms must be used within an AlarmProvider');
  }
  return context;
}