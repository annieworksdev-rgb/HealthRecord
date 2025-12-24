import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator, // ★追加
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useHealthLogs } from '../context/HealthLogContext';
import { commonStyles } from '../styles/common';
import { WeatherData } from '../types/types';
import { API_KEY, CONDITION_ICONS, formatTime, SYMPTOMS_GROUPS } from '../utils/shared';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

export default function HealthLogScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromReservation, alarmId } = useLocalSearchParams<{ 
    id?: string; 
    fromReservation?: string;
    alarmId?: string;
  }>();
  const { logs, addLog, updateLog } = useHealthLogs();
  const { weatherSetting, addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [conditionRating, setConditionRating] = useState(3);
  const [checkedSymptoms, setCheckedSymptoms] = useState<{ [key: string]: boolean }>({});
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecastWeather3h, setForecastWeather3h] = useState<WeatherData | null>(null);
  const [forecastWeather6h, setForecastWeather6h] = useState<WeatherData | null>(null);
  const [pastWeather3h, setPastWeather3h] = useState<WeatherData | null>(null);
  const [pastWeather6h, setPastWeather6h] = useState<WeatherData | null>(null);
  
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const { isPro, toggleProStatusDebug } = usePurchase();

  const headerTitle = id ? '記録を編集' : '体調の記録';

  // ★ 広告フックを追加
  // テスト中は TestIds.INTERSTITIAL (Googleのテスト用ID) を使う
  const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-あなたの本番ID/xxxxxxxx';
  
  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  useEffect(() => {
    if (id) {
      const targetLog = logs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setConditionRating(targetLog.conditionRating || 3);
        const initialSymptoms: { [key: string]: boolean } = {};
        targetLog.symptoms.forEach((sym) => { initialSymptoms[sym] = true; });
        setCheckedSymptoms(initialSymptoms);
        setNotes(targetLog.notes || '');
        
        if (targetLog.weather) setCurrentWeather(targetLog.weather);
        if (targetLog.forecast) setForecastWeather3h(targetLog.forecast);
        if (targetLog.forecast6h) setForecastWeather6h(targetLog.forecast6h);
        if (targetLog.pastWeather) setPastWeather3h(targetLog.pastWeather);
        if (targetLog.pastWeather6h) setPastWeather6h(targetLog.pastWeather6h);
      }
    }
  }, [id, logs, navigation]);

  // ★修正: 指定された日時を使って天気を取得する関数
  const fetchWeatherForSelectedTime = async () => {
    if (weatherSetting !== 'on') return;

    // 現在選択されている日付と時刻を結合してターゲット日時を作成
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    
    setIsLoadingWeather(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('許可が必要です', '位置情報の許可が必要です。');
        setIsLoadingWeather(false);
        return;
      }
      let location = await Location.getLastKnownPositionAsync({});
      if (!location) location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!location) location = { coords: { latitude: 35.681236, longitude: 139.767125 } } as any;

      const { latitude, longitude } = location!.coords;
      
      // 基準となる時刻(targetTimestamp)を中心に、前後6時間のデータを取得
      // すべて timemachine (dt指定) で取得することで、過去の日付でも正確に取れるようにする
      
      const baseUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=ja`;

      const timestamps = {
        current: targetTimestamp,
        minus3h: targetTimestamp - 10800,
        minus6h: targetTimestamp - 21600,
        plus3h: targetTimestamp + 10800,
        plus6h: targetTimestamp + 21600,
      };

      const [resCur, resM3, resM6, resP3, resP6] = await Promise.all([
        fetch(`${baseUrl}&dt=${timestamps.current}`), 
        fetch(`${baseUrl}&dt=${timestamps.minus3h}`),
        fetch(`${baseUrl}&dt=${timestamps.minus6h}`),
        fetch(`${baseUrl}&dt=${timestamps.plus3h}`),
        fetch(`${baseUrl}&dt=${timestamps.plus6h}`),
      ]);
      
      const [jsonCur, jsonM3, jsonM6, jsonP3, jsonP6] = await Promise.all([
        resCur.json(), resM3.json(), resM6.json(), resP3.json(), resP6.json()
      ]);

      // データセット用ヘルパー関数
      const extractWeather = (json: any): WeatherData | null => {
        if (json.data && json.data.length > 0) {
          const d = json.data[0];
          return {
            temp: d.temp,
            pressure: d.pressure,
            icon: d.weather[0].icon,
            description: d.weather[0].description,
          };
        }
        return null;
      };

      setCurrentWeather(extractWeather(jsonCur));
      setPastWeather3h(extractWeather(jsonM3));
      setPastWeather6h(extractWeather(jsonM6));
      setForecastWeather3h(extractWeather(jsonP3));
      setForecastWeather6h(extractWeather(jsonP6));

    } catch (error) { 
      console.warn('Weather Fetch Error', error);
      Alert.alert("取得エラー", "天気情報の取得に失敗しました");
    } finally { 
      setIsLoadingWeather(false); 
    }
  };

  // ★修正: 新規作成時のみ、初期ロードとして一度だけ天気を取得
  useEffect(() => {
    if (!id && weatherSetting === 'on') {
      fetchWeatherForSelectedTime();
    }
    // 依存配列を [] に近い形（idが変わった時だけ）にして、勝手な再取得を防ぐ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, weatherSetting]);

  const toggleSymptom = (symptom: string) => {
    Haptics.selectionAsync();
    const newCheckedSymptoms = { ...checkedSymptoms };
    newCheckedSymptoms[symptom] = !newCheckedSymptoms[symptom];
    setCheckedSymptoms(newCheckedSymptoms);
  };

  const handleSaveLog = async () => {
    isActionTaken.current = true;
    const selectedSymptoms = Object.keys(checkedSymptoms).filter((key) => checkedSymptoms[key] === true);
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);
    try {
      if (id) {
        await updateLog(
            id, finalDate, selectedSymptoms, conditionRating, notes.trim(), 
            currentWeather, forecastWeather3h, pastWeather3h, 
            forecastWeather6h, pastWeather6h
        );
      } else {
        await addLog(
            finalDate, selectedSymptoms, conditionRating, notes.trim(), 
            currentWeather, forecastWeather3h, pastWeather3h, 
            forecastWeather6h, pastWeather6h
        );
      }
      
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: '保存しました', position: 'bottom', visibilityTime: 2000 });
      // ★ 広告表示ロジック
      // 天気ON かつ 新規作成 かつ 無料ユーザー かつ 広告読込完了なら表示
      if (weatherSetting === 'on' && !id && !isPro && !IS_SCREENSHOT_MODE && isLoaded) {
        show(); // ドーンと表示
      } else {
        router.back(); // 広告が出せなければそのまま戻る
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  const handleSnooze = async () => {
    isActionTaken.current = true;
    const targetAlarm = alarmId ? alarms.find(a => a.id === alarmId) : null;
    try {
      if (alarmId) await snoozeAlarm(alarmId, targetAlarm?.title, targetAlarm?.detail);
      else {
        const snoozeTime = new Date(Date.now() + 30 * 60 * 1000);
        await addAlarm(snoozeTime, '体調の記録', 'スヌーズ');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'スヌーズ設定', text2: '30分後に通知します' });
      router.back();
    } catch (e) { Alert.alert('エラー', '通知の設定に失敗しました'); }
  };
  
  const handleSkip = async () => {
    isActionTaken.current = true;
    if (alarmId) {
      await skipAlarm(alarmId, new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'info', text1: 'スキップしました', text2: '今回の記録を見送りました' });
      router.back();
    }
  };

  useEffect(() => {
    return () => {
      if (alarmId && !isActionTaken.current) {
        autoSnoozeAlarm(alarmId);
      }
    };
  }, [alarmId]);
  
  const WeatherRowItem = ({ label, data }: { label: string, data: WeatherData | null }) => (
    <View style={styles.weatherRow}>
      <Text style={styles.weatherLabel}>{label}</Text>
      {data ? (
        <Text style={styles.weatherValue}>
          {Math.round(data.temp)}℃ / {data.pressure} hPa
        </Text>
      ) : (
        <Text style={styles.weatherValue}>--</Text>
      )}
    </View>
  );

  // ★ 画面を開いた時に読み込み開始（無料ユーザーのみ）
  useEffect(() => {
    if (!isPro) {
      load();
    }
  }, [load, isPro]);

  // ★ 広告を閉じたら前の画面に戻る
  useEffect(() => {
    if (isClosed) {
      router.back();
    }
  }, [isClosed]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 自作ヘッダー */}
      <View style={{ backgroundColor: '#fff', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 0, paddingHorizontal: 16, height: '100%', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>{headerTitle}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={[commonStyles.screenContainer, { paddingBottom: 100 }]}
          >
            <DateSelectRow date={date} showPicker={showDatePicker} onPress={() => { Haptics.selectionAsync(); setShowDatePicker(true); }} onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} onClose={() => setShowDatePicker(false)} />
            <TimeSelectRow time={time} timeString={formatTime(time, 'h24')} showPicker={showTimePicker} onPress={() => { Haptics.selectionAsync(); setShowTimePicker(true); }} onChange={(e, t) => { setShowTimePicker(false); if(t) setTime(t); }} onClose={() => setShowTimePicker(false)} />

            {weatherSetting === 'on' && (
              <View style={styles.weatherContainer}>
                {/* ★修正: ヘッダー部分に更新ボタンを追加 */}
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingRight: 15,
                  marginBottom: 5,
                  marginTop: 5
                }}>
                  <Text style={commonStyles.listHeader}>天気・気圧 (現在地)</Text>
                  
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.selectionAsync();
                      fetchWeatherForSelectedTime();
                    }}
                    disabled={isLoadingWeather}
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: '#f0f0f0', 
                      paddingVertical: 6,
                      paddingHorizontal: 12, 
                      borderRadius: 15 
                    }}
                  >
                    {isLoadingWeather ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Ionicons name="refresh" size={16} color="#007AFF" />
                    )}
                    <Text style={{ fontSize: 12, color: '#007AFF', marginLeft: 4, fontWeight: '600' }}>
                      日時で更新
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.weatherContent}>
                  <WeatherRowItem label="6時間前" data={pastWeather6h} />
                  <WeatherRowItem label="3時間前" data={pastWeather3h} />
                  
                  <View style={[styles.weatherRow, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 12, marginVertical: 4 }]}>
                    <Text style={[styles.weatherLabel, { fontWeight: 'bold', color: '#333' }]}>現在</Text>
                    {currentWeather ? (
                      <Text style={[styles.weatherValue, { fontSize: 18 }]}>
                        {Math.round(currentWeather.temp)}℃ / {currentWeather.pressure} hPa
                      </Text>
                    ) : (
                      <Text style={styles.weatherValue}>{isLoadingWeather ? '取得中...' : '--'}</Text>
                    )}
                  </View>

                  <WeatherRowItem label="3時間後" data={forecastWeather3h} />
                  <WeatherRowItem label="6時間後" data={forecastWeather6h} />
                </View>
              </View>
            )}

            <View style={styles.conditionSection}>
              <Text style={commonStyles.listHeader}>体調</Text>
              <View style={styles.iconRow}>
                {CONDITION_ICONS.map((item) => {
                  const isSelected = conditionRating === item.value;
                  return (
                    <TouchableOpacity key={item.value} style={[styles.iconButton, isSelected && styles.iconButtonSelected]} onPress={() => { Haptics.selectionAsync(); setConditionRating(item.value); }}>
                      <MaterialCommunityIcons name={isSelected ? item.icon : `${item.icon}-outline` as any} size={40} color={isSelected ? item.color : '#ccc'} />
                      <Text style={[styles.iconLabel, isSelected && { color: item.color, fontWeight: 'bold' }]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Text style={commonStyles.listHeader}>体調の変化</Text>
            <View style={styles.symptomsScrollContainer}>
              <ScrollView nestedScrollEnabled={true}>
                {SYMPTOMS_GROUPS.map((group) => (
                  <View key={group.category} style={styles.groupContainer}>
                    <Text style={styles.groupTitle}>{group.category}</Text>
                    {group.items.map((symptom) => (
                      <TouchableOpacity 
                        key={symptom} 
                        style={styles.checkOption} 
                        onPress={() => toggleSymptom(symptom)}
                      >
                        <Text style={styles.checkText}>{symptom}</Text>
                        {checkedSymptoms[symptom] && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={commonStyles.notesContainer}>
              <Text style={commonStyles.listHeader}>備考</Text>
              <TextInput style={commonStyles.notesInput} value={notes} onChangeText={setNotes} placeholder="詳細..." multiline={true} textAlignVertical="top" />
            </View>

            <SaveArea onSave={handleSaveLog} onSnooze={handleSnooze} onSkip={handleSkip} isEditMode={!!id} isFromReservation={!!alarmId} />
          </ScrollView>

          {!isPro && !IS_SCREENSHOT_MODE && (
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <BannerAd
                unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-あなたの本番ID/xxxxxxxx'}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: true,
                }}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherContainer: { backgroundColor: '#fff' },
  weatherContent: { paddingHorizontal: 20, paddingVertical: 10 },
  weatherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  weatherLabel: { fontSize: 16, color: '#555' },
  weatherValue: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  conditionSection: { backgroundColor: 'white', paddingBottom: 10 },
  iconRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 10 },
  iconButton: { alignItems: 'center', padding: 5, borderRadius: 8 },
  iconButtonSelected: { backgroundColor: '#f9f9f9' },
  iconLabel: { fontSize: 12, color: '#ccc', marginTop: 4 },
  symptomsScrollContainer: { height: 300, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  checkOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  checkText: { fontSize: 16 },
  checkmark: { fontSize: 20, color: 'blue' },
  groupContainer: { marginBottom: 0 },
  groupTitle: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 15,
    fontWeight: 'bold',
    color: '#555',
    fontSize: 14,
  },
});