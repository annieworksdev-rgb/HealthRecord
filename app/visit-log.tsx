import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { DateSelectRow, SaveArea, TimeSelectRow } from '../components/LogScreenParts';
import { useAlarms } from '../context/AlarmContext';
import { useHealthLogs } from '../context/HealthLogContext';
import { commonStyles } from '../styles/common';
import { formatTime } from '../utils/shared';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

export default function VisitLogScreen() {
  const insets = useSafeAreaInsets();
  const { id, prefillHospitalName, alarmId } = useLocalSearchParams<{ id: string; prefillHospitalName?: string; alarmId?: string; }>();
  const { visitLogs, addVisitLog, updateVisitLog } = useHealthLogs();
  const { addAlarm, snoozeAlarm, skipAlarm, completeAlarm, alarms, autoSnoozeAlarm } = useAlarms();
  const navigation = useNavigation();
  const isActionTaken = useRef(false);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [hospitalName, setHospitalName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [hasMedication, setHasMedication] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [imageUris, setImageUris] = useState<string[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const { isPro, toggleProStatusDebug } = usePurchase();
  
  // ★修正: 「通院」→「メンテナンス」
  const headerTitle = id ? '記録を編集' : 'メンテナンス記録';

  useEffect(() => {
    if (id) {
      const targetLog = visitLogs.find((log) => log.id === id);
      if (targetLog) {
        setDate(targetLog.time);
        setTime(targetLog.time);
        setHospitalName(targetLog.hospitalName);
        setSymptoms(targetLog.symptoms);
        setHasMedication(targetLog.hasMedication);
        setNotes(targetLog.notes || '');
        setImageUris(targetLog.imageUris || []);
      }
    } else {
      if (prefillHospitalName) setHospitalName(prefillHospitalName);
    }
  }, [id, visitLogs, navigation, prefillHospitalName]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', '画像を選択するにはカメラロールへのアクセスが必要です。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImageUris((prev) => [...prev, ...newUris]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', '撮影するにはカメラへのアクセスが必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    Alert.alert('画像の削除', 'この画像を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          setImageUris((prev) => prev.filter((_, index) => index !== indexToRemove));
        },
      },
    ]);
  };

  const handleSaveLog = async () => {
    if (!hospitalName.trim()) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // ★修正: エラーメッセージも「施設名」に
      Alert.alert('エラー', '施設名を入力してください。'); 
      return; 
    }
    isActionTaken.current = true;
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0);

    try {
      if (id) await updateVisitLog(id, finalDate, hospitalName.trim(), symptoms.trim(), hasMedication, notes.trim(), imageUris);
      else await addVisitLog(finalDate, hospitalName.trim(), symptoms.trim(), hasMedication, notes.trim(), imageUris);
      
      if (alarmId) await completeAlarm(alarmId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: '保存しました',
        text2: `施設: ${hospitalName.trim()}`,
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
        // ★修正: 通知タイトルも「メンテナンス記録」に
        await addAlarm(snoozeTime, 'メンテナンス記録', hospitalName);
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
              {/* ★修正: 病院名→施設名 */}
              <Text style={commonStyles.label}>施設名</Text>
              <TextInput style={commonStyles.textInput} value={hospitalName} onChangeText={setHospitalName} placeholder="〇〇ジム、〇〇センター など" />
            </View>

            <View style={commonStyles.inputRow}>
              {/* ★修正: 症状名→気になるところ（メモ） */}
              <Text style={commonStyles.label}>気になるところ (メモ)</Text>
              <TextInput style={commonStyles.textInput} value={symptoms} onChangeText={setSymptoms} placeholder="リフレッシュ、筋肉痛 など" />
            </View>

            <View style={styles.switchRow}>
              {/* ★修正: 投薬→アイテム利用 */}
              <Text style={commonStyles.label}>アイテム利用</Text>
              <View style={styles.switchContainer}>
                <Text style={{ marginRight: 10, color: hasMedication ? '#007AFF' : '#888' }}>{hasMedication ? 'あり' : 'なし'}</Text>
                <Switch onValueChange={(val) => { Haptics.selectionAsync(); setHasMedication(val); }} value={hasMedication} />
              </View>
            </View>

            <View style={styles.imageSection}>
              {/* ★修正: 処方箋→明細書 */}
              <Text style={commonStyles.label}>画像 (明細書・記録など)</Text>
              <View style={styles.imageButtonsRow}>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonText}>📷 アルバムから</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonText}>📸 カメラで撮影</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.deleteBadge} 
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.deleteBadgeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={commonStyles.notesContainer}>
              <Text style={commonStyles.listHeader}>備考</Text>
              <TextInput style={commonStyles.notesInputSimple} value={notes} onChangeText={setNotes} placeholder="詳細..." multiline={true} textAlignVertical="top" />
            </View>

            <SaveArea onSave={handleSaveLog} onSnooze={handleSnooze} onSkip={handleSkip} isEditMode={!!id} isFromReservation={!!alarmId} />
          </ScrollView>
          
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 0 },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  imageSection: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  imageButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10 },
  imageButton: { backgroundColor: '#E6F4FE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  imageButtonText: { color: '#007AFF', fontWeight: '600', fontSize: 14 },
  imageList: { flexDirection: 'row' },
  imageContainer: { marginRight: 10, position: 'relative' },
  previewImage: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});