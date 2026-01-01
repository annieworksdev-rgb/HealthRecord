import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useMedicationLogs } from '../context/MedicationLogContext';
import { commonStyles } from '../styles/common';
import { formatTime } from '../utils/shared'; // UNIT_OPTIONSのインポートを削除
import { useRef } from 'react';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

// ★修正: ここで安全な単位リストを定義して上書きする
const SAFE_UNIT_OPTIONS = [
  '錠剤', '個', '分量', '包', '滴', 'g', 'mg', 'mm', 'ml', 'μg', 'IU', 'カプセル'
];

export default function MedicationLogScreen() {
  const insets = useSafeAreaInsets();
  const { id, prefillName, prefillAmount, prefillUnit, fromReservation, alarmId } = useLocalSearchParams<{ 
      id?: string;
      prefillName?: string;
      prefillAmount?: string;
      prefillUnit?: string;
      fromReservation?: string;
      alarmId?: string;
  }>();
  const { medicationLogs, addMedicationLog, updateMedicationLog } = useMedicationLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [drugName, setDrugName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('錠剤'); 
  const [notes, setNotes] = useState('');
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const headerTitle = id ? '記録を編集' : 'サプリ摂取の記録';
  const { isPro, toggleProStatusDebug } = usePurchase();

  useEffect(() => {
    if (id) {
      const targetLog = medicationLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setDrugName(targetLog.name);
        setAmount(targetLog.amount);
        setUnit(targetLog.unit);
        setNotes(targetLog.notes || '');
      }
    } else {
        if (prefillName) setDrugName(prefillName);
        if (prefillAmount) setAmount(prefillAmount);
        if (prefillUnit) setUnit(prefillUnit);
    }
  }, [id, medicationLogs, navigation, prefillName, prefillAmount, prefillUnit]);

  const handleSaveLog = async () => {
    if (!drugName.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', 'サプリの名前を入力してください。'); 
      return; 
    }
    if (!amount.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '個数または分量を入力してください。'); 
      return; 
    }
    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);
    try {
      if (id) await updateMedicationLog(id, finalDate, drugName, amount, unit, notes.trim());
      else await addMedicationLog(finalDate, drugName, amount, unit, notes.trim());
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: `${drugName} を ${amount}${unit}`,
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
        const medData = drugName ? { name: drugName, amount: amount, unit: unit } : undefined;
        await addAlarm(snoozeTime, 'サプリ摂取の記録', '', 'none', undefined, medData);
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
  
  const isFormValid = drugName.trim() && amount.trim();

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
              <Text style={commonStyles.label}>サプリの名前</Text>
              <TextInput style={commonStyles.textInput} value={drugName} onChangeText={setDrugName} placeholder="例: ビタミン" />
            </View>

            <View style={commonStyles.inputRow}>
              <Text style={commonStyles.label}>個数/分量</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextInput style={[commonStyles.textInput, { flex: 1 }]} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5" />
                <TouchableOpacity style={styles.unitButton} onPress={() => { Haptics.selectionAsync(); setShowUnitModal(true); }}>
                  <Text style={styles.unitText}>{unit}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={commonStyles.notesContainer}>
              <Text style={commonStyles.listHeader}>備考</Text>
              <TextInput style={commonStyles.notesInputSimple} value={notes} onChangeText={setNotes} placeholder="詳細..." multiline={true} textAlignVertical="top" />
            </View>

            <SaveArea onSave={handleSaveLog} onSnooze={handleSnooze} onSkip={handleSkip} isEditMode={!!id} isFromReservation={fromReservation === 'true'} disabled={!isFormValid} />
            
            <Modal visible={showUnitModal} transparent={true} animationType="fade" onRequestClose={() => setShowUnitModal(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setShowUnitModal(false)}>
                <View style={styles.unitModalContent}>
                  <Text style={styles.unitModalTitle}>単位を選択</Text>
                  <ScrollView style={styles.unitList}>
                    {/* ★修正: ここでSAFE_UNIT_OPTIONSを使う */}
                    {SAFE_UNIT_OPTIONS.map((opt) => (
                      <TouchableOpacity key={opt} style={[styles.unitOption, opt === unit && styles.selectedUnitOption]} onPress={() => { Haptics.selectionAsync(); setUnit(opt); setShowUnitModal(false); }}>
                        <Text style={[styles.unitOptionText, opt === unit && styles.selectedUnitOptionText]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowUnitModal(false)}><Text style={styles.modalCancelText}>閉じる</Text></TouchableOpacity>
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
  unitButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: '#007AFF' },
  unitText: { fontSize: 17, marginRight: 5, color: 'white' },
  dropdownIcon: { fontSize: 10, color: 'white' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: 20 },
  unitModalContent: { backgroundColor: 'white', borderRadius: 16, width: '100%', maxHeight: '60%', padding: 20, paddingBottom: 20, elevation: 5 },
  unitModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  unitList: { maxHeight: 200, marginBottom: 15 },
  unitOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedUnitOption: { backgroundColor: '#f0f8ff' },
  unitOptionText: { fontSize: 16, textAlign: 'center', color: '#000' },
  selectedUnitOptionText: { fontWeight: 'bold', color: '#007AFF' },
  modalCancelButton: { marginTop: 15, paddingVertical: 10 },
  modalCancelText: { color: '#007AFF', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});