import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// RevenueCatのAPIキー
const API_KEY = 'goog_paKHUmUbbhcSGoBEqKyqUsdIAJv';

type PurchaseContextType = {
  isPro: boolean;           
  packages: PurchasesPackage[]; 
  purchase: (pack: PurchasesPackage) => Promise<void>; 
  restore: () => Promise<void>; 
  isLoading: boolean;
  toggleProStatusDebug: () => void; // ★ これが必要です
};

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 本来の課金状態（RevenueCatから取得）
  const [originalIsPro, setOriginalIsPro] = useState(false);
  // ★ 強制的に無料モードにするフラグ
  const [isForceFreeMode, setIsForceFreeMode] = useState(false);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ★ 外部に公開する「isPro」は、強制モードがONなら嘘（false）をつく
  const isPro = isForceFreeMode ? false : originalIsPro;

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
    
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const updateProStatus = (info: CustomerInfo) => {
    const isActive = info.entitlements.active['pro'] !== undefined;
    setOriginalIsPro(isActive); // ★ 本来の状態として保存
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

  // ★ 強制無料モードの切り替えスイッチ
  const toggleProStatusDebug = () => {
    setIsForceFreeMode(prev => !prev);
  };

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