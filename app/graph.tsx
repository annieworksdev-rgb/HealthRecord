// app/graph.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthLogs } from '../context/HealthLogContext';
import { useMeasurementLogs } from '../context/MeasurementLogContext';
import { getDateKey } from '../utils/shared';
import { IS_SCREENSHOT_MODE } from '../utils/shared';
import { usePurchase } from '../context/PurchaseContext';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  useInterstitialAd 
} from 'react-native-google-mobile-ads';

const SCREEN_WIDTH = Dimensions.get('window').width;

type GraphType = 'condition' | 'bp' | 'weight' | 'sugar' | 'temp';

export default function GraphScreen() {
  const insets = useSafeAreaInsets();
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const { bloodPressureLogs, weightLogs, bloodSugarLogs, temperatureLogs } = useMeasurementLogs();
  const { logs } = useHealthLogs();
  
  const [selectedType, setSelectedType] = useState<GraphType>('condition');
  const { isPro, toggleProStatusDebug } = usePurchase();

  // --- データ加工処理 ---
  const { 
    bpDataSystolic, bpDataDiastolic, pulseData, 
    weightData, weightYAxisOffset,
    sugarDataBefore, sugarDataAfter, sugarMaxValue,
    tempData, tempYAxisOffset,
    conditionData,
  } = useMemo(() => {
    type DataPoint = { value: number; label?: string; dataPointText?: string; hideDataPoint?: boolean; customDataPoint?: any; };

    // 期間制限のロジック
    // Proなら30日（または無制限）、無料なら14日
    const limitDays = isPro ? 30 : 14;

    // 基準日を作る（今日から limitDays日前）
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);
    cutoffDate.setHours(0, 0, 0, 0);

    // フィルタリング用の共通関数
    const filterByDate = (log: { time: Date }) => {
      // Proなら期間制限なし（ここでは実装上30日にしていますが、必要なら全期間にもできます）
      // 無料なら cutoffDate より新しいものだけ通す
      return isPro ? true : log.time >= cutoffDate;
    };

    // 0. 体調
    const sortedLogs = [...logs]
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter(filterByDate)
      .slice(-30);
    const condPoints: DataPoint[] = [];
    sortedLogs.forEach((log) => {
      const dateLabel = `${log.time.getMonth() + 1}/${log.time.getDate()}`;
      if (log.conditionRating) {
        condPoints.push({ value: log.conditionRating, label: dateLabel, dataPointText: log.conditionRating.toString() });
      }
    });

    // 1. 血圧・脈拍
    const sortedBpLogs = [...bloodPressureLogs]
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter(filterByDate)
      .slice(-30);
    const systolicPoints: DataPoint[] = [];
    const diastolicPoints: DataPoint[] = [];
    const pulsePoints: DataPoint[] = [];
    sortedBpLogs.forEach((log) => {
      const dateLabel = `${log.time.getMonth() + 1}/${log.time.getDate()}`;
      if (log.systolic && log.diastolic) {
        systolicPoints.push({ value: parseInt(log.systolic), label: dateLabel, dataPointText: log.systolic });
        diastolicPoints.push({ value: parseInt(log.diastolic), dataPointText: log.diastolic });
      }
      if (log.restingHeartRate) {
        pulsePoints.push({ value: parseInt(log.restingHeartRate), label: dateLabel, dataPointText: log.restingHeartRate });
      }
    });

    // 2. 体重
    const sortedWeightLogs = [...weightLogs]
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter(filterByDate)
      .slice(-30);
    const weightPoints: DataPoint[] = [];
    let minWeight = 1000; 
    sortedWeightLogs.forEach((log) => {
      const dateLabel = `${log.time.getMonth() + 1}/${log.time.getDate()}`;
      if (log.weight) {
        const val = parseFloat(log.weight);
        if (val < minWeight) minWeight = val;
        weightPoints.push({ value: val, label: dateLabel, dataPointText: log.weight });
      }
    });
    const wOffset = minWeight === 1000 ? 0 : Math.floor(minWeight - 2);

    // 3. 血糖値
    const sugarMap: { [dateKey: string]: { before?: number; after?: number; dateLabel: string } } = {};
    const sortedSugarLogs = [...bloodSugarLogs]
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter(filterByDate);
    let maxSugarVal = 0;
    sortedSugarLogs.forEach((log) => {
      const key = getDateKey(log.time);
      const dateLabel = `${log.time.getMonth() + 1}/${log.time.getDate()}`;
      if (!sugarMap[key]) sugarMap[key] = { dateLabel };
      const val = parseInt(log.value);
      if (val > maxSugarVal) maxSugarVal = val;
      if (log.timing === 'before') sugarMap[key].before = val;
      else if (log.timing === 'after') sugarMap[key].after = val;
    });
    const sugarKeys = Object.keys(sugarMap).sort().slice(-30);
    const sBeforePoints: DataPoint[] = [];
    const sAfterPoints: DataPoint[] = [];
    sugarKeys.forEach((key) => {
      const item = sugarMap[key];
      if (item.before) sBeforePoints.push({ value: item.before, label: item.dateLabel, dataPointText: item.before.toString() });
      else sBeforePoints.push({ value: 0, hideDataPoint: true, customDataPoint: () => <View /> }); 
      if (item.after) sAfterPoints.push({ value: item.after, dataPointText: item.after.toString() });
      else sAfterPoints.push({ value: 0, hideDataPoint: true, customDataPoint: () => <View /> });
    });
    const calculatedMax = Math.ceil((maxSugarVal + 20) / 10) * 10;
    const finalSugarMax = calculatedMax < 140 ? 140 : calculatedMax;

    // 4. 体温
    const sortedTempLogs = [...temperatureLogs]
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .filter(filterByDate)
      .slice(-30);
    const tempPoints: DataPoint[] = [];
    let minTemp = 100; 
    sortedTempLogs.forEach((log) => {
      const dateLabel = `${log.time.getMonth() + 1}/${log.time.getDate()}`;
      if (log.value) {
        const val = parseFloat(log.value);
        if (val < minTemp) minTemp = val;
        tempPoints.push({ value: val, label: dateLabel, dataPointText: log.value });
      }
    });
    const tOffset = minTemp === 100 ? 35 : Math.floor(minTemp - 0.5);

    return { 
      bpDataSystolic: systolicPoints, bpDataDiastolic: diastolicPoints, pulseData: pulsePoints,
      weightData: weightPoints, weightYAxisOffset: wOffset < 0 ? 0 : wOffset,
      sugarDataBefore: sBeforePoints, sugarDataAfter: sAfterPoints, sugarMaxValue: finalSugarMax,
      tempData: tempPoints, tempYAxisOffset: tOffset < 0 ? 0 : tOffset,
      conditionData: condPoints,
    };
  }, [bloodPressureLogs, weightLogs, bloodSugarLogs, temperatureLogs, logs]);

  const handleSwitchTab = (type: GraphType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
  };

  const renderTab = (type: GraphType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, selectedType === type && styles.tabButtonSelected]}
      onPress={() => handleSwitchTab(type)}
    >
      <Text style={[styles.tabText, selectedType === type && styles.tabTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (selectedType === 'condition') {
      if (conditionData.length === 0) return <EmptyView />;
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>体調の波 <Text style={styles.chartTitleSub}>(1:悪 〜 5:良)</Text></Text>
          <LineChart
            data={conditionData} height={220} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
            color="#E91E63" dataPointsColor="#E91E63" textShiftY={-2} textShiftX={-5} textFontSize={11}
            yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
            hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" curved isAnimated maxValue={5} stepValue={1} yAxisOffset={0} scrollToEnd 
          />
          <Text style={styles.noteText}>高いほど調子が良い状態です</Text>
        </View>
      );
    }
    if (selectedType === 'bp') {
      const hasBpData = bpDataSystolic.length > 0;
      const hasPulseData = pulseData.length > 0;
      if (!hasBpData && !hasPulseData) return <EmptyView />;
      return (
        <View>
          {hasBpData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>BP <Text style={styles.chartTitleSub}>(mmHg)</Text></Text>
              <LineChart
                data={bpDataSystolic} data2={bpDataDiastolic} height={220} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
                color1="#FF5252" color2="#448AFF" dataPointsColor1="#FF5252" dataPointsColor2="#448AFF" textShiftY={-2} textShiftX={-10} textFontSize={11}
                yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
                hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" curved isAnimated scrollToEnd
              />
              <View style={styles.legendContainer}>
                <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} /><Text style={styles.legendText}>High</Text>
                <View style={[styles.legendDot, { backgroundColor: '#448AFF', marginLeft: 15 }]} /><Text style={styles.legendText}>Low</Text>
              </View>
            </View>
          )}
          {hasPulseData && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>BPM <Text style={styles.chartTitleSub}>(bpm)</Text></Text>
              <LineChart
                data={pulseData} height={180} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
                color="#4CAF50" dataPointsColor="#4CAF50" textShiftY={-2} textShiftX={-5} textFontSize={11}
                yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
                hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" curved isAnimated scrollToEnd
              />
            </View>
          )}
        </View>
      );
    }
    if (selectedType === 'weight') {
      if (weightData.length === 0) return <EmptyView />;
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>体重 <Text style={styles.chartTitleSub}>(kg)</Text></Text>
          <LineChart
            data={weightData} height={220} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
            color="#FF9800" dataPointsColor="#FF9800" textShiftY={-2} textShiftX={-10} textFontSize={11}
            yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
            hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" curved isAnimated yAxisOffset={weightYAxisOffset} scrollToEnd
          />
        </View>
      );
    }
    if (selectedType === 'sugar') {
      const hasData = sugarDataBefore.some(d => d.value > 0) || sugarDataAfter.some(d => d.value > 0);
      if (!hasData) return <EmptyView />;
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>糖質管理 <Text style={styles.chartTitleSub}>(mg/dL)</Text></Text>
          <LineChart
            data={sugarDataBefore} data2={sugarDataAfter} height={220} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
            color1="#2196f3" color2="#e91e63" dataPointsColor1="#2196f3" dataPointsColor2="#e91e63" textShiftY={-2} textShiftX={-10} textFontSize={11}
            yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
            hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" isAnimated maxValue={sugarMaxValue} scrollToEnd 
          />
          <View style={styles.legendContainer}>
            <View style={[styles.legendDot, { backgroundColor: '#2196f3' }]} /><Text style={styles.legendText}>食前</Text>
            <View style={[styles.legendDot, { backgroundColor: '#e91e63', marginLeft: 15 }]} /><Text style={styles.legendText}>食後</Text>
          </View>
          <Text style={styles.noteText}>※「その他」のタイミングは表示されません</Text>
        </View>
      );
    }
    if (selectedType === 'temp') {
      if (tempData.length === 0) return <EmptyView />;
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>体温 <Text style={styles.chartTitleSub}>(°C)</Text></Text>
          <LineChart
            data={tempData} height={220} width={SCREEN_WIDTH - 80} initialSpacing={20} spacing={40} thickness={3}
            color="#4CAF50" dataPointsColor="#4CAF50" textShiftY={-2} textShiftX={-10} textFontSize={11}
            yAxisTextStyle={{ fontSize: 10, color: '#999' }} xAxisLabelTextStyle={{ fontSize: 10, color: '#999' }}
            hideRules yAxisThickness={0} xAxisThickness={1} xAxisColor="#ddd" curved isAnimated yAxisOffset={tempYAxisOffset} scrollToEnd
          />
        </View>
      );
    }
    return <View style={styles.emptyContainer}><Text style={styles.emptyText}>準備中...</Text></View>;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* 左: メニューボタン (Indexと同じ位置・サイズ・マージン) */}
          <TouchableOpacity 
            onPress={() => {
              Haptics.selectionAsync();
              setIsMenuModalVisible(true);
            }} 
            style={styles.headerLeftButton}
          >
            <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>

          {/* 中央: タイトル (Indexと同じフォントスタイル) */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>体調グラフ</Text>
          </View>

          {/* 右: ダミー（バランス取り用） */}
          <View style={{ width: 44 }} /> 
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {renderTab('condition', '体調')}
          {renderTab('bp', 'バイタル')}
          {renderTab('weight', '体重')}
          {renderTab('sugar', '糖質管理')}
          {renderTab('temp', '体温')}
        </ScrollView>
      </View>

      <ScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 160 }}>
        {renderContent()}

        {!isPro && (
          <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#888', backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
              <MaterialCommunityIcons name="lock-clock" size={12} color="#888" />
              {' '}無料プランでは直近14日間のデータのみ表示されます
            </Text>
          </View>
        )}

        {!isPro && !IS_SCREENSHOT_MODE && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
             {/* 余白を開けてバナーを配置 */}
             <BannerAd
               unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-2778397933697000/2648055425'}
               size={BannerAdSize.MEDIUM_RECTANGLE}
               requestOptions={{
                 requestNonPersonalizedAdsOnly: true,
               }}
             />
          </View>
        )}
      </ScrollView>

      {!isPro && !IS_SCREENSHOT_MODE && (
        <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#eee',
            paddingBottom: Math.max(insets.bottom, 0)
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

      {/* メニューモーダル */}
      <Modal
        visible={isMenuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsMenuModalVisible(false)}
        >
          <View style={[styles.modalContent, { marginHorizontal: 20, width: 'auto' }]}>
            <Text style={styles.modalTitle}>メニュー</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setIsMenuModalVisible(false);
                if (router.canDismiss()) {
                  router.dismissAll();
                }
                router.replace({ pathname: '/', params: { mode: 'daily' } });
              }}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#333" style={{ marginRight: 10 }} />
              <Text style={styles.optionText}>日別リスト</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setIsMenuModalVisible(false);
                if (router.canDismiss()) {
                  router.dismissAll();
                }
                router.replace({ pathname: '/', params: { mode: 'calendar' } });
              }}
            >
              <MaterialCommunityIcons name="calendar-month" size={24} color="#333" style={{ marginRight: 10 }} />
              <Text style={styles.optionText}>カレンダー</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setIsMenuModalVisible(false)}
            >
               <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#007AFF" style={{ marginRight: 10 }} />
               <Text style={[styles.optionText, { fontWeight: 'bold', color: '#007AFF' }]}>体調グラフ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelButton]}
              onPress={() => setIsMenuModalVisible(false)}
            >
              <Text style={[styles.optionText, styles.cancelText]}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const EmptyView = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>記録データがありません</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  
  headerTitleContainer: {
    position: 'absolute',
    left: 50, 
    right: 50,
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1,
  },
  // 安全な自作ヘッダー
  safeHeader: {
    backgroundColor: '#F2F4F7', 
    width: '100%',
  },
  headerContent: {
    height: 44, // iOS/Expo標準のヘッダー高さ
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
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  tabContainer: { backgroundColor: '#fff', paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8 },
  tabButtonSelected: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextSelected: { color: '#fff', fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 16 },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 20, alignSelf: 'flex-start' },
  chartTitleSub: { fontSize: 12, fontWeight: 'normal', color: '#666' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#666' },
  noteText: { marginTop: 10, fontSize: 11, color: '#aaa' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16 },
  adContainer: { minHeight: 120, backgroundColor: '#333', marginTop: 20, marginBottom: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  adContent: { alignItems: 'center', justifyContent: 'center' },
  adText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  adSubText: { color: '#ccc', fontSize: 11, marginTop: 2 },
  adLabel: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fixedAdContainer: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' },
  fixedAdText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  fixedAdLabel: { position: 'absolute', right: 8, top: 8, color: '#aaa', fontSize: 9, borderWidth: 1, borderColor: '#666', paddingHorizontal: 4, borderRadius: 3 },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopRightRadius: 24, borderTopLeftRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  optionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', justifyContent: 'center' },
  optionText: { fontSize: 17, color: '#333' },
  cancelButton: { borderBottomWidth: 0, justifyContent: 'center', marginTop: 10 },
  cancelText: { color: '#FF3B30', fontWeight: '600' },
});