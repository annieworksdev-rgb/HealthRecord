// app/ad-interstitial.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdInterstitialScreen() {
  const [timeLeft, setTimeLeft] = useState(5); // 5秒カウントダウン

  useEffect(() => {
    // 1秒ごとにカウントダウン
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 閉じる処理
  const handleClose = () => {
    // 履歴をリセットしてトップに戻るのが理想だが、
    // ここではシンプルに「全て閉じてトップへ」戻る
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="videocam" size={80} color="white" />
        <Text style={styles.title}>広告動画 再生中...</Text>
        <Text style={styles.timer}>{timeLeft} 秒</Text>
        
        {/* ダミーの広告コンテンツ */}
        <View style={styles.dummyAd}>
            <Text style={styles.dummyText}>ここで素敵なCMが流れています</Text>
        </View>
      </View>

      {/* 閉じるボタン (カウントダウン終了後に押しやすくする、あるいは常時表示でもOK) */}
      <TouchableOpacity 
        style={[styles.closeButton, timeLeft > 0 && styles.disabledButton]} 
        onPress={handleClose}
        disabled={timeLeft > 0} // 0になるまで押せない仕様にする場合
      >
        <Text style={styles.closeText}>
            {timeLeft > 0 ? `あと ${timeLeft}秒` : '閉じる'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // 全画面黒
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  timer: {
    color: '#FFD700', // 金色
    fontSize: 40,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  dummyAd: {
    width: '100%',
    height: 200,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 40,
  },
  dummyText: {
    color: '#aaa',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  closeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});