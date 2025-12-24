// app/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AlarmItem,
  BloodPressureLogItem,
  BloodSugarLogItem,
  HealthLogItem,
  MedicationLogItem,
  TemperatureLogItem,
  VisitLogItem,
  WeightLogItem,
} from '../components/ListItemParts';
import { useAlarms } from '../context/AlarmContext';
import { useHealthLogs } from '../context/HealthLogContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { useMedicationLogs } from '../context/MedicationLogContext';
import {
  Alarm,
  BloodPressureLog,
  BloodSugarLog,
  HealthLog,
  MedicationLog,
  TemperatureLog,
  TimeFormat,
  VisitLog,
  WeightLog,
} from '../types/types';
import { getDateKey, isSameDay, WEEKS } from '../utils/shared';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// --- 日付ごとのページコンポーネント (変更なし) ---
type RecordWithSort = (
  | Alarm | HealthLog | MedicationLog | BloodPressureLog | WeightLog | BloodSugarLog | TemperatureLog | VisitLog
) & {
  type: 'alarm' | 'log' | 'medication' | 'blood_pressure' | 'weight' | 'blood_sugar' | 'temperature' | 'visit';
  sortTime: number;
};

const getDaysDifference = (date1: Date, date2: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / oneDay);
};

const DatePage = React.memo(
  ({
    dayData, timeFormat, deleteAlarm, deleteLog, deleteMedicationLog, deleteBloodPressureLog, deleteWeightLog, deleteBloodSugarLog, deleteTemperatureLog, deleteVisitLog,
  }: {
    dayData: { date: Date; records: RecordWithSort[] };
    timeFormat: TimeFormat;
    deleteAlarm: (id: string) => Promise<void>;
    deleteLog: (id: string) => Promise<void>;
    deleteMedicationLog: (id: string) => Promise<void>;
    deleteBloodPressureLog: (id: string) => Promise<void>;
    deleteWeightLog: (id: string) => Promise<void>;
    deleteBloodSugarLog: (id: string) => Promise<void>;
    deleteTemperatureLog: (id: string) => Promise<void>;
    deleteVisitLog: (id: string) => Promise<void>;
  }) => {
    const { date, records } = dayData;
    const { isPro } = usePurchase();

    // 今日の日付
    const today = new Date();
    // そのデータの日付との差分（日）
    const diffDays = getDaysDifference(today, date);
    // 「14日以上前」かつ「無料会員」ならロックする
    const isLocked = diffDays > 14 && !isPro;

    if (records.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="notebook-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>記録がありません</Text>
          <Text style={styles.emptyDateText}>{date.toLocaleDateString()}</Text>
        </View>
      );
    }

    if (isLocked) {
      return (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20, alignItems: 'center' }}>
          {/* ぼかし演出の代わりに、半透明の箱と鍵アイコンを置く */}
          <View style={{ 
            width: '100%', 
            height: 200, 
            backgroundColor: '#f0f0f0', 
            borderRadius: 16, 
            justifyContent: 'center', 
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
            borderStyle: 'dashed'
          }}>
            <MaterialCommunityIcons name="lock" size={48} color="#aaa" />
            <Text style={{ marginTop: 10, color: '#888', fontWeight: 'bold' }}>
              過去の記録は制限されています
            </Text>
            <Text style={{ marginTop: 4, color: '#aaa', fontSize: 12 }}>
              プレミアムプランで閲覧可能
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 150 }}
        renderItem={({ item }) => {
          let content = null;
          switch (item.type) {
            case 'alarm': content = <AlarmItem alarm={item as Alarm} timeFormat={timeFormat} onDelete={deleteAlarm} />; break;
            case 'log': content = <HealthLogItem log={item as HealthLog} timeFormat={timeFormat} onDelete={deleteLog} />; break;
            case 'medication': content = <MedicationLogItem log={item as MedicationLog} timeFormat={timeFormat} onDelete={deleteMedicationLog} />; break;
            case 'blood_pressure': content = <BloodPressureLogItem log={item as BloodPressureLog} timeFormat={timeFormat} onDelete={deleteBloodPressureLog} />; break;
            case 'weight': content = <WeightLogItem log={item as WeightLog} timeFormat={timeFormat} onDelete={deleteWeightLog} />; break;
            case 'blood_sugar': content = <BloodSugarLogItem log={item as BloodSugarLog} timeFormat={timeFormat} onDelete={deleteBloodSugarLog} />; break;
            case 'temperature': content = <TemperatureLogItem log={item as TemperatureLog} timeFormat={timeFormat} onDelete={deleteTemperatureLog} />; break;
            case 'visit': content = <VisitLogItem log={item as VisitLog} timeFormat={timeFormat} onDelete={deleteVisitLog} />; break;
          }
          return <View style={styles.cardContainer}>{content}</View>;
        }}
      />
    );
  },
);

export default function RecordListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { alarms, deleteAlarm, completeAlarm, timeFormat } = useAlarms();
  const { logs, deleteLog, visitLogs, deleteVisitLog } = useHealthLogs();
  const { medicationLogs, deleteMedicationLog } = useMedicationLogs();
  const { bloodPressureLogs, deleteBloodPressureLog, weightLogs, deleteWeightLog, bloodSugarLogs, deleteBloodSugarLog, temperatureLogs, deleteTemperatureLog } = useMeasurementLogs();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isOneTimeModalVisible, setIsOneTimeModalVisible] = useState(false);
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [isReservationMode, setIsReservationMode] = useState(false);

  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());

  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const { isPro, toggleProStatusDebug } = usePurchase();

  // Android戻るボタン制御
  useEffect(() => {
    const onBackPress = () => {
      if (viewMode === 'calendar') {
        setViewMode('daily');
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [viewMode]);

  useEffect(() => {
    if (params.mode === 'calendar') setViewMode('calendar');
    else if (params.mode === 'daily') setViewMode('daily');
  }, [params.mode]);

  const groupedList = useMemo(() => {
    const combined: RecordWithSort[] = [
      ...alarms.map((a) => ({ ...a, type: 'alarm' as const, sortTime: a.time.getTime() })),
      ...logs.map((l) => ({ ...l, type: 'log' as const, sortTime: l.time.getTime() })),
      ...medicationLogs.map((l) => ({ ...l, type: 'medication' as const, sortTime: l.time.getTime() })),
      ...bloodPressureLogs.map((l) => ({ ...l, type: 'blood_pressure' as const, sortTime: l.time.getTime() })),
      ...weightLogs.map((l) => ({ ...l, type: 'weight' as const, sortTime: l.time.getTime() })),
      ...bloodSugarLogs.map((l) => ({ ...l, type: 'blood_sugar' as const, sortTime: l.time.getTime() })),
      ...temperatureLogs.map((l) => ({ ...l, type: 'temperature' as const, sortTime: l.time.getTime() })),
      ...visitLogs.map((l) => ({ ...l, type: 'visit' as const, sortTime: l.time.getTime() })),
    ];

    const groups: { [key: string]: RecordWithSort[] } = {};
    combined.forEach((item) => {
      const dateKey = getDateKey(item.time);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    const todayKey = getDateKey(new Date());
    if (!groups[todayKey]) groups[todayKey] = [];

    const sortedGroups = Object.keys(groups).map((dateKey) => {
      const records = groups[dateKey].sort((a, b) => a.sortTime - b.sortTime);
      const [y, m, d] = dateKey.split('-').map(Number);
      return { date: new Date(y, m - 1, d), records: records };
    });

    return sortedGroups.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [alarms, logs, visitLogs, medicationLogs, bloodPressureLogs, weightLogs, bloodSugarLogs, temperatureLogs]);

  const todayIndex = useMemo(() => {
    const todayStr = getDateKey(new Date());
    const index = groupedList.findIndex((g) => getDateKey(g.date) === todayStr);
    return index >= 0 ? index : groupedList.length - 1;
  }, [groupedList]);

  useEffect(() => {
    if (groupedList.length > 0 && pagerRef.current && currentPage === null) {
      pagerRef.current.setPageWithoutAnimation(todayIndex);
      setCurrentPage(todayIndex);
    }
  }, [groupedList.length, todayIndex, currentPage]);

  const activeIndex = currentPage ?? todayIndex;

  // タイトル決定ロジック
  let headerTitle = '記録一覧';
  if (viewMode === 'calendar') {
    headerTitle = 'カレンダー';
  } else if (groupedList.length > 0) {
    const currentDate = groupedList[activeIndex]?.date;
    if (currentDate) {
      const today = new Date();
      if (isSameDay(currentDate, today)) headerTitle = '今日の記録';
      else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (isSameDay(currentDate, yesterday)) headerTitle = '昨日の記録';
        else headerTitle = currentDate.toLocaleDateString();
      }
    }
  }

  const showAddAlarmOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAddModalVisible(true);
  };

  const handleSelectOption = (mode: 'RECORD' | 'RESERVE' | null) => {
    setIsAddModalVisible(false);
    if (mode === 'RECORD') {
      setIsReservationMode(false);
      setIsOneTimeModalVisible(true);
    } else if (mode === 'RESERVE') {
      setIsReservationMode(true);
      setIsOneTimeModalVisible(true);
    }
  };

  const handleLogOptionSelect = (screen: any, label: string) => {
    setIsOneTimeModalVisible(false);
    if (screen === 'TRIGGER_MEASUREMENT') {
      setIsMeasurementModalVisible(true);
      return;
    }
    if (screen) {
      if (isReservationMode) router.push({ pathname: '/reservation-settings', params: { label: label } });
      else router.push(screen);
    }
  };

  const handleMeasurementOptionSelect = (screen: any, label: string) => {
    setIsMeasurementModalVisible(false);
    if (screen) {
      if (isReservationMode) router.push({ pathname: '/reservation-settings', params: { label: label } });
      else router.push(screen);
    }
  };

  const handleSwitchView = (mode: 'daily' | 'calendar') => {
    setViewMode(mode);
    setIsMenuModalVisible(false);
  };

  const changeMonth = (diff: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + diff);
    setCalendarDate(newDate);
  };

  const handleDateTap = (date: Date) => {
    const dateStr = getDateKey(date);
    const index = groupedList.findIndex((group) => getDateKey(group.date) === dateStr);
    if (index !== -1) {
      setCurrentPage(index);
      setViewMode('daily');
    }
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDayOfWeek; i++) days.push(<View key={`empty-${i}`} style={styles.calCell} />);

    for (let d = 1; d <= lastDate; d++) {
      const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = groupedList.find((g) => getDateKey(g.date) === dateKey);
      let hasHealth = false, hasMedication = false, hasVisit = false, hasMeasurement = false;

      if (dayData && dayData.records) {
        const recordTypes = new Set(dayData.records.map((r) => r.type));
        if (recordTypes.has('log')) hasHealth = true;
        if (recordTypes.has('medication')) hasMedication = true;
        if (recordTypes.has('visit')) hasVisit = true;
        if (recordTypes.has('blood_pressure') || recordTypes.has('weight') || recordTypes.has('blood_sugar') || recordTypes.has('temperature')) hasMeasurement = true;
      }

      days.push(
        <TouchableOpacity key={d} style={styles.calCell} activeOpacity={0.6} onPress={() => handleDateTap(new Date(year, month, d))}>
          <View style={[styles.calDateContainer, isToday && styles.calTodayContainer]}>
            <Text style={[styles.calDateText, isToday && styles.calTodayText]}>{d}</Text>
          </View>
          <View style={styles.calContent}>
            {hasHealth && <View style={styles.calDotRow}><View style={[styles.calDot, { backgroundColor: '#e91e63' }]} /><Text style={styles.calIconText}>体調</Text></View>}
            {hasMedication && <View style={styles.calDotRow}><View style={[styles.calDot, { backgroundColor: '#2196f3' }]} /><Text style={styles.calIconText}>服薬</Text></View>}
            {hasVisit && <View style={styles.calDotRow}><View style={[styles.calDot, { backgroundColor: '#d84315' }]} /><Text style={styles.calIconText}>通院</Text></View>}
            {hasMeasurement && <View style={styles.calDotRow}><View style={[styles.calDot, { backgroundColor: '#4caf50' }]} /><Text style={styles.calIconText}>測定</Text></View>}
          </View>
        </TouchableOpacity>,
      );
    }

    return (
      <View style={styles.calContainer}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calNavButton}><Ionicons name="chevron-back" size={24} color="#007AFF" /></TouchableOpacity>
          <Text style={styles.calHeaderTitle}>{year}年 {month + 1}月</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calNavButton}><Ionicons name="chevron-forward" size={24} color="#007AFF" /></TouchableOpacity>
        </View>
        <View style={styles.calWeekRow}>
          {WEEKS.map((w, i) => (<Text key={w} style={[styles.calWeekText, i === 0 && { color: '#FF3B30' }, i === 6 && { color: '#007AFF' }]}>{w}</Text>))}
        </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
            <View style={styles.calGrid}>{days}</View>
            {!isPro && !IS_SCREENSHOT_MODE && (
              <View style={[styles.fixedAdContainer, { paddingBottom: Math.max(insets.bottom, 0), backgroundColor: '#fff' }]}>
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <BannerAd
                    unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-2778397933697000/6848629668'}
                    size={BannerAdSize.MEDIUM_RECTANGLE}
                    requestOptions={{
                      requestNonPersonalizedAdsOnly: true,
                    }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* 左: メニューボタン */}
          <TouchableOpacity 
            onPress={() => setIsMenuModalVisible(true)}
            style={styles.headerLeftButton}
          >
            <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>

          {/* 中央: タイトル (可変) */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {headerTitle}
            </Text>
          </View>
          
          {/* 右: 設定ボタン */}
          <View style={styles.headerRightButton}>
            <Link href="/modal" asChild>
              <TouchableOpacity>
                <Ionicons name="settings-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {viewMode === 'daily' ? (
          groupedList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="note-text-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>記録の設定がありません</Text>
            </View>
          ) : (
            <PagerView
              ref={pagerRef}
              style={styles.pagerView}
              initialPage={activeIndex}
              onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
            >
              {groupedList.map((dayData) => (
                <DatePage
                  key={dayData.date.toDateString()}
                  dayData={dayData}
                  timeFormat={timeFormat}
                  deleteAlarm={completeAlarm}
                  deleteLog={deleteLog}
                  deleteVisitLog={deleteVisitLog}
                  deleteMedicationLog={deleteMedicationLog}
                  deleteBloodPressureLog={deleteBloodPressureLog}
                  deleteWeightLog={deleteWeightLog}
                  deleteBloodSugarLog={deleteBloodSugarLog}
                  deleteTemperatureLog={deleteTemperatureLog}
                />
              ))}
            </PagerView>
          )
        ) : (
          renderCalendar()
        )}
      </View>

      <TouchableOpacity
        style={[styles.addButton, { bottom: 90 + Math.max(insets.bottom, 10) }]}
        onPress={showAddAlarmOptions}
      >
        <Ionicons name="add" size={30} color="white" />
        <Text style={styles.addButtonText}>記録</Text>
      </TouchableOpacity>

      {!isPro && !IS_SCREENSHOT_MODE && (
        <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            backgroundColor: '#fff',
            paddingBottom: Math.max(insets.bottom, 0),
            borderTopWidth: 1,
            borderTopColor: '#eee'
        }}>
          <BannerAd
            unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-2778397933697000/3087039123'}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        </View>
      )}

      {/* メニューモーダル (Index用) */}
      <Modal visible={isMenuModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsMenuModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsMenuModalVisible(false)}>
          <View style={[styles.modalContent, { marginHorizontal: 20, width: 'auto' }]}>
            <Text style={styles.modalTitle}>メニュー</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleSwitchView('daily')}>
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color={viewMode === 'daily' ? '#007AFF' : '#333'} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, viewMode === 'daily' && { fontWeight: 'bold', color: '#007AFF' }]}>{viewMode === 'daily' ? '✓ ' : ''}日別リスト</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleSwitchView('calendar')}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={viewMode === 'calendar' ? '#007AFF' : '#333'} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, viewMode === 'calendar' && { fontWeight: 'bold', color: '#007AFF' }]}>{viewMode === 'calendar' ? '✓ ' : ''}カレンダー</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => { setIsMenuModalVisible(false); router.push('/graph'); }}>
               <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#333" style={{ marginRight: 10 }} />
               <Text style={styles.optionText}>体調グラフ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => setIsMenuModalVisible(false)}>
              <Text style={[styles.optionText, styles.cancelText]}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 新規作成・項目選択モーダル類 (変更なし) */}
      <Modal visible={isAddModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsAddModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAddModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>新規作成</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => { Haptics.selectionAsync(); handleSelectOption('RECORD'); }}>
              <MaterialCommunityIcons name="pencil-plus-outline" size={24} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={styles.optionText}>今回の記録</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleSelectOption('RESERVE')}>
               <MaterialCommunityIcons name="clock-plus-outline" size={24} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={styles.optionText}>記録の予約</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => handleSelectOption(null)}>
              <Text style={[styles.optionText, styles.cancelText]}>キャンセル</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isOneTimeModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsOneTimeModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsOneTimeModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isReservationMode ? '予約項目の選択' : '記録項目の選択'}</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => { Haptics.selectionAsync(); handleLogOptionSelect('/health-log', '体調の記録'); }}>
              <MaterialCommunityIcons name="emoticon-happy-outline" size={24} color="#e91e63" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>体調記録</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => { Haptics.selectionAsync(); handleLogOptionSelect('/medication-log', '服薬の記録'); }}>
              <MaterialCommunityIcons name="pill" size={24} color="#2196f3" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>服薬記録</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => { Haptics.selectionAsync(); handleLogOptionSelect('/visit-log', '通院記録'); }}>
              <MaterialCommunityIcons name="hospital-building" size={24} color="#d84315" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>通院記録</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => { Haptics.selectionAsync(); handleLogOptionSelect('TRIGGER_MEASUREMENT', ''); }}>
              <MaterialCommunityIcons name="monitor-dashboard" size={24} color="#4caf50" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>測定記録 (血圧・体重など)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => handleLogOptionSelect(null, '')}>
              <Text style={[styles.optionText, styles.cancelText]}>キャンセル</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isMeasurementModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsMeasurementModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsMeasurementModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>測定項目の選択</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleMeasurementOptionSelect('/blood-pressure-log', '血圧・脈拍')}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#4caf50" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>血圧・安静時心拍数</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleMeasurementOptionSelect('/weight-log', '体重')}>
              <MaterialCommunityIcons name="scale-bathroom" size={24} color="#4caf50" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>体重</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleMeasurementOptionSelect('/blood-sugar-log', '血糖値')}>
              <MaterialCommunityIcons name="water" size={24} color="#4caf50" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>血糖値</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleMeasurementOptionSelect('/temperature-log', '体温')}>
              <MaterialCommunityIcons name="thermometer" size={24} color="#4caf50" style={{ marginRight: 15 }} />
              <Text style={styles.optionText}>体温</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => handleMeasurementOptionSelect(null, '')}>
              <Text style={[styles.optionText, styles.cancelText]}>キャンセル</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  headerTitleContainer: {
    position: 'absolute',
    left: 50, 
    right: 50,
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1, // ボタンより前に来るように念のため
  },
  
  // 自作ヘッダー
  safeHeader: {
    backgroundColor: '#F2F4F7', 
    width: '100%',
  },
  headerContent: {
    height: 44, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRightButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // -------------------------

  pagerView: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 10 },
  emptyDateText: { marginTop: 5, fontSize: 14, color: '#aaa' },
  cardContainer: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  cardEffect: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  addButton: { position: 'absolute', right: 20, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 10 },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopRightRadius: 24, borderTopLeftRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  optionText: { fontSize: 17, color: '#007AFF' },
  cancelButton: { borderBottomWidth: 0, marginTop: 10 },
  cancelText: { color: '#FF3B30', fontWeight: '600' },
  calContainer: { flex: 1, backgroundColor: '#F2F4F7' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  calHeaderTitle: { fontSize: 17, fontWeight: '600', color: '#1c1c1e' },
  calNavButton: { padding: 8 },
  calWeekRow: { flexDirection: 'row', backgroundColor: 'transparent', marginBottom: 5 },
  calWeekText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500', color: '#8E8E93' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', marginHorizontal: 10, borderRadius: 16, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  calCell: { width: '14.28%', minHeight: 80, padding: 2, alignItems: 'center' },
  calDateContainer: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginBottom: 4 },
  calTodayContainer: { backgroundColor: '#007AFF', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 3 },
  calDateText: { fontSize: 14, color: '#333', fontWeight: '500' },
  calTodayText: { color: 'white', fontWeight: 'bold' },
  calContent: { width: '100%', paddingHorizontal: 2 },
  calDotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  calDot: { width: 6, height: 6, borderRadius: 3, marginRight: 2 },
  calIconText: { fontSize: 9, color: '#555' },
  adContainer: { minHeight: 120, backgroundColor: '#333', margin: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  adContent: { alignItems: 'center', justifyContent: 'center' },
  adText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  adSubText: { color: '#ccc', fontSize: 11, marginTop: 2 },
  adLabel: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fixedAdContainer: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' },
  fixedAdText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  fixedAdLabel: { position: 'absolute', right: 8, top: 8, color: '#aaa', fontSize: 9, borderWidth: 1, borderColor: '#666', paddingHorizontal: 4, borderRadius: 3 },
});