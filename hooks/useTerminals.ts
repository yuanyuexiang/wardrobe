import { useEffect, useState } from 'react';
import {
  useGetCurrentUserTerminalsQuery,
  useGetTerminalByAndroidIdLazyQuery,
  useCreateOrUpdateTerminalMutation,
  useUpdateTerminalMutation,
} from '../generated/graphql';
import { DeviceInfoData } from '../components/DeviceInfo';
import { logger } from '../utils/logger';

export interface TerminalDevice {
  id?: string;
  androidId?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  modelName?: string | null;
  deviceType?: string | null;
  deviceName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  supportedCpuArchitectures?: string | null;
  totalMemory?: string | null;
  dateCreated?: string;
  dateUpdated?: string;
}

interface UseTerminalsResult {
  terminals: TerminalDevice[];
  currentTerminal: TerminalDevice | null;
  loading: boolean;
  error: string | null;
  syncDeviceInfo: (deviceInfo: DeviceInfoData, userId: string) => Promise<void>;
  refetchTerminals: () => void;
}

export const useTerminals = (userId?: string): UseTerminalsResult => {
  const [terminals, setTerminals] = useState<TerminalDevice[]>([]);
  const [currentTerminal, setCurrentTerminal] = useState<TerminalDevice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // GraphQL hooks
  const {
    data: terminalsData,
    loading: terminalsLoading,
    error: terminalsError,
    refetch: refetchTerminals,
  } = useGetCurrentUserTerminalsQuery({
    variables: { userId: userId || '' },
    skip: !userId,
  });

  const [getTerminalByAndroidId, { data: terminalByAndroidIdData }] = 
    useGetTerminalByAndroidIdLazyQuery();

  const [createOrUpdateTerminal] = useCreateOrUpdateTerminalMutation();
  const [updateTerminal] = useUpdateTerminalMutation();

  // 更新terminals状态
  useEffect(() => {
    if (terminalsData?.terminals) {
      const mappedTerminals: TerminalDevice[] = terminalsData.terminals.map(terminal => ({
        id: terminal.id,
        androidId: terminal.android_id,
        brand: terminal.brand,
        manufacturer: terminal.manufacturer,
        modelName: terminal.model_name,
        deviceType: terminal.device_type,
        deviceName: terminal.device_name,
        osName: terminal.os_name,
        osVersion: terminal.os_version,
        supportedCpuArchitectures: terminal.supported_cpu_architectures,
        totalMemory: terminal.total_memory,
        dateCreated: terminal.date_created,
        dateUpdated: terminal.date_updated,
      }));
      
      setTerminals(mappedTerminals);
      logger.info('useTerminals', `已加载 ${mappedTerminals.length} 个终端设备`);
    }
  }, [terminalsData]);

  // 处理错误
  useEffect(() => {
    if (terminalsError) {
      const errorMessage = `加载终端设备失败: ${terminalsError.message}`;
      setError(errorMessage);
      logger.error(errorMessage, String(terminalsError));
    } else {
      setError(null);
    }
  }, [terminalsError]);

  // 同步设备信息到服务器
  const syncDeviceInfo = async (deviceInfo: DeviceInfoData, userId: string) => {
    try {
      setError(null);
      logger.info('useTerminals', '开始同步设备信息到服务器...');

      // 如果有Android ID，先查询是否存在
      let existingTerminal = null;
      if (deviceInfo.androidId) {
        const result = await getTerminalByAndroidId({
          variables: { androidId: deviceInfo.androidId }
        });
        existingTerminal = result.data?.terminals?.[0];
      }

      const terminalData = {
        android_id: deviceInfo.androidId,
        brand: deviceInfo.brand,
        manufacturer: deviceInfo.manufacturer,
        model_name: deviceInfo.modelName,
        device_type: getDeviceTypeString(deviceInfo.deviceType),
        device_name: `${deviceInfo.brand || ''} ${deviceInfo.modelName || ''}`.trim() || null,
        os_name: deviceInfo.osName,
        os_version: deviceInfo.osVersion,
        total_memory: deviceInfo.totalMemory?.toString(),
        authorized_user: { id: userId },
      };

      if (existingTerminal) {
        // 更新现有设备
        logger.info('useTerminals', `更新现有终端设备: ${existingTerminal.id}`);
        const updateResult = await updateTerminal({
          variables: {
            id: existingTerminal.id,
            data: terminalData,
          },
        });

        if (updateResult.data?.update_terminals_item) {
          const updatedTerminal = updateResult.data.update_terminals_item;
          setCurrentTerminal({
            id: updatedTerminal.id,
            androidId: updatedTerminal.android_id,
            brand: updatedTerminal.brand,
            manufacturer: updatedTerminal.manufacturer,
            modelName: updatedTerminal.model_name,
            deviceType: updatedTerminal.device_type,
            deviceName: updatedTerminal.device_name,
            osName: updatedTerminal.os_name,
            osVersion: updatedTerminal.os_version,
            totalMemory: updatedTerminal.total_memory,
            dateUpdated: updatedTerminal.date_updated,
          });
        }
      } else {
        // 创建新设备
        logger.info('useTerminals', '创建新终端设备');
        const createResult = await createOrUpdateTerminal({
          variables: {
            data: terminalData,
          },
        });

        if (createResult.data?.create_terminals_item) {
          const newTerminal = createResult.data.create_terminals_item;
          setCurrentTerminal({
            id: newTerminal.id,
            androidId: newTerminal.android_id,
            brand: newTerminal.brand,
            manufacturer: newTerminal.manufacturer,
            modelName: newTerminal.model_name,
            deviceType: newTerminal.device_type,
            deviceName: newTerminal.device_name,
            osName: newTerminal.os_name,
            osVersion: newTerminal.os_version,
            totalMemory: newTerminal.total_memory,
            dateCreated: newTerminal.date_created,
            dateUpdated: newTerminal.date_updated,
          });
        }
      }

      // 刷新终端列表
      refetchTerminals();
      logger.info('useTerminals', '设备信息同步成功');
    } catch (err) {
      const errorMessage = `同步设备信息失败: ${err}`;
      setError(errorMessage);
      logger.error(errorMessage, String(err));
      throw err;
    }
  };

  const getDeviceTypeString = (deviceType: any): string | null => {
    if (!deviceType) return null;
    
    // 将Device.DeviceType转换为字符串
    switch (deviceType) {
      case 1:
      case 'PHONE':
        return 'phone';
      case 2:
      case 'TABLET':
        return 'tablet';
      case 3:
      case 'DESKTOP':
        return 'desktop';
      case 4:
      case 'TV':
        return 'tv';
      default:
        return 'unknown';
    }
  };

  return {
    terminals,
    currentTerminal,
    loading: terminalsLoading,
    error,
    syncDeviceInfo,
    refetchTerminals,
  };
};

export default useTerminals;