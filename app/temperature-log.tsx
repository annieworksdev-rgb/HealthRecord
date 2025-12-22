import { Ionicons } from '@expo/vector-icons'; // ★追加
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router'; // ★Stack追加
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { commonStyles, pickerSelectStyles } from '../styles/common';
import { formatTime, TEMP_MAX, TEMP_MIN, TEMP_OPTIONS } from '../utils/shared';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';

export default function TemperatureLogScreen() {
  const insets = useSafeAreaInsets(); // ★追加
  const { id, fromReservation, prefillNotes, alarmId } = useLocalSearchParams<{ id: string; fromReservation?: string; prefillNotes?: string; alarmId?: string }>();
  const { temperatureLogs, addTemperatureLog, updateTemperatureLog } = useMeasurementLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const { isPro, toggleProStatusDebug } = usePurchase();

  // ヘッダータイトル決定
  const headerTitle = id ? '記録を編集' : '体温の記録';

  useEffect(() => {
    if (id) {
      const targetLog = temperatureLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setValue(targetLog.value);
        setNotes(targetLog.notes || '');
        // navigation.setOptions({ title: '記録を編集' }); // ★削除 (自作ヘッダーを使うため)
      }
    } else {
      const sortedLogs = [...temperatureLogs].sort((a, b) => b.time.getTime() - a.time.getTime());
      if (sortedLogs.length > 0) {
        setValue(sortedLogs[0].value);
      }
      if (prefillNotes) setNotes(prefillNotes);
    }
  }, [id, temperatureLogs, prefillNotes]);

  const handleSaveLog = async () => {
    if (!value.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '体温を入力してください。'); 
      return; 
    }
    const parsedValue = parseFloat(value.trim());
    if (isNaN(parsedValue) || parsedValue < TEMP_MIN || parsedValue > TEMP_MAX) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', `有効な体温の値（${TEMP_MIN}°C〜${TEMP_MAX}°C）を入力してください。`);
      return;
    }
    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);

    try {
      if (id) {
        const parsed = parseFloat(value.trim()).toFixed(1);
        await updateTemperatureLog(id, finalDate, parsed, notes.trim());
      } else {
        const parsed = parseFloat(value.trim()).toFixed(1);
        await addTemperatureLog(finalDate, parsed, notes.trim());
      }
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: `体温: ${parsedValue} °C`,
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
        await addAlarm(snoozeTime, '体温の記録', 'スヌーズ', 'none');
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
    setShowPickerModal(false); 
  };
  
  const pickerOptions = TEMP_OPTIONS;
  const currentValue = value || '36.5';
  const title = '体温を選択';
  const isDisabled = !value.trim();

  return (
    // ★SafeAreaViewをやめて通常のViewにし、自作ヘッダーを配置
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
              <Text style={commonStyles.label}>体温 (°C)</Text>
              <View style={styles.inputGroup}>
                  <TextInput style={commonStyles.textInput} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="36.5" />
                  <TouchableOpacity style={styles.pickerButton} onPress={openPicker}><Text style={styles.pickerIcon}>⚙️</Text></TouchableOpacity>
                  <Text style={styles.unitLabel}>°C</Text>
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
});