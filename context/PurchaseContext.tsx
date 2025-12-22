// app/context/PurchaseContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// RevenueCatのAPIキー（後で取得して書き換えます。今はダミーでOK）
const API_KEY = 'goog_paKHUmUbbhcSGoBEqKyqUsdIAJv';

type PurchaseContextType = {
  isPro: boolean;           // 有料会員かどうか
  packages: PurchasesPackage[]; // 購入可能なプラン一覧
  purchase: (pack: PurchasesPackage) => Promise<void>; // 購入処理
  restore: () => Promise<void>; // 復元処理
  isLoading: boolean;
  // ★開発用：強制的にステータスを切り替える関数
  toggleProStatusDebug: () => void; 
};

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await Purchases.configure({ apiKey: API_KEY });
        const customerInfo = await Purchases.getCustomerInfo();
        updateProStatus(customerInfo);

        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error("Purchase Init Error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const listener = (info: CustomerInfo) => updateProStatus(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    
    // ★ここを修正しました
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const updateProStatus = (info: CustomerInfo) => {
    // Entitlement ID が "pro" になっているか確認
    const isActive = info.entitlements.active['pro'] !== undefined;
    setIsPro(isActive);
  };

  const purchase = async (pack: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      updateProStatus(customerInfo);
      Alert.alert("成功", "ご購入ありがとうございました！");
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert("エラー", e.message);
    }
  };

  const restore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      updateProStatus(customerInfo);
      Alert.alert("完了", "購入情報を復元しました");
    } catch (e: any) {
      Alert.alert("エラー", e.message);
    }
  };

  // 開発中の確認用
  const toggleProStatusDebug = () => setIsPro(prev => !prev);

  return (
    <PurchaseContext.Provider value={{ isPro, packages, purchase, restore, isLoading, toggleProStatusDebug }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const context = useContext(PurchaseContext);
  if (!context) throw new Error('usePurchase must be used within a PurchaseProvider');
  return context;
};