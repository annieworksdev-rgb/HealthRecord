import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons'; // ★追加
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'; // ★Stack追加
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★追加
import Toast from 'react-native-toast-message';
import { useAlarms } from '../context/AlarmContext';
import { RepeatPattern, TimeFormat } from '../types/types';
import { usePurchase } from '../context/PurchaseContext';
import { commonStyles } from '../styles/common';
import { IS_SCREENSHOT_MODE } from '../utils/shared';

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const SOUND_OPTIONS: Record<string, string> = {
  default: 'システム標準',
  bell: 'ベル',
  correct_answer: '正解音',
  decision: '決定音',
  shrine: '神社',
  wind_chime: '風鈴',
};

const REPEAT_LABELS: Record<RepeatPattern, string> = {
  none: 'しない',
  daily: '毎日',
  weekly: '曜日指定',
  biweekly: '2週間おき',
  triweekly: '3週間おき',
  fourweekly: '4週間おき',
};

const UNIT_OPTIONS = [
  '錠剤', '個', '分量', '包', '滴', 'g', 'mg', 'mm', 'ml', 'μg', 'IU', 'カプセル', '吸入', '回の塗布', '注射', '塗り薬',
];

const formatTime = (date: Date, format: TimeFormat) => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (format === 'h12') options.hour12 = true;
  else if (format === 'h24') options.hour12 = false;
  return date.toLocaleTimeString([], options);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function ReservationSettingsScreen() {
  const insets = useSafeAreaInsets(); // ★追加
  const { label, id } = useLocalSearchParams<{ label: string; id: string }>();
  const { alarms, addAlarm, updateAlarm, deleteAlarm, timeFormat } = useAlarms();
  const navigation = useNavigation();

  const [targetDate, setTargetDate] = useState(new Date());
  const [detail, setDetail] = useState('');
  const [currentLabel, setCurrentLabel] = useState(label || '');

  const [repeatPattern, setRepeatPattern] = useState<RepeatPattern>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const [selectedSound, setSelectedSound] = useState('default');
  const [showSoundModal, setShowSoundModal] = useState(false);

  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  const [medName, setMedName] = useState('');
  const [medAmount, setMedAmount] = useState('');
  const [medUnit, setMedUnit] = useState('錠剤');
  const { isPro } = usePurchase();

  const headerTitle = id ? '予約を編集' : '予約の設定';

  useEffect(() => {
    if (id) {
      const targetAlarm = alarms.find((a) => a.id === id);
      if (targetAlarm) {
        setTargetDate(targetAlarm.time);
        setDetail(targetAlarm.detail || '');
        setCurrentLabel(targetAlarm.title || '');

        if (targetAlarm.repeatPattern) {
          setRepeatPattern(targetAlarm.repeatPattern);
        } else if (targetAlarm.days && targetAlarm.days.length > 0) {
          setRepeatPattern('weekly');
        } else {
          setRepeatPattern('none');
        }

        if (targetAlarm.days) {
          setSelectedDays(targetAlarm.days);
        }

        setMedName(targetAlarm.medicationName || '');
        setMedAmount(targetAlarm.medicationAmount || '');
        setMedUnit(targetAlarm.medicationUnit || '錠剤');
        setSelectedSound(targetAlarm.soundKey || 'default');

        // navigation.setOptions({ title: '予約を編集' }); // ★削除
      }
    }
  }, [id, alarms, navigation]);

  const needsDetail = currentLabel.includes('服薬') || currentLabel.includes('通院');
  const isMedication = currentLabel.includes('服薬');
  const placeholderText = isMedication ? '薬の名前 (例: 頭痛薬)' : '病院名 (例: 〇〇クリニック)';
  
  const showDateRow = repeatPattern !== 'daily' && repeatPattern !== 'weekly';

  const onDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (selectedDate) {
      const newDate = new Date(targetDate);
      if (pickerMode === 'date') {
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else if (pickerMode === 'time') {
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      } else {
        setTargetDate(selectedDate);
        return;
      }
      setTargetDate(newDate);
    }
  };

  const toggleDay = (index: number) => {
    Haptics.selectionAsync();
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter((d) => d !== index));
    } else {
      setSelectedDays([...selectedDays, index].sort());
    }
  };

  const handleUnitSelect = (selectedUnit: string) => {
    Haptics.selectionAsync();
    setMedUnit(selectedUnit);
    setShowUnitModal(false);
  };

  const handleSetReservation = async () => {
    const now = new Date();

    if (repeatPattern === 'none' && targetDate <= now) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '現在より後の日時を指定してください。');
      return;
    }

    if (repeatPattern === 'weekly' && selectedDays.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '繰り返す曜日を選択してください。');
      return;
    }

    try {
      const daysToSave = repeatPattern === 'weekly' ? selectedDays : undefined;
      const medData = isMedication ? { name: medName, amount: medAmount, unit: medUnit } : undefined;
      const finalDetail = isMedication ? '' : detail.trim();

      let finalTargetDate = new Date(targetDate);

      if (repeatPattern === 'daily') {
        if (finalTargetDate < now) {
          finalTargetDate.setDate(finalTargetDate.getDate() + 1);
        }
      }

      if (id) {
        await updateAlarm(id, finalTargetDate, currentLabel, finalDetail, repeatPattern, daysToSave, medData, selectedSound);
      } else {
        await addAlarm(finalTargetDate, currentLabel, finalDetail, repeatPattern, daysToSave, medData, selectedSound);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      let messageDateStr = '';
      if (repeatPattern === 'daily' && finalTargetDate.getDate() !== targetDate.getDate()) {
        messageDateStr = '明日から';
      }

      Toast.show({
        type: 'success',
        text1: id ? '予約を更新しました' : '予約を保存しました',
        text2: `${messageDateStr}${currentLabel} ${formatTime(finalTargetDate, timeFormat)}`,
        position: 'bottom',
        visibilityTime: 2000,
      });

      if (router.canDismiss()) {
        router.dismissAll();
      } else {
        router.replace('/');
      }
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '予約に失敗しました。');
    }
  };

  const handleDeleteReservation = () => {
    Alert.alert(
      '予約の削除',
      'この予約設定を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteAlarm(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Toast.show({
                type: 'success',
                text1: '予約を削除しました',
                position: 'bottom',
                visibilityTime: 2000,
              });
              
              if (router.canDismiss()) router.dismissAll();
              else router.replace('/');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 1. ヘッダー (固定) */}
      <View style={{ backgroundColor: '#fff', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 0, paddingHorizontal: 16, height: '100%', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>{headerTitle}</Text>
        </View>
      </View>

      {/* 2. スクロール領域 (入力フォームとボタン) */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>予約内容: {currentLabel || '（未指定）'}</Text>
        </View>

        {showDateRow && (
          <TouchableOpacity style={styles.row} onPress={() => { Haptics.selectionAsync(); setPickerMode('date'); }}>
            <Text style={styles.label}>日付 {repeatPattern !== 'none' ? '(開始日)' : ''}</Text>
            <Text style={styles.valueText}>{formatDate(targetDate)}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.row} onPress={() => { Haptics.selectionAsync(); setPickerMode('time'); }}>
          <Text style={styles.label}>時刻</Text>
          <Text style={styles.valueText}>{formatTime(targetDate, timeFormat)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => { Haptics.selectionAsync(); setShowRepeatModal(true); }}>
          <Text style={styles.label}>繰り返し</Text>
          <Text style={styles.valueText}>{REPEAT_LABELS[repeatPattern]}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => { Haptics.selectionAsync(); setShowSoundModal(true); }}>
          <Text style={styles.label}>通知音</Text>
          <Text style={styles.valueText}>{SOUND_OPTIONS[selectedSound]}</Text>
        </TouchableOpacity>

        {repeatPattern === 'weekly' && (
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day, index) => {
              const isSelected = selectedDays.includes(index);
              const isBlue = index === 6;
              const isRed = index === 0;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    isSelected && isBlue && { backgroundColor: '#007AFF' },
                    isSelected && isRed && { backgroundColor: '#FF3B30' },
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected, !isSelected && isBlue && { color: '#007AFF' }, !isSelected && isRed && { color: '#FF3B30' }]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isMedication ? (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.label}>薬の名前</Text>
              <TextInput style={styles.textInput} value={medName} onChangeText={setMedName} placeholder="例: 頭痛薬" />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>個数/分量</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput style={[styles.textInput, { flex: 1 }]} value={medAmount} onChangeText={setMedAmount} keyboardType="numeric" placeholder="1" />
                <TouchableOpacity style={styles.unitButton} onPress={() => { Haptics.selectionAsync(); setShowUnitModal(true); }}>
                  <Text style={styles.unitText}>{medUnit}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : needsDetail ? (
          <View style={styles.inputRow}>
            <Text style={styles.label}>詳細 ({currentLabel.includes('服薬') ? '薬名' : '病院名'})</Text>
            <TextInput style={styles.textInput} value={detail} onChangeText={setDetail} placeholder={placeholderText} />
          </View>
        ) : null}

        {pickerMode !== null && (
          <DateTimePicker value={targetDate} mode={pickerMode} is24Hour={true} display="spinner" onChange={onDateTimeChange} style={styles.picker} />
        )}

        {Platform.OS === 'ios' && pickerMode !== null && (
          <View style={styles.pickerCloseButtonContainer}>
            <TouchableOpacity onPress={() => setPickerMode(null)} style={styles.pickerCloseButton}>
              <Text style={styles.pickerCloseButtonText}>完了</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSetReservation}>
            <Text style={styles.saveButtonText}>{id ? '変更内容を保存する' : '予約を保存する'}</Text>
          </TouchableOpacity>

          {id && (
            <TouchableOpacity style={[styles.saveButton, styles.deleteButton]} onPress={handleDeleteReservation}>
              <Text style={styles.saveButtonText}>この予約設定を削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 3. 広告エリア (ScrollViewの外に出して最下部に固定) */}
      {!isPro && !IS_SCREENSHOT_MODE && (
        <View style={[commonStyles.adContainer, { marginBottom: Math.max(insets.bottom, 10), marginHorizontal: 16 }]}>
          <Text style={commonStyles.adPlaceholderText}>広告スペース</Text>
        </View>
      )}

      <Modal visible={showRepeatModal} transparent={true} animationType="fade" onRequestClose={() => setShowRepeatModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRepeatModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>繰り返しの設定</Text>
            {(Object.keys(REPEAT_LABELS) as RepeatPattern[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.modalOption}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRepeatPattern(key);
                  setShowRepeatModal(false);
                  if (key === 'weekly' && selectedDays.length === 0) {
                    setSelectedDays([targetDate.getDay()]);
                  }
                }}
              >
                <Text style={styles.modalOptionText}>{REPEAT_LABELS[key]}</Text>
                <View style={styles.radioOuter}>{repeatPattern === key && <View style={styles.radioInner} />}</View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowRepeatModal(false)}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showSoundModal} transparent={true} animationType="fade" onRequestClose={() => setShowSoundModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSoundModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>通知音を選択</Text>
            {(Object.keys(SOUND_OPTIONS)).map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.modalOption}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedSound(key);
                  setShowSoundModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{SOUND_OPTIONS[key]}</Text>
                <View style={styles.radioOuter}>{selectedSound === key && <View style={styles.radioInner} />}</View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowSoundModal(false)}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      <Modal visible={showUnitModal} transparent={true} animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUnitModal(false)}>
          <View style={styles.unitModalContent}>
            <Text style={styles.unitModalTitle}>単位を選択</Text>
            <ScrollView style={styles.unitList}>
              {UNIT_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[styles.unitOption, opt === medUnit && styles.selectedUnitOption]} onPress={() => handleUnitSelect(opt)}>
                  <Text style={[styles.unitOptionText, opt === medUnit && styles.selectedUnitOptionText]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowUnitModal(false)}>
              <Text style={styles.modalCancelText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { padding: 20, backgroundColor: '#f0f8ff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#007AFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  inputRow: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  textInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginTop: 10 },
  label: { fontSize: 17, color: '#000' },
  valueText: { fontSize: 17, color: '#555' },
  picker: { width: '100%', backgroundColor: '#fff' },
  pickerCloseButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 10, backgroundColor: '#f8f8f8', borderTopWidth: 1, borderColor: '#eee' },
  pickerCloseButton: { padding: 10 },
  pickerCloseButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  buttonContainer: { marginTop: 30, paddingHorizontal: 20 },
  saveButton: { backgroundColor: 'green', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#FF3B30' },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingVertical: 15, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dayButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  dayButtonSelected: { backgroundColor: '#4CD964', borderColor: 'transparent' },
  dayText: { fontSize: 16, color: '#333' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalOptionText: { fontSize: 16 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007AFF' },
  modalCancelButton: { marginTop: 15, paddingVertical: 10 },
  modalCancelText: { color: '#007AFF', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  unitButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#007AFF', marginTop: 10 },
  unitText: { fontSize: 17, marginRight: 5, color: 'white' },
  dropdownIcon: { fontSize: 10, color: 'white' },
  unitModalContent: { backgroundColor: 'white', borderTopRightRadius: 16, borderTopLeftRadius: 16, width: '100%', maxHeight: '60%', padding: 20, paddingBottom: 50 },
  unitModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  unitList: { maxHeight: 200, marginBottom: 15 },
  unitOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedUnitOption: { backgroundColor: '#f0f8ff' },
  unitOptionText: { fontSize: 16, textAlign: 'center', color: '#000' },
  selectedUnitOptionText: { fontWeight: 'bold', color: '#007AFF' },
});