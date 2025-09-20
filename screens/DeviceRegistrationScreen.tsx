/**
 * 设备注册界面
 * 用于首次使用时注册设备信息
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { deviceStartupManager, DeviceStartupInfo } from '../utils/deviceStartupManager';
import DeviceInfo from '../components/DeviceInfo';

interface DeviceRegistrationScreenProps {
  deviceInfo?: DeviceStartupInfo | null;
}

export default function DeviceRegistrationScreen({ deviceInfo: initialDeviceInfo }: DeviceRegistrationScreenProps) {
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceStartupInfo>(initialDeviceInfo || {});
  const [deviceInfoReady, setDeviceInfoReady] = useState(false);

  const handleDeviceInfoReady = (info: DeviceStartupInfo) => {
    setDeviceInfo(info);
    setDeviceInfoReady(true);
    logger.info('DeviceRegistrationScreen', '设备信息就绪', JSON.stringify(info));
  };

  const handleRegisterDevice = async () => {
    if (!deviceInfoReady) {
      Alert.alert('提示', '设备信息还未准备就绪，请稍候');
      return;
    }

    if (!deviceInfo.androidId) {
      Alert.alert('错误', '无法获取设备标识符，请重新启动应用');
      return;
    }

    try {
      setLoading(true);
      logger.info('DeviceRegistrationScreen', '开始注册设备');
      
      await deviceStartupManager.registerDevice();
      
      Alert.alert(
        '注册成功',
        '设备已成功注册，请等待管理员审批。审批通过后您将能够正常使用应用。',
        [
          {
            text: '确定',
            onPress: () => {
              // 重新检查启动状态，应该会转到pending_approval状态
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            }
          }
        ]
      );
    } catch (error) {
      logger.error('DeviceRegistrationScreen', '设备注册失败', String(error));
      Alert.alert(
        '注册失败',
        '设备注册过程中出现错误，请检查网络连接或联系管理员。\n\n' + String(error),
        [
          { text: '重试', onPress: handleRegisterDevice },
          { text: '取消', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <Ionicons name="phone-portrait-outline" size={80} color="#007AFF" />
          <Text style={styles.title}>设备注册</Text>
          <Text style={styles.subtitle}>首次使用需要注册您的设备</Text>
        </View>

        {/* 设备信息 */}
        <View style={styles.content}>
          <DeviceInfo 
            onDeviceInfoReady={handleDeviceInfoReady}
            showDetails={true}
          />

          {deviceInfoReady && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <Text style={styles.infoTitle}>注册须知</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoText}>• 设备注册后需要管理员审批</Text>
                <Text style={styles.infoText}>• 审批通过前您无法使用应用功能</Text>
                <Text style={styles.infoText}>• 请确保设备信息准确无误</Text>
                <Text style={styles.infoText}>• 如有问题请联系系统管理员</Text>
              </View>
            </View>
          )}
        </View>

        {/* 注册按钮 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.registerButton,
              (!deviceInfoReady || loading) && styles.disabledButton
            ]}
            onPress={handleRegisterDevice}
            disabled={!deviceInfoReady || loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>注册中...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>注册设备</Text>
              </>
            )}
          </TouchableOpacity>
          
          {!deviceInfoReady && (
            <Text style={styles.waitingText}>正在获取设备信息，请稍候...</Text>
          )}
        </View>

        {/* 帮助信息 */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>需要帮助？</Text>
          <Text style={styles.helpText}>如果您遇到任何问题，请联系系统管理员或技术支持团队。</Text>
          <Text style={styles.helpText}>设备ID: {deviceInfo.androidId || '获取中...'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  infoContent: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  waitingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  helpContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
});