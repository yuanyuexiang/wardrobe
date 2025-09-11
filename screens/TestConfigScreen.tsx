import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { configManager } from '../utils/configManager';

export default function TestConfigScreen() {
  const config = configManager.getConfig();

  const goToConfig = () => {
    router.push('/config');
  };

  const clearConfig = async () => {
    await configManager.resetConfig();
    router.replace('/config');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>配置信息</Text>
      
      <View style={styles.configItem}>
        <Text style={styles.label}>认证Token:</Text>
        <Text style={styles.value}>{config.authToken}</Text>
      </View>
      
      <View style={styles.configItem}>
        <Text style={styles.label}>API地址:</Text>
        <Text style={styles.value}>{config.apiBaseUrl}</Text>
      </View>
      
      <View style={styles.configItem}>
        <Text style={styles.label}>代理端口:</Text>
        <Text style={styles.value}>{config.proxyPort}</Text>
      </View>
      
      <View style={styles.configItem}>
        <Text style={styles.label}>应用名称:</Text>
        <Text style={styles.value}>{config.appName}</Text>
      </View>
      
      <View style={styles.configItem}>
        <Text style={styles.label}>已配置:</Text>
        <Text style={styles.value}>{config.isConfigured ? '是' : '否'}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={goToConfig}>
        <Text style={styles.buttonText}>修改配置</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearConfig}>
        <Text style={styles.buttonText}>清除配置</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  configItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#ff6b35',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
