import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { indexStyles } from '../styles/common';
import { Alarm, BloodPressureLog, BloodSugarLog, HealthLog, MedicationLog, TemperatureLog, TimeFormat, VisitLog, WeightLog } from '../types/types';
import { CONDITION_ICONS, formatTime } from '../utils/shared';

// 共通のアイテムラッパー
const ItemWrapper = ({
  onPress,
  onDelete,
  bgStyle,
  iconName,
  iconColor,
  label,
  time,
  timeFormat,
  children, // アイコンなど
  details,
  detailsLines = 1,
}: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <View style={[indexStyles.itemBase, bgStyle]}>
      <View style={indexStyles.itemContent}>
        {/* 左側のアイコンエリア */}
        <View style={{ marginRight: 12, alignItems: 'center', width: 40 }}>
            <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
            {/* ★修正: ラベル文字サイズを少し調整 */}
            <Text style={{ fontSize: 9, color: iconColor, marginTop: 2, fontWeight: 'bold' }}>{label}</Text>
        </View>
        
        {/* メインエリア */}
        <View style={{ flex: 1 }}>
            <Text style={indexStyles.itemTime}>{formatTime(time, timeFormat)}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {children}

                {details ? (
                  <Text style={indexStyles.itemDetails} numberOfLines={detailsLines}>
                    {details}
                  </Text>
                ) : null}
            </View>
        </View>
      </View>
      
      {/* 削除ボタン */}
      <TouchableOpacity onPress={onDelete} style={indexStyles.deleteButton}>
        <Text style={indexStyles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

export const HealthLogItem = ({ log, timeFormat, onDelete }: { log: HealthLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  // ★修正: 症状 → メモ/タグ
  const symptomsPreview = log.symptoms.length > 0 ? log.symptoms.slice(0, 3).join(', ') + (log.symptoms.length > 3 ? ' ...' : '') : '';
  const contentText = log.notes ? `📝 ${log.notes} ${symptomsPreview}` : symptomsPreview || '記録あり';
  const conditionIcon = CONDITION_ICONS.find((c) => c.value === log.conditionRating);

  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/health-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgHealth}
      iconName="emoticon-happy-outline"
      iconColor="#e91e63"
      label="体調"
      time={log.time}
      timeFormat={timeFormat}
      details={contentText}
    >
      {conditionIcon && (
        <MaterialCommunityIcons name={conditionIcon.icon as any} size={20} color={conditionIcon.color} style={{ marginRight: 6 }} />
      )}
    </ItemWrapper>
  );
};

export const MedicationLogItem = ({ log, timeFormat, onDelete }: { log: MedicationLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  const nameDisplay = log.notes ? `📝 ${log.name}` : log.name;
  const details = `${nameDisplay} (${log.amount}${log.unit})`;
  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/medication-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgMedication}
      iconName="pill"
      iconColor="#2196f3"
      label="サプリ" /* ★修正: 服薬 → サプリ */
      time={log.time}
      timeFormat={timeFormat}
      details={details}
    />
  );
};

export const VisitLogItem = ({ log, timeFormat, onDelete }: { log: VisitLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  // ★修正: 投薬 → アイテム
  const medicationText = log.hasMedication ? 'アイテム:あり' : '';
  // ★修正: 病院 → 施設
  const hospitalDisplay = log.hospitalName || '施設名なし';
  const hasImages = log.imageUris && log.imageUris.length > 0;
  
  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/visit-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgVisit}
      iconName="office-building-marker" /* ★修正: 病院アイコンを変更 */
      iconColor="#d84315"
      label="メンテ" /* ★修正: 通院 → メンテ */
      time={log.time}
      timeFormat={timeFormat}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[indexStyles.itemDetails, { flexShrink: 1, marginRight: 8 }]} numberOfLines={1}>
          {hospitalDisplay}
        </Text>
        {medicationText ? (
          <Text style={{ fontSize: 10, color: '#666', marginRight: 6, backgroundColor:'#eee', paddingHorizontal:4, borderRadius:4 }}>
            {medicationText}
          </Text>
        ) : null}
        {hasImages && (
          <Ionicons name="image" size={16} color="#007AFF" />
        )}
      </View>
    </ItemWrapper>
  );
};

export const BloodPressureLogItem = ({ log, timeFormat, onDelete }: { log: BloodPressureLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  const bp = log.systolic && log.diastolic ? `BP: ${log.systolic}/${log.diastolic}` : '';
  const hr = log.restingHeartRate ? `HR: ${log.restingHeartRate}` : '';
  let detailsText = '';
  if (bp && hr) detailsText = `${bp}  ${hr}`;
  else if (bp) detailsText = bp;
  else if (hr) detailsText = hr;
  
  if (log.notes) detailsText += `  📝`;

  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/blood-pressure-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgMeasurement}
      iconName="heart-pulse"
      iconColor="#4caf50"
      label="バイタル" /* ★修正: 血圧 → バイタル */
      time={log.time}
      timeFormat={timeFormat}
      details={detailsText || '記録あり'}
    />
  );
};

export const WeightLogItem = ({ log, timeFormat, onDelete }: { log: WeightLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  let details = `${log.weight} kg`;
  if (log.notes) details += `  📝`;
  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/weight-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgMeasurement}
      iconName="scale-bathroom"
      iconColor="#4caf50"
      label="体重"
      time={log.time}
      timeFormat={timeFormat}
      details={details}
    />
  );
};

export const BloodSugarLogItem = ({ log, timeFormat, onDelete }: { log: BloodSugarLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  const timingLabel = log.timing === 'before' ? '食前' : log.timing === 'after' ? '食後' : '他';
  let details = `${timingLabel}: ${log.value}`;
  if (log.notes) details += `  📝`;
  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/blood-sugar-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgMeasurement}
      iconName="water"
      iconColor="#4caf50"
      label="糖質" /* ★修正: 血糖 → 糖質 */
      time={log.time}
      timeFormat={timeFormat}
      details={details}
    />
  );
};

export const TemperatureLogItem = ({ log, timeFormat, onDelete }: { log: TemperatureLog; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  let details = `${log.value} ℃`;
  if (log.notes) details += `  📝`;
  return (
    <ItemWrapper
      onPress={() => router.push({ pathname: '/temperature-log', params: { id: log.id } })}
      onDelete={() => onDelete(log.id)}
      bgStyle={indexStyles.bgMeasurement}
      iconName="thermometer"
      iconColor="#4caf50"
      label="体温"
      time={log.time}
      timeFormat={timeFormat}
      details={details}
    />
  );
};

export const AlarmItem = ({ alarm, timeFormat, onDelete }: { alarm: Alarm; timeFormat: TimeFormat; onDelete: (id: string) => void }) => {
  // ★修正: アラームのタイトルも加工して表示
  let label = alarm.title || '予約';
  if (label.includes('服薬')) label = label.replace('服薬', 'サプリ');
  if (label.includes('通院')) label = label.replace('通院', 'メンテ');

  const info = alarm.medicationName
    ? `${alarm.medicationName} (${alarm.medicationAmount}${alarm.medicationUnit})`
    : alarm.detail || '';

  const isWeekly = alarm.days && alarm.days.length > 0;
  
  const getTargetScreen = (title?: string) => {
    if (!title) return null;
    if (title.includes('体調')) return '/health-log';
    if (title.includes('サプリ') || title.includes('服薬')) return '/medication-log';
    if (title.includes('メンテ') || title.includes('通院')) return '/visit-log';
    if (title.includes('バイタル') || title.includes('BP') || title.includes('血圧')) return '/blood-pressure-log';
    if (title.includes('体重')) return '/weight-log';
    if (title.includes('糖質') || title.includes('血糖')) return '/blood-sugar-log';
    if (title.includes('体温')) return '/temperature-log';
    return null;
  };

  const handlePress = () => {
    const target = getTargetScreen(alarm.title);
    if (target) {
      if (target === '/medication-log') {
        router.push({
          pathname: target,
          params: {
            prefillName: alarm.medicationName,
            prefillAmount: alarm.medicationAmount,
            prefillUnit: alarm.medicationUnit,
            fromReservation: 'true',
            alarmId: alarm.id,
          },
        });
      } else if (target === '/visit-log') {
        router.push({
          pathname: target,
          params: { prefillHospitalName: alarm.detail, fromReservation: 'true', alarmId: alarm.id, },
        });
      } else {
        router.push({
          pathname: target as any,
          params: { prefillNotes: alarm.detail, fromReservation: 'true', alarmId: alarm.id, },
        });
      }
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: '/reservation-settings',
      params: { id: alarm.id, label: alarm.title },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View style={[indexStyles.itemBase, indexStyles.bgAlarm]}>
        <View style={indexStyles.itemContent}>
          <View style={{ marginRight: 12, alignItems: 'center', width: 40 }}>
            <MaterialCommunityIcons name={isWeekly ? "calendar-sync" : "calendar-clock"} size={24} color="#666" />
            <Text style={{ fontSize: 9, color: "#666", marginTop: 2, fontWeight: 'bold' }}>予約</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={indexStyles.itemTime}>{formatTime(alarm.time, timeFormat)}</Text>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
                <Text style={[indexStyles.itemDetails, {fontWeight:'bold', marginRight:8}]} numberOfLines={1}>{label}</Text>
                <Text style={indexStyles.itemDetails} numberOfLines={1}>{info}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleEdit} style={[indexStyles.deleteButton, { backgroundColor: '#007AFF', marginRight: 8 }]}>
          <Ionicons name="create-outline" size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(alarm.id)} style={indexStyles.deleteButton}>
          <Text style={indexStyles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};