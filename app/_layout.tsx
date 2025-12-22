// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import Toast from 'react-native-toast-message';
import { AlarmProvider } from '../context/AlarmContext';
import { HealthLogProvider } from '../context/HealthLogContext';
import { MeasurementLogProvider } from '../context/MeasurementLogContext';
import { MedicationLogProvider } from '../context/MedicationLogContext';
import { PurchaseProvider } from '../context/PurchaseContext';

export default function RootLayout() {
  return (
    <PurchaseProvider>
      <HealthLogProvider>
        <AlarmProvider>
          <MedicationLogProvider>
            <MeasurementLogProvider>
              <StatusBar style="auto" />
              <Stack>
                <Stack.Screen name="index" />

                <Stack.Screen name="health-log" options={{ presentation: 'modal', title: '体調記録' }} />
                <Stack.Screen name="medication-log" options={{ presentation: 'modal', title: '服薬記録' }} />
                <Stack.Screen name="visit-log" options={{ presentation: 'modal', title: '通院記録' }} />
                <Stack.Screen name="blood-pressure-log" options={{ presentation: 'modal', title: '血圧記録' }} />
                <Stack.Screen name="weight-log" options={{ presentation: 'modal', title: '体重記録' }} />
                <Stack.Screen name="blood-sugar-log" options={{ presentation: 'modal', title: '血糖値記録' }} />
                <Stack.Screen name="temperature-log" options={{ presentation: 'modal', title: '体温記録' }} />
                <Stack.Screen name="reservation-settings" options={{ presentation: 'modal', title: '予約設定' }} />

                <Stack.Screen name="graph" options={{ presentation: 'modal', title: '体調グラフ' }} />

                <Stack.Screen name="modal" options={{ presentation: 'modal', title: '設定' }} />
                <Stack.Screen 
                  name="ad-interstitial" 
                  options={{ 
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    gestureEnabled: false,
                  }} 
                />
              </Stack>
              <Toast />
            </MeasurementLogProvider>
          </MedicationLogProvider>
        </AlarmProvider>
      </HealthLogProvider>
    </PurchaseProvider>
  );
}