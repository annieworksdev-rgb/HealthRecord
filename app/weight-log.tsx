import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons'; // ★追加
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'; // ★Stack追加
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★追加
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { commonStyles, pickerSelectStyles } from '../styles/common';
import { formatTime, MAX_WEIGHT, WEIGHT_RANGE } from '../utils/shared';
import { useRef } from 'react';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';

export default function WeightLogScreen() {
  const insets = useSafeAreaInsets(); // ★追加
  const { id, fromReservation, prefillNotes, alarmId } = useLocalSearchParams<{ id: string; fromReservation?: string; prefillNotes?: string; alarmId?: string }>();
  const { weightLogs, addWeightLog, updateWeightLog } = useMeasurementLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const { isPro, toggleProStatusDebug } = usePurchase();
  
  const headerTitle = id ? '記録を編集' : '体重の記録';

  useEffect(() => {
    if (id) {
      const targetLog = weightLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setWeight(targetLog.weight);
        setNotes(targetLog.notes || '');
        // navigation.setOptions({ title: '記録を編集' }); // ★削除
      }
    } else {
      const sortedLogs = [...weightLogs].sort((a, b) => b.time.getTime() - a.time.getTime());
      if (sortedLogs.length > 0) setWeight(sortedLogs[0].weight);
      if (prefillNotes) setNotes(prefillNotes);
    }
  }, [id, weightLogs, navigation, prefillNotes]);

  const handleSaveLog = async () => {
    if (!weight.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '体重を入力してください。'); 
      return; 
    }
    const parsedWeight = parseFloat(weight.trim());
    if (isNaN(parsedWeight) || parsedWeight < WEIGHT_RANGE || parsedWeight > MAX_WEIGHT) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', `有効な体重の値（${WEIGHT_RANGE}〜${MAX_WEIGHT} kg）を入力してください。`);
      return;
    }

    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);
    const formattedWeight = parsedWeight.toFixed(1);

    try {
      if (id) await updateWeightLog(id, finalDate, formattedWeight, notes.trim());
      else await addWeightLog(finalDate, formattedWeight, notes.trim());
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: `体重: ${formattedWeight} kg`,
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
        await addAlarm(snoozeTime, '体重の記録', 'スヌーズ', 'none');
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
  
  const { integerOptions, decimalOptions } = useMemo(() => {
    const ints = [];
    for (let i = WEIGHT_RANGE; i <= MAX_WEIGHT; i++) ints.push({ label: String(i), value: String(i) });
    const decs = [];
    for (let i = 0; i <= 9; i++) decs.push({ label: String(i), value: String(i) });
    return { integerOptions: ints, decimalOptions: decs };
  }, []);

  const openPicker = () => {
    Haptics.selectionAsync();
    if (!weight) setWeight('65.0');
    else if (!weight.includes('.')) setWeight(weight + '.0');
    setShowPickerModal(true);
  };

  const [currentInt, currentDec] = useMemo(() => {
    if (!weight) return ['65', '0'];
    const parts = weight.split('.');
    return [parts[0] || '65', parts[1] ? parts[1].charAt(0) : '0'];
  }, [weight]);

  const updateWeightFromPicker = (newInt: string, newDec: string) => {
    Haptics.selectionAsync();
    setWeight(`${newInt}.${newDec}`);
  };

  const isDisabled = !weight.trim();

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

            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>体重</Text>
              <View style={styles.inputGroup}>
                  <TextInput style={commonStyles.textInput} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="65.0" />
                  <TouchableOpacity style={styles.pickerButton} onPress={openPicker}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                  <Text style={styles.unitLabel}>kg</Text>
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
                  <Text style={styles.pickerModalTitle}>体重を選択</Text>
                  <View style={styles.pickerRow}>
                    <View style={styles.pickerWrapper}>
                      <RNPickerSelect onValueChange={(val) => { if(val) updateWeightFromPicker(val, currentDec); }} items={integerOptions} value={currentInt} style={pickerSelectStyles} placeholder={{}} useNativeAndroidPickerStyle={false} />
                    </View>
                    <Text style={styles.dotText}>.</Text>
                    <View style={styles.pickerWrapper}>
                      <RNPickerSelect onValueChange={(val) => { if(val) updateWeightFromPicker(currentInt, val); }} items={decimalOptions} value={currentDec} style={pickerSelectStyles} placeholder={{}} useNativeAndroidPickerStyle={false} />
                    </View>
                    <Text style={styles.unitText}>kg</Text>
                  </View>
                  <Button title="完了" onPress={() => setShowPickerModal(false)} />
                </View>
              </Pressable>
            </Modal>
          </ScrollView>

          {!isPro && !IS_SCREENSHOT_MODE && (
            <View style={commonStyles.adContainer}>
              <Text style={commonStyles.adPlaceholderText}>広告スペース</Text>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: 'white', borderTopRightRadius: 16, borderTopLeftRadius: 16, width: '100%', padding: 20, paddingBottom: 60, },
  pickerModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pickerWrapper: { width: 80 },
  dotText: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 5 },
  unitText: { fontSize: 18, marginLeft: 10, color: '#555' },
});