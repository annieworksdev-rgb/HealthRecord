import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  screenContainer: {
    backgroundColor: '#fff',
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 17,
    color: '#000',
  },
  valueText: {
    fontSize: 17,
    color: '#555',
  },
  inputRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  textInput: {
    fontSize: 17,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
  },
  notesContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notesInput: {
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    height: 100,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  notesInputSimple: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    height: 100,
    backgroundColor: '#fff',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  subActionsContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 16, // ボタン間のスペース
  },
  snoozeButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
  },
  snoozeText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  skipButton: {
    padding: 8,
    alignItems: 'center',
  },
  skipText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  picker: {
    width: '100%',
    backgroundColor: '#fff',
  },
  adContainer: {
    width: '100%',
    height: 60, // 一般的なバナーの高さ
    backgroundColor: '#f0f0f0', // 仮のグレー背景（広告が入れば隠れます）
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  adPlaceholderText: {
    color: '#888',
    fontSize: 12,
  },
});

export const pickerSelectStyles = {
  inputIOS: {
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: 'black',
    textAlign: 'center' as 'center',
  },
  inputAndroid: {
    fontSize: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: 'black',
    textAlign: 'center' as 'center',
  },
  viewContainer: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    marginBottom: 20,
  },
};

// 一覧画面（index.tsx）用のスタイル
export const indexStyles = StyleSheet.create({
  container: { flex: 1 },
  pagerView: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666' },
  emptyDateText: { marginTop: 8, fontSize: 14, color: '#888' },
  itemBase: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16, // 少し広げてタップしやすく
    // borderBottomWidth: 1, // ★削除: カード化するため不要
    // borderBottomColor: '#f0f0f0', // ★削除
  },
  // 色味を少し今風（パステル調）に調整
  bgHealth: { backgroundColor: '#FFF5F7' }, // 薄いピンク
  bgMedication: { backgroundColor: '#F0F9FF' }, // 薄いブルー
  bgVisit: { backgroundColor: '#FFFAF0' }, // 薄いオレンジ/クリーム
  bgMeasurement: { backgroundColor: '#F2FCF5' }, // 薄いグリーン
  bgAlarm: { backgroundColor: '#FFFFFF' }, // 白
  itemContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  itemTypeLabel: { fontSize: 14, color: '#666', marginRight: 8, fontWeight: '600' },
  itemTime: { fontSize: 20, fontWeight: 'bold', color: '#333' }, // 少しサイズ調整
  itemRating: { fontSize: 14, color: '#888', marginLeft: 8 },
  itemDetails: { fontSize: 14, color: '#555', flex: 1, marginLeft: 12 },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30', // iOS Red
    borderRadius: 16, // 丸くする
  },
  deleteButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  addButton: {
    position: 'absolute',
    right: 30,
    backgroundColor: 'blue',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    elevation: 5,
    zIndex: 10,
  },
  addButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});