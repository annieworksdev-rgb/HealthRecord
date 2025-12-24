import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons'; // ★追加
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'; // ★Stack追加
import React, { useEffect, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★変更
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { commonStyles, pickerSelectStyles } from '../styles/common';
import { BS_OPTIONS, BS_RANGE, formatTime, MAX_BS, TIMING_OPTIONS } from '../utils/shared';
import { useRef } from 'react';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

export default function BloodSugarLogScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromReservation, prefillNotes, alarmId } = useLocalSearchParams<{ id: string; fromReservation?: string; prefillNotes?: string; alarmId?: string }>();
  const { bloodSugarLogs, addBloodSugarLog, updateBloodSugarLog } = useMeasurementLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [value, setValue] = useState('');
  const [timing, setTiming] = useState<'before' | 'after' | 'other'>('before');
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const headerTitle = id ? '記録を編集' : '血糖値の記録';
  const { isPro, toggleProStatusDebug } = usePurchase();

  useEffect(() => {
    if (id) {
      const targetLog = bloodSugarLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setValue(targetLog.value);
        setTiming(targetLog.timing);
        setNotes(targetLog.notes || '');
      }
    } else {
      const sortedLogs = [...bloodSugarLogs].sort((a, b) => b.time.getTime() - a.time.getTime());
      if (sortedLogs.length > 0) {
        const latest = sortedLogs[0];
        setValue(latest.value);
        setTiming(latest.timing);
      }
      if (prefillNotes) setNotes(prefillNotes);
    }
  }, [id, bloodSugarLogs, navigation, prefillNotes]);

  const handleSaveLog = async () => {
    if (!value.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '血糖値を入力してください。'); 
      return; 
    }
    const parsedValue = parseInt(value.trim());
    if (isNaN(parsedValue) || parsedValue < BS_RANGE || parsedValue > MAX_BS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', `有効な血糖値（${BS_RANGE}〜${MAX_BS} mg/dL）を入力してください。`);
      return;
    }
    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);

    try {
      if (id) await updateBloodSugarLog(id, finalDate, value.trim(), timing, notes.trim());
      else await addBloodSugarLog(finalDate, value.trim(), timing, notes.trim());
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: `血糖値: ${parsedValue} mg/dL`,
        position: 'bottom',
        visibilityTime: 2000,
      });
      router.back();
    } catch (e) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '記録の保存に失敗しました。'); 
    }
  };

  const handleSnooze = async () => {
    isActionTaken.current = true;
    const targetAlarm = alarmId ? alarms.find(a => a.id === alarmId) : null;
    try {
      if (alarmId) await snoozeAlarm(alarmId, targetAlarm?.title, targetAlarm?.detail);
      else {
        const snoozeTime = new Date(Date.now() + 30 * 60 * 1000);
        await addAlarm(snoozeTime, '血糖値の記録', 'スヌーズ', 'none');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'info', text1: 'スヌーズ設定', text2: '30分後に通知します' });
      router.back();
    } catch (e) { Alert.alert('エラー', '通知の設定に失敗しました'); }
  };

  const handleSkip = async () => {
    isActionTaken.current = true;
    if (alarmId) {
      await skipAlarm(alarmId, new Date().toISOString());
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
  
  const openPicker = () => { 
    Haptics.selectionAsync();
    setShowPickerModal(true); 
  };
  const handlePickerSelect = (selectedValue: string) => { 
    Haptics.selectionAsync();
    setValue(selectedValue); 
  };
  
  const pickerOptions = BS_OPTIONS;
  const currentValue = value || '100';
  const title = '血糖値を選択';
  const isDisabled = !value.trim();

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

            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>測定タイミング</Text>
              <View style={styles.timingGroup}>
                  {TIMING_OPTIONS.map((opt) => (
                      <TouchableOpacity key={opt.value} style={[styles.timingButton, timing === opt.value && styles.timingButtonSelected]} onPress={() => { Haptics.selectionAsync(); setTiming(opt.value); }}>
                          <Text style={[styles.timingText, timing === opt.value && styles.timingTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>血糖値 (mg/dL)</Text>
              <View style={styles.inputGroup}>
                  <TextInput style={commonStyles.textInput} value={value} onChangeText={setValue} keyboardType="numeric" placeholder="100" />
                  <TouchableOpacity style={styles.pickerButton} onPress={openPicker}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                  <Text style={styles.unitLabel}>mg/dL</Text>
              </View>
            </View>

            <View style={commonStyles.notesContainer}>
              <Text style={commonStyles.listHeader}>備考</Text>
              <TextInput style={commonStyles.notesInputSimple} value={notes} onChangeText={setNotes} placeholder="詳細..." multiline={true} textAlignVertical="top" />
            </View>

            <SaveArea onSave={handleSaveLog} onSnooze={handleSnooze} onSkip={handleSkip} isEditMode={!!id} isFromReservation={!!alarmId} disabled={isDisabled} />

            <Modal visible={showPickerModal} transparent={true} animationType="slide" onRequestClose={() => setShowPickerModal(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setShowPickerModal(false)}>
                <View style={styles.pickerModalContent}>
                  <Text style={styles.pickerModalTitle}>{title}を選択</Text>
                  <RNPickerSelect onValueChange={(selectedValue) => { if (selectedValue) handlePickerSelect(selectedValue); }} items={pickerOptions} value={currentValue} style={pickerSelectStyles} placeholder={{ label: '選択', value: null }} />
                  <Button title="完了" onPress={() => setShowPickerModal(false)} />
                </View>
              </Pressable>
            </Modal>
          </ScrollView>

          {/* 広告エリア */}
          {!isPro && !IS_SCREENSHOT_MODE && (
            <View style={{ 
              alignItems: 'center', 
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 10),
              backgroundColor: '#fff',
              width: '100%'
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerButton: { padding: 10, marginLeft: 10, backgroundColor: '#007AFF', borderRadius: 8 },
  pickerIcon: { fontSize: 18, color: 'white' },
  timingGroup: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
  timingButton: { flex: 1, paddingVertical: 10, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#eee', alignItems: 'center' },
  timingButtonSelected: { backgroundColor: '#007AFF', borderRightWidth: 0 },
  timingText: { color: '#333', fontSize: 15 },
  timingTextSelected: { color: 'white', fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: 'white', borderTopRightRadius: 16, borderTopLeftRadius: 16, width: '100%', padding: 20, paddingBottom: 60, },
  pickerModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  inputGroup: { flexDirection: 'row', alignItems: 'center' },
  unitLabel: { marginLeft: 10, fontSize: 17, color: '#555' },
});