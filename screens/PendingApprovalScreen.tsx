/**
 * 等待审批界面
 * 当设备已注册但还未分配boutique时显示
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { logger } from '../utils/logger';
import { deviceStartupManager, DeviceStartupInfo, TerminalInfo } from '../utils/deviceStartupManager';

interface PendingApprovalScreenProps {
  terminalInfo?: TerminalInfo | null;
  deviceInfo?: DeviceStartupInfo | null;
}

export default function PendingApprovalScreen({ 
  terminalInfo: initialTerminalInfo, 
  deviceInfo: initialDeviceInfo 
}: PendingApprovalScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(initialTerminalInfo || null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceStartupInfo | null>(initialDeviceInfo || null);
  const [pulseAnim] = useState(new Animated.Value(0));

  // 脉冲动画
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // 检查审批状态
  const checkApprovalStatus = async () => {
    try {
      setRefreshing(true);
      logger.info('PendingApprovalScreen', '检查审批状态');
      
      const result = await deviceStartupManager.checkStartupState();
      
      if (result.state === 'approved') {
        logger.info('PendingApprovalScreen', '设备已审批通过，重新加载应用');
        // 设备已被审批，重新启动应用
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      } else if (result.state === 'pending_approval') {
        // 更新terminal信息
        setTerminalInfo(result.terminalInfo || null);
        setDeviceInfo(result.deviceInfo || null);
        logger.info('PendingApprovalScreen', '设备仍在等待审批');
      } else {
        logger.warn('PendingApprovalScreen', '意外的状态', result.state);
      }
    } catch (error) {
      logger.error('PendingApprovalScreen', '检查审批状态失败', String(error));
    } finally {
      setRefreshing(false);
    }
  };

  // 页面获得焦点时自动检查状态
  useFocusEffect(
    useCallback(() => {
      checkApprovalStatus();
    }, [])
  );

  // 自动刷新（每30秒）
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        checkApprovalStatus();
      }
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, [refreshing]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知时间';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '未知时间';
    }
  };

  const opacityInterpolate = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const scaleInterpolate = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={checkApprovalStatus} />
        }
      >
        {/* 头部 */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: opacityInterpolate,
                transform: [{ scale: scaleInterpolate }],
              },
            ]}
          >
            <Ionicons name="time-outline" size={80} color="#FF9500" />
          </Animated.View>
          <Text style={styles.title}>等待审批</Text>
          <Text style={styles.subtitle}>您的设备正在等待管理员审批</Text>
        </View>

        {/* 状态信息 */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusTitle}>审批状态</Text>
          </View>
          <Text style={styles.statusText}>
            您的设备已成功注册到系统，请耐心等待管理员审批。
            审批通过后，您将自动获得访问权限。
          </Text>
          <View style={styles.statusDetails}>
            <Text style={styles.detailText}>注册时间: {formatDate(terminalInfo?.id)}</Text>
            <Text style={styles.detailText}>设备ID: {deviceInfo?.androidId || '未知'}</Text>
          </View>
        </View>

        {/* 设备信息 */}
        <View style={styles.deviceCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="phone-portrait" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>设备信息</Text>
          </View>
          <View style={styles.deviceInfo}>
            <DeviceInfoRow 
              label="设备品牌" 
              value={terminalInfo?.brand || deviceInfo?.brand || '未知'} 
            />
            <DeviceInfoRow 
              label="设备型号" 
              value={terminalInfo?.modelName || deviceInfo?.modelName || '未知'} 
            />
            <DeviceInfoRow 
              label="操作系统" 
              value={`${deviceInfo?.osName || '未知'} ${deviceInfo?.osVersion || ''}`} 
            />
            <DeviceInfoRow 
              label="设备类型" 
              value={getDeviceTypeText(terminalInfo?.deviceType || deviceInfo?.deviceType)} 
            />
          </View>
        </View>

        {/* 帮助信息 */}
        <View style={styles.helpCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="help-circle" size={24} color="#34C759" />
            <Text style={styles.cardTitle}>审批说明</Text>
          </View>
          <View style={styles.helpContent}>
            <Text style={styles.helpText}>• 管理员会在工作时间内处理审批请求</Text>
            <Text style={styles.helpText}>• 审批通过后应用将自动更新状态</Text>
            <Text style={styles.helpText}>• 您可以下拉刷新检查最新状态</Text>
            <Text style={styles.helpText}>• 如有紧急需求，请联系系统管理员</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkApprovalStatus}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color="#007AFF" 
              style={refreshing ? { opacity: 0.5 } : {}}
            />
            <Text style={[styles.refreshButtonText, refreshing ? { opacity: 0.5 } : {}]}>
              {refreshing ? '检查中...' : '检查状态'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface DeviceInfoRowProps {
  label: string;
  value: string;
}

const DeviceInfoRow: React.FC<DeviceInfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const getDeviceTypeText = (deviceType: any): string => {
  if (!deviceType) return '未知';
  
  switch (deviceType) {
    case 1:
    case 'PHONE':
    case 'phone':
      return '手机';
    case 2:
    case 'TABLET':
    case 'tablet':
      return '平板';
    case 3:
    case 'DESKTOP':
    case 'desktop':
      return '桌面设备';
    case 4:
    case 'TV':
    case 'tv':
      return '电视';
    default:
      return '未知设备';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  deviceInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
  },
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpContent: {
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
});