import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Button, Platform, Text, TouchableOpacity, View } from 'react-native';
import { commonStyles } from '../styles/common';
import { formatDate } from '../utils/shared';

// 日付選択行
export const DateSelectRow = ({ 
  date, 
  showPicker, 
  onPress, 
  onChange, 
  onClose 
}: {
  date: Date;
  showPicker: boolean;
  onPress: () => void;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  onClose: () => void;
}) => (
  <>
    <TouchableOpacity style={commonStyles.row} onPress={onPress}>
      <Text style={commonStyles.label}>日付</Text>
      <Text style={commonStyles.valueText}>{formatDate(date)}</Text>
    </TouchableOpacity>
    {Platform.OS === 'ios' && showPicker && (
      <View style={commonStyles.pickerHeader}>
        <Button title="完了" onPress={onClose} />
      </View>
    )}
    {showPicker && (
      <DateTimePicker
        value={date}
        mode="date"
        display="spinner"
        onChange={onChange}
        style={commonStyles.picker}
      />
    )}
  </>
);

// 時刻選択行
export const TimeSelectRow = ({ 
  time, 
  timeString, 
  showPicker, 
  onPress, 
  onChange, 
  onClose 
}: {
  time: Date;
  timeString: string;
  showPicker: boolean;
  onPress: () => void;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  onClose: () => void;
}) => (
  <>
    <TouchableOpacity style={commonStyles.row} onPress={onPress}>
      <Text style={commonStyles.label}>時刻</Text>
      <Text style={commonStyles.valueText}>{timeString}</Text>
    </TouchableOpacity>
    {Platform.OS === 'ios' && showPicker && (
      <View style={commonStyles.pickerHeader}>
        <Button title="完了" onPress={onClose} />
      </View>
    )}
    {showPicker && (
      <DateTimePicker
        value={time}
        mode="time"
        is24Hour={true}
        display="spinner"
        onChange={onChange}
        style={commonStyles.picker}
      />
    )}
  </>
);

// 保存・スヌーズボタンエリア
export const SaveArea = ({
  onSave,
  onSnooze,
  onSkip,
  isEditMode,
  isFromReservation,
  disabled = false,
  saveLabel = 'この内容で記録する',
}: {
  onSave: () => void;
  onSnooze: () => void;
  onSkip?: () => void;
  isEditMode: boolean;
  isFromReservation: boolean;
  disabled?: boolean;
  saveLabel?: string;
}) => {
  const label = isEditMode ? '変更内容を保存する' : saveLabel;
  return (
    <View style={commonStyles.buttonContainer}>
      {/* 保存ボタン */}
      <TouchableOpacity
        style={[
          commonStyles.saveButton,
          disabled && commonStyles.saveButtonDisabled,
        ]}
        onPress={onSave}
        disabled={disabled}
      >
        <Text style={commonStyles.saveButtonText}>{label}</Text>
      </TouchableOpacity>

      {/* 予約から来た時のサブアクションエリア */}
      {!isEditMode && isFromReservation && (
        <View style={commonStyles.subActionsContainer}>
          
          {/* スヌーズボタン */}
          <TouchableOpacity style={commonStyles.snoozeButton} onPress={onSnooze}>
            <Text style={commonStyles.snoozeText}>30分後に通知する</Text>
          </TouchableOpacity>

          {/* スキップボタン */}
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={commonStyles.skipButton}>
              <Text style={commonStyles.skipText}>
                今回は登録しない
              </Text>
            </TouchableOpacity>
          )}

        </View>
      )}
    </View>
  );
};