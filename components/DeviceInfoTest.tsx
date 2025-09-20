/**
 * 设备信息功能测试
 * 用于测试DeviceInfo组件和terminals集成
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DeviceInfo, { DeviceInfoData } from './DeviceInfo';
import { useTerminals } from '../hooks/useTerminals';

interface DeviceInfoTestProps {
  userId?: string;
}

const DeviceInfoTest: React.FC<DeviceInfoTestProps> = ({ userId = "test-user" }) => {
  const { terminals, currentTerminal, syncDeviceInfo, loading, error } = useTerminals(userId);

  const handleDeviceInfoReady = async (deviceInfo: DeviceInfoData) => {
    console.log('设备信息就绪:', deviceInfo);
    
    if (userId) {
      try {
        await syncDeviceInfo(deviceInfo, userId);
        console.log('设备信息同步成功');
      } catch (error) {
        console.error('设备信息同步失败:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>设备信息测试</Text>
      
      {/* DeviceInfo组件 */}
      <DeviceInfo 
        onDeviceInfoReady={handleDeviceInfoReady}
        showDetails={true}
      />

      {/* Terminals状态 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terminals状态</Text>
        {loading && <Text style={styles.statusText}>加载中...</Text>}
        {error && <Text style={styles.errorText}>错误: {error}</Text>}
        
        {terminals && terminals.length > 0 && (
          <View>
            <Text style={styles.statusText}>已找到 {terminals.length} 个设备</Text>
            {currentTerminal && (
              <Text style={styles.statusText}>
                当前设备: {currentTerminal.deviceName || '未知设备'}
              </Text>
            )}
          </View>
        )}
        
        {terminals && terminals.length === 0 && !loading && (
          <Text style={styles.statusText}>未找到已注册的设备</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
});

export default DeviceInfoTest;