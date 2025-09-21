import { useState, useEffect } from 'react';
import { useGetBoutiquesQuery } from '../generated/graphql';
import { deviceStartupManager } from '../utils/deviceStartupManager';
import { logger } from '../utils/logger';

// 全局商家信息缓存
let globalBoutiqueInfo: {
  boutiqueId: string;
  boutique: any;
  loading: boolean;
  error: any;
} | null = null;

let globalListeners: Array<(info: typeof globalBoutiqueInfo) => void> = [];

export const useBoutiqueInfo = () => {
  const [boutiqueInfo, setBoutiqueInfo] = useState(globalBoutiqueInfo);

  // GraphQL 查询 - 只在需要时执行
  const { data, loading, error } = useGetBoutiquesQuery({
    variables: { 
      filter: { id: { _eq: globalBoutiqueInfo?.boutiqueId || '' } },
      limit: 1
    },
    skip: !globalBoutiqueInfo?.boutiqueId
  });

  // 初始化商家ID
  useEffect(() => {
    if (!globalBoutiqueInfo) {
      const loadBoutiqueInfo = async () => {
        try {
          const startupInfo = await deviceStartupManager.checkStartupState();
          if (startupInfo.state === 'approved' && startupInfo.terminalInfo?.authorized_boutique) {
            const boutiqueId = startupInfo.terminalInfo.authorized_boutique.id;
            
            globalBoutiqueInfo = {
              boutiqueId,
              boutique: null,
              loading: true,
              error: null
            };
            
            // 通知所有监听器
            globalListeners.forEach(listener => listener(globalBoutiqueInfo));
          }
        } catch (error) {
          logger.error('useBoutiqueInfo', '获取店铺信息失败', error);
          globalBoutiqueInfo = {
            boutiqueId: '',
            boutique: null,
            loading: false,
            error: error
          };
          globalListeners.forEach(listener => listener(globalBoutiqueInfo));
        }
      };
      
      loadBoutiqueInfo();
    }
  }, []);

  // 更新商家数据
  useEffect(() => {
    if (globalBoutiqueInfo && data?.boutiques?.[0]) {
      globalBoutiqueInfo = {
        ...globalBoutiqueInfo,
        boutique: data.boutiques[0],
        loading: false,
        error: null
      };
      globalListeners.forEach(listener => listener(globalBoutiqueInfo));
    }
  }, [data]);

  // 更新加载状态
  useEffect(() => {
    if (globalBoutiqueInfo) {
      globalBoutiqueInfo = {
        ...globalBoutiqueInfo,
        loading,
        error
      };
      globalListeners.forEach(listener => listener(globalBoutiqueInfo));
    }
  }, [loading, error]);

  // 注册监听器
  useEffect(() => {
    const listener = (info: typeof globalBoutiqueInfo) => {
      setBoutiqueInfo(info);
    };
    
    globalListeners.push(listener);
    
    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  return {
    boutiqueId: boutiqueInfo?.boutiqueId || '',
    boutique: boutiqueInfo?.boutique || null,
    loading: boutiqueInfo?.loading || false,
    error: boutiqueInfo?.error || null
  };
};