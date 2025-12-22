// app/modal.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlarms } from '../context/AlarmContext';
import { TimeFormat, WeatherSetting } from '../types/types';
// ★追加: 課金フックをインポート
import { usePurchase } from '../context/PurchaseContext';
import { Ionicons } from '@expo/vector-icons';

const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  auto: 'OSの設定に合わせる',
  h12: '12時間表示 (AM/PM)',
  h24: '24時間表示',
};

const WEATHER_SETTING_LABELS: Record<WeatherSetting, string> = {
  on: '取得する',
  off: '取得しない',
};

export default function ModalSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { timeFormat, setTimeFormat, weatherSetting, setWeatherSetting } = useAlarms();
  
  // ★課金状態と関数を取得
  const { isPro, packages, purchase, restore, isLoading } = usePurchase();

  // ★設定対象を管理 ('time' | 'weather' | 'purchase')
  const [activeSetting, setActiveSetting] = useState<'time' | 'weather' | 'purchase' | null>(null);

  const renderOptions = () => {
    if (activeSetting === 'time') {
      return (Object.keys(TIME_FORMAT_LABELS) as TimeFormat[]).map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.modalOption}
          onPress={() => {
            Haptics.selectionAsync();
            setTimeFormat(key);
            setActiveSetting(null);
          }}
        >
          <Text style={styles.modalOptionText}>{TIME_FORMAT_LABELS[key]}</Text>
          <View style={styles.radioOuter}>
            {timeFormat === key && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ));
    } else if (activeSetting === 'weather') {
      return (Object.keys(WEATHER_SETTING_LABELS) as WeatherSetting[]).map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.modalOption}
          onPress={() => {
            Haptics.selectionAsync();
            setWeatherSetting(key);
            setActiveSetting(null);
          }}
        >
          <Text style={styles.modalOptionText}>{WEATHER_SETTING_LABELS[key]}</Text>
          <View style={styles.radioOuter}>
            {weatherSetting === key && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ));
    }
    return null;
  };

  // ★課金モーダルのレンダリング
  const renderPurchaseModal = () => {
    return (
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>プレミアムプラン</Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ lineHeight: 22, color: '#444' }}>
            プレミアムプランに登録すると以下の機能が解放されます：
          </Text>
          <View style={{ marginTop: 10 }}>
             <Text style={styles.featureItem}>✅ 広告の非表示</Text>
             <Text style={styles.featureItem}>✅ 全期間のグラフ閲覧</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            {/* 商品リストを表示 (RevenueCatから取得したpackages) */}
            {packages.map((pack) => (
              <TouchableOpacity
                key={pack.identifier}
                style={styles.purchaseButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  purchase(pack); // 購入処理実行
                }}
              >
                <Text style={styles.purchaseButtonTitle}>{pack.product.title}</Text>
                <Text style={styles.purchaseButtonPrice}>{pack.product.priceString}</Text>
              </TouchableOpacity>
            ))}

            {packages.length === 0 && (
              <Text style={{ textAlign: 'center', color: '#999', marginBottom: 10 }}>
                商品情報を取得できませんでした。{'\n'}インターネット接続を確認してください。
              </Text>
            )}

            <TouchableOpacity
              style={{ marginTop: 10, padding: 10, alignItems: 'center' }}
              onPress={() => {
                Haptics.selectionAsync();
                restore();
              }}
            >
              <Text style={{ color: '#007AFF', fontSize: 14 }}>以前購入した方はこちら (復元)</Text>
            </TouchableOpacity>

            {/* プライバシーポリシーへのリンク */}
            <TouchableOpacity
              style={{ marginTop: 5, padding: 5, alignItems: 'center' }}
              onPress={() => {
                Linking.openURL('https://sites.google.com/view/annie-works-policy/%E6%9C%8D%E8%96%AC%E8%A8%98%E9%8C%B2%E3%83%97%E3%83%A9%E3%82%A4%E3%83%90%E3%82%B7%E3%83%BC%E3%83%9D%E3%83%AA%E3%82%B7%E3%83%BC');
              }}
            >
              <Text style={{ color: '#888', fontSize: 12, textDecorationLine: 'underline' }}>
                プライバシーポリシーを確認
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={() => setActiveSetting(null)}
        >
          <Text style={styles.modalCancelText}>閉じる</Text>
        </TouchableOpacity>
      </View>
    );
  };

  let modalTitle = '';
  if (activeSetting === 'time') modalTitle = '時間表示';
  else if (activeSetting === 'weather') modalTitle = '天気・気圧情報';

  return (
    <View style={styles.container}>
      {/* プレミアムプラン (一番目立つ位置に) */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveSetting('purchase');
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="star" size={20} color="#FFD700" style={{ marginRight: 8 }} />
          <Text style={styles.settingLabel}>プレミアムプラン</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.settingValue, isPro && { color: '#007AFF', fontWeight: 'bold' }]}>
            {isPro ? '登録済み' : '未登録'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 5 }} />
        </View>
      </TouchableOpacity>

      {/* 時間表示設定 */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveSetting('time');
        }}
      >
        <Text style={styles.settingLabel}>時間表示</Text>
        <Text style={styles.settingValue}>
          {TIME_FORMAT_LABELS[timeFormat]}
        </Text>
      </TouchableOpacity>

      {/* 天気設定 */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveSetting('weather');
        }}
      >
        <Text style={styles.settingLabel}>天気・気圧情報</Text>
        <Text style={styles.settingValue}>
          {WEATHER_SETTING_LABELS[weatherSetting]}
        </Text>
      </TouchableOpacity>

      {/* データ管理 */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => {
          router.push('/data-management'); 
        }}
      >
        <Text style={styles.settingLabel}>データ管理</Text>
        <Text style={[styles.settingValue, { fontSize: 14 }]}>
          バックアップ・復元 &gt;
        </Text>
      </TouchableOpacity>
      
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>閉じる</Text>
        </TouchableOpacity>
      </View>

      {/* 共通選択モーダル */}
      <Modal
        visible={activeSetting !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveSetting(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveSetting(null)}
        >
          {/* purchaseのときは専用UI、それ以外は共通リストUI */}
          {activeSetting === 'purchase' ? renderPurchaseModal() : (
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              {renderOptions()}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setActiveSetting(null)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 17,
    color: '#000',
  },
  settingValue: {
    fontSize: 17,
    color: '#888',
  },
  footer: {
    padding: 20,
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  modalCancelButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ★追加スタイル
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // 上下中央揃え
  },
  purchaseButtonTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,       // ★追加: これで幅からはみ出さずに改行されます
    marginRight: 8 // ★追加: 金額との間に少し隙間を作ります
  },
  purchaseButtonPrice: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    // flexShrink: 0, // 必要なら追加（金額が絶対に改行されないようにする）
  }
});