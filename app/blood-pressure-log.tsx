import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons'; // ★追加
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'; // ★Stack追加
import React, { useEffect, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★変更
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { commonStyles, pickerSelectStyles } from '../styles/common';
import { BLOOD_PRESSURE_OPTIONS, formatTime, HEART_RATE_OPTIONS } from '../utils/shared';
import { useRef } from 'react';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

export default function BloodPressureLogScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromReservation, prefillNotes, alarmId } = useLocalSearchParams<{ id: string; fromReservation?: string; prefillNotes?: string; alarmId?: string }>();
  const { bloodPressureLogs, addBloodPressureLog, updateBloodPressureLog } = useMeasurementLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [restingHeartRate, setRestingHeartRate] = useState('');
  const [skipBloodPressure, setSkipBloodPressure] = useState(false);
  const [skipHeartRate, setSkipHeartRate] = useState(false);
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'systolic' | 'diastolic' | 'heartRate' | null>(null);

  const headerTitle = id ? '記録を編集' : '血圧の記録';
  const { isPro, toggleProStatusDebug } = usePurchase();
  
  useEffect(() => {
    if (id) {
      const targetLog = bloodPressureLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setSystolic(targetLog.systolic || '');
        setDiastolic(targetLog.diastolic || '');
        setRestingHeartRate(targetLog.restingHeartRate || '');
        setNotes(targetLog.notes || '');
        if (!targetLog.systolic && !targetLog.diastolic) setSkipBloodPressure(true);
        if (!targetLog.restingHeartRate) setSkipHeartRate(true);
      }
    } else {
      const sortedLogs = [...bloodPressureLogs].sort((a, b) => b.time.getTime() - a.time.getTime());
      if (sortedLogs.length > 0) {
        const latest = sortedLogs[0];
        if (latest.systolic) setSystolic(latest.systolic);
        if (latest.diastolic) setDiastolic(latest.diastolic);
        if (latest.restingHeartRate) setRestingHeartRate(latest.restingHeartRate);
        if (!latest.systolic && !latest.diastolic) setSkipBloodPressure(true);
        if (!latest.restingHeartRate) setSkipHeartRate(true);
      }
      if (prefillNotes) setNotes(prefillNotes);
    }
  }, [id, bloodPressureLogs, navigation, prefillNotes]);

  const handleSaveLog = async () => {
    const isBpEntered = systolic.trim() || diastolic.trim();
    const isHrEntered = restingHeartRate.trim();
    
    if (skipBloodPressure && skipHeartRate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '最低一つ以上の項目を入力してください。');
      return; 
    }
    if (!skipBloodPressure && (!isBpEntered || parseInt(systolic) <= parseInt(diastolic))) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '血圧の値を正しく入力してください。'); 
      return; 
    }
    if (!skipHeartRate && !isHrEntered) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '心拍数を入力してください。'); 
      return; 
    }

    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);
    const finalSystolic = skipBloodPressure ? '' : systolic.trim();
    const finalDiastolic = skipBloodPressure ? '' : diastolic.trim();
    const finalHeartRate = skipHeartRate ? '' : restingHeartRate.trim();

    try {
      if (id) await updateBloodPressureLog(id, finalDate, finalSystolic, finalDiastolic, finalHeartRate, notes.trim());
      else await addBloodPressureLog(finalDate, finalSystolic, finalDiastolic, finalHeartRate, notes.trim());
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const displayTextParts = [];
      if (finalSystolic && finalDiastolic) displayTextParts.push(`血圧: ${finalSystolic}/${finalDiastolic} mmHg`);
      if (finalHeartRate) displayTextParts.push(`脈拍: ${finalHeartRate} bpm`);
      const message = displayTextParts.join('  ');
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: message,
        position: 'bottom',
        visibilityTime: 2000,
      });
      router.back();
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
        await addAlarm(snoozeTime, '血圧の記録', 'スヌーズ', 'none', undefined, undefined); 
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
  
  const openPicker = (target: 'systolic' | 'diastolic' | 'heartRate') => {
    Haptics.selectionAsync();
    if ((target !== 'heartRate' && skipBloodPressure) || (target === 'heartRate' && skipHeartRate)) return;
    setPickerTarget(target);
    setShowPickerModal(true);
  };

  const handlePickerSelect = (value: string) => {
    Haptics.selectionAsync();
    if (pickerTarget === 'systolic') setSystolic(value);
    else if (pickerTarget === 'diastolic') setDiastolic(value);
    else if (pickerTarget === 'heartRate') setRestingHeartRate(value);
  };

  const getPickerProps = () => {
    let options = BLOOD_PRESSURE_OPTIONS;
    let currentValue = '';
    let title = '';
    if (pickerTarget === 'systolic') { currentValue = systolic || '120'; title = '最高血圧'; }
    else if (pickerTarget === 'diastolic') { currentValue = diastolic || '80'; title = '最低血圧'; }
    else if (pickerTarget === 'heartRate') { options = HEART_RATE_OPTIONS; currentValue = restingHeartRate || '60'; title = '安静時心拍数'; }
    return { options, currentValue, title };
  };
  const { options, currentValue, title } = getPickerProps();
  const isDisabled = skipBloodPressure && skipHeartRate;

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
            <DateSelectRow date={date} showPicker={showDatePicker} onPress={() => setShowDatePicker(true)} onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} onClose={() => setShowDatePicker(false)} />
            <TimeSelectRow time={time} timeString={formatTime(time, 'h24')} showPicker={showTimePicker} onPress={() => setShowTimePicker(true)} onChange={(e, t) => { setShowTimePicker(false); if(t) setTime(t); }} onClose={() => setShowTimePicker(false)} />

            <View style={styles.switchRow}><Text style={commonStyles.label}>血圧を記録しない</Text><Switch value={skipBloodPressure} onValueChange={(val) => { setSkipBloodPressure(val); if(val) { setSystolic(''); setDiastolic(''); }}} /></View>
            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>最高血圧</Text>
              <View style={styles.inputGroup}>
                <TextInput style={commonStyles.textInput} value={systolic} onChangeText={setSystolic} keyboardType="numeric" placeholder="120" editable={!skipBloodPressure} />
                <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('systolic')} disabled={skipBloodPressure}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                <Text style={styles.unitLabel}>mmHg</Text>
              </View>
            </View>
            
            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>最低血圧</Text>
              <View style={styles.inputGroup}>
                <TextInput style={commonStyles.textInput} value={diastolic} onChangeText={setDiastolic} keyboardType="numeric" placeholder="80" editable={!skipBloodPressure} />
                <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('diastolic')} disabled={skipBloodPressure}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                <Text style={styles.unitLabel}>mmHg</Text>
              </View>
            </View>

            <View style={styles.switchRow}><Text style={commonStyles.label}>心拍数を記録しない</Text><Switch value={skipHeartRate} onValueChange={(val) => { setSkipHeartRate(val); if(val) setRestingHeartRate(''); }} /></View>
            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>安静時心拍数</Text>
              <View style={styles.inputGroup}>
                <TextInput style={commonStyles.textInput} value={restingHeartRate} onChangeText={setRestingHeartRate} keyboardType="numeric" placeholder="60" editable={!skipHeartRate} />
                <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('heartRate')} disabled={skipHeartRate}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                <Text style={styles.unitLabel}>bpm</Text>
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
                  <RNPickerSelect onValueChange={(val) => { if(val) handlePickerSelect(val); }} items={options} value={currentValue} style={pickerSelectStyles} placeholder={{ label: '選択', value: null }} />
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
  inputGroup: { flexDirection: 'row', alignItems: 'center' },
  unitLabel: { marginLeft: 10, fontSize: 17, color: '#555' },
  pickerButton: { padding: 10, marginLeft: 10, backgroundColor: '#007AFF', borderRadius: 8 },
  pickerIcon: { fontSize: 18, color: 'white' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: '#f9f9f9' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: 'white', borderTopRightRadius: 16, borderTopLeftRadius: 16, padding: 20, paddingBottom: 60 },
  pickerModalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
});