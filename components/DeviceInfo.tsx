import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { logger } from '../utils/logger';

export interface DeviceInfoData {
  brand?: string | null;
  manufacturer?: string | null;
  modelName?: string | null;
  androidId?: string | null;
  deviceType?: Device.DeviceType | null;
  osName?: string | null;
  osVersion?: string | null;
  totalMemory?: number | null;
}

interface DeviceInfoProps {
  onDeviceInfoReady?: (deviceInfo: DeviceInfoData) => void;
  showDetails?: boolean;
}

const DeviceInfo: React.FC<DeviceInfoProps> = ({ 
  onDeviceInfoReady, 
  showDetails = true 
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasNotified = useRef(false);  // 添加标记防止重复通知

  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const deviceData: DeviceInfoData = {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          deviceType: Device.deviceType,
          osName: Device.osName,
          osVersion: Device.osVersion,
          totalMemory: Device.totalMemory,
        };

        // 获取Android ID (仅Android平台)
        try {
          if (Device.osName === 'Android') {
            deviceData.androidId = await Application.getAndroidId();
          }
        } catch (androidIdError) {
          logger.warn('无法获取Android ID:', String(androidIdError));
          deviceData.androidId = null;
        }

        logger.info('设备信息获取成功:', JSON.stringify(deviceData));
        setDeviceInfo(deviceData);
        
        // 只在第一次获取成功时通知父组件
        if (onDeviceInfoReady && !hasNotified.current) {
          hasNotified.current = true;
          onDeviceInfoReady(deviceData);
        }
      } catch (err) {
        const errorMessage = '获取设备信息失败';
        logger.error(errorMessage, String(err));
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    getDeviceInfo();
  }, []); // 移除onDeviceInfoReady依赖，只在组件挂载时执行一次

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>正在获取设备信息...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!showDetails) {
    return null;
  }

  const getDeviceTypeText = (type: Device.DeviceType | null) => {
    if (type === null) return '未知';
    switch (type) {
      case Device.DeviceType.PHONE:
        return '手机';
      case Device.DeviceType.TABLET:
        return '平板';
      case Device.DeviceType.DESKTOP:
        return '桌面';
      case Device.DeviceType.TV:
        return '电视';
      default:
        return '未知';
    }
  };

  const formatMemory = (bytes: number | null) => {
    if (!bytes) return '未知';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>设备信息</Text>
      <View style={styles.infoContainer}>
        <DeviceInfoRow label="品牌" value={deviceInfo.brand || '未知'} />
        <DeviceInfoRow label="制造商" value={deviceInfo.manufacturer || '未知'} />
        <DeviceInfoRow label="型号" value={deviceInfo.modelName || '未知'} />
        <DeviceInfoRow label="设备类型" value={getDeviceTypeText(deviceInfo.deviceType ?? null)} />
        <DeviceInfoRow label="操作系统" value={`${deviceInfo.osName || '未知'} ${deviceInfo.osVersion || ''}`} />
        <DeviceInfoRow label="总内存" value={formatMemory(deviceInfo.totalMemory ?? null)} />
        {deviceInfo.androidId && (
          <DeviceInfoRow label="Android ID" value={deviceInfo.androidId} />
        )}
      </View>
    </View>
  );
};

interface DeviceInfoRowProps {
  label: string;
  value: string;
}

const DeviceInfoRow: React.FC<DeviceInfoRowProps> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    margin: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoContainer: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
});

export default DeviceInfo;