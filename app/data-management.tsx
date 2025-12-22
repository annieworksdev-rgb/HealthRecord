// app/data-management.tsx
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAlarms } from '../context/AlarmContext';
import { useHealthLogs } from '../context/HealthLogContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { useMedicationLogs } from '../context/MedicationLogContext';

export default function DataManagementScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  // 全データを取得
  const { logs: healthLogs } = useHealthLogs();
  const {
    bloodPressureLogs,
    weightLogs,
    bloodSugarLogs,
    temperatureLogs,
  } = useMeasurementLogs();
  const { medicationLogs } = useMedicationLogs();
  const { alarms } = useAlarms();

  const { restoreHealthLogs } = useHealthLogs();
  const { restoreMedicationLogs } = useMedicationLogs();
  const { restoreAlarms } = useAlarms();
  const { restoreMeasurements } = useMeasurementLogs();

  // --- バックアップ（書き出し） ---
  const handleBackup = async () => {
    try {
      setIsLoading(true);

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          healthLogs,
          bloodPressureLogs,
          weightLogs,
          bloodSugarLogs,
          temperatureLogs,
          medicationLogs,
          alarms,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      // documentDirectory が null の場合の対策をしておく
      const fileUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory) + 'health_app_backup.json';
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'バックアップファイルを保存',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('エラー', 'この端末では共有機能が使えません');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'バックアップの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 復元（読み込み） ---
  const handleRestore = async () => {
    Alert.alert(
      '復元の確認',
      'バックアップファイルを読み込んでデータを復元しますか？\n\n※現在のデータに追加・上書きされます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ファイルを選択',
          style: 'default',
          onPress: pickDocument,
        },
      ]
    );
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'public.json'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsLoading(true);
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      const parsed = JSON.parse(fileContent);

      if (!parsed.data || !parsed.version) {
        Alert.alert('エラー', '正しいバックアップファイルではないようです。');
        setIsLoading(false);
        return;
      }

      const backupData = parsed.data;

      // ★★★ 復元実行 ★★★
      
      // Promise.allで並列実行してもいいですが、安全のため順番に実行します
      if (backupData.healthLogs) {
        await restoreHealthLogs(backupData.healthLogs);
      }
      
      if (backupData.medicationLogs) {
        await restoreMedicationLogs(backupData.medicationLogs);
      }
      
      if (backupData.alarms) {
        await restoreAlarms(backupData.alarms);
      }

      if (backupData.bloodPressureLogs || backupData.weightLogs || 
          backupData.bloodSugarLogs || backupData.temperatureLogs) {
        await restoreMeasurements({
          bloodPressureLogs: backupData.bloodPressureLogs,
          weightLogs: backupData.weightLogs,
          bloodSugarLogs: backupData.bloodSugarLogs,
          temperatureLogs: backupData.temperatureLogs,
        });
      }

      setIsLoading(false);
      Alert.alert('完了', 'データの復元が完了しました！');

    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ファイルの読み込みに失敗しました');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'データ管理',
          headerTitleAlign: 'center', // Androidで中央寄せにしたい場合
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.description}>
            機種変更時などにデータを引き継ぐための機能です。
            定期的にバックアップを保存することをお勧めします。
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleBackup}
            disabled={isLoading}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>データをバックアップ</Text>
              <Text style={styles.buttonSub}>ファイルに書き出して保存</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.restoreButton]}
            onPress={handleRestore}
            disabled={isLoading}
          >
            <View style={[styles.iconContainer, styles.restoreIcon]}>
              <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, styles.restoreText]}>データを復元</Text>
              <Text style={styles.buttonSub}>ファイルからデータを読み込み</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  section: { marginBottom: 32 },
  description: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restoreButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restoreIcon: { backgroundColor: '#E3F2FD' },
  buttonTextContainer: { flex: 1 },
  buttonTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  restoreText: { color: '#007AFF' },
  buttonSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#fff', marginTop: 10 },
});