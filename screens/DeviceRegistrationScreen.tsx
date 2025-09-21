/**
 * 设备注册界面
 * 用于首次使用时注册设备信息
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { logger } from '../utils/logger';
import { deviceStartupManager, DeviceStartupInfo } from '../utils/deviceStartupManager';
import DeviceInfo from '../components/DeviceInfo';

interface DeviceRegistrationScreenProps {
  deviceInfo?: DeviceStartupInfo | null;
}

export default function DeviceRegistrationScreen() {
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceStartupInfo | null>(null);
  const [deviceInfoReady, setDeviceInfoReady] = useState(false);
  const router = useRouter();

  const handleDeviceInfoReady = useCallback((info: DeviceStartupInfo) => {
    if (!deviceInfoReady) {  // 只在第一次调用时执行
      setDeviceInfo(info);
      setDeviceInfoReady(true);
      logger.info('DeviceRegistrationScreen', '设备信息就绪', JSON.stringify(info));
    }
  }, [deviceInfoReady]);

    const handleRegisterDevice = useCallback(async () => {
    console.log('🔥 handleRegisterDevice 被调用');
    console.log('🔥 deviceInfo:', deviceInfo);
    console.log('🔥 loading:', loading);
    console.log('🔥 deviceInfoReady:', deviceInfoReady);
    
    if (!deviceInfo || loading) {
      console.log('🔥 提前返回: deviceInfo缺失或正在加载');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔥 开始注册设备...');
      // deviceStartupManager 会使用自己内部收集的设备信息
      await deviceStartupManager.registerDevice();
      console.log('🔥 注册成功，跳转到主界面');
      
      // 注册成功后返回主界面
      router.replace('/(tabs)');
    } catch (error) {
      console.log('🔥 注册出错:', error);
      logger.error('设备注册失败:', String(error));
      Alert.alert('注册失败', '设备注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [deviceInfo, loading, deviceInfoReady, router]);

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
          <Text style={styles.helpText}>设备ID: {deviceInfo?.androidId || '获取中...'}</Text>
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