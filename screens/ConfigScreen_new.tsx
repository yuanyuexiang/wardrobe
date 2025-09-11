import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { logger } from '../utils/logger';
import { configManager, AppConfig, DEFAULT_CONFIG } from '../utils/configManager';

export default function ConfigScreen() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载保存的配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      await configManager.loadConfig();
      const currentConfig = configManager.getConfig();
      setConfig(currentConfig);
      logger.info('ConfigScreen', '配置加载成功', currentConfig);
    } catch (error) {
      logger.error('ConfigScreen', '加载配置失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      
      // 验证必填字段
      if (!config.authToken.trim()) {
        Alert.alert('错误', '请输入认证Token');
        return;
      }
      
      if (!config.apiBaseUrl.trim()) {
        Alert.alert('错误', '请输入API地址');
        return;
      }

      // 保存配置
      const configToSave = { ...config, isConfigured: true };
      await configManager.saveConfig(configToSave);
      
      logger.info('ConfigScreen', '配置保存成功', configToSave);
      
      Alert.alert(
        '配置保存成功',
        '配置已保存，即将进入应用',
        [
          {
            text: '确定',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (error) {
      logger.error('ConfigScreen', '保存配置失败', error);
      Alert.alert('错误', '保存配置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      
      // 测试GraphQL端点
      const testUrl = `${config.apiBaseUrl}/graphql`;
      logger.info('ConfigScreen', '测试GraphQL连接', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.authToken}`,
        },
        body: JSON.stringify({
          query: '{ __schema { types { name } } }'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          Alert.alert('连接成功', 'GraphQL服务器连接正常');
          logger.info('ConfigScreen', '连接测试成功');
        } else {
          throw new Error('GraphQL响应格式错误');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      logger.error('ConfigScreen', '连接测试失败', error);
      Alert.alert('连接失败', `无法连接到服务器: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = async () => {
    Alert.alert(
      '确认重置',
      '确定要重置所有配置吗？这将清除所有已保存的设置。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              await configManager.resetConfig();
              setConfig(DEFAULT_CONFIG);
              Alert.alert('重置成功', '配置已重置为默认值');
              logger.info('ConfigScreen', '配置重置成功');
            } catch (error) {
              logger.error('ConfigScreen', '重置配置失败', error);
              Alert.alert('重置失败', '重置配置时出现错误');
            }
          },
        },
      ]
    );
  };

  const skipConfig = () => {
    Alert.alert(
      '跳过配置',
      '使用默认配置进入应用？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              const defaultConfigWithFlag = { ...DEFAULT_CONFIG, isConfigured: true };
              await configManager.saveConfig(defaultConfigWithFlag);
              router.replace('/(tabs)');
            } catch (error) {
              logger.error('ConfigScreen', '跳过配置失败', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载配置中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 标题 */}
          <View style={styles.header}>
            <Ionicons name="settings-outline" size={48} color="#007AFF" />
            <Text style={styles.title}>应用配置</Text>
            <Text style={styles.subtitle}>请配置应用连接信息</Text>
          </View>

          {/* 配置表单 */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="key-outline" size={16} color="#666" /> 认证Token *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="请输入认证Token"
                value={config.authToken}
                onChangeText={(text) => setConfig(prev => ({ ...prev, authToken: text }))}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="globe-outline" size={16} color="#666" /> API地址 *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="https://forge.matrix-net.tech"
                value={config.apiBaseUrl}
                onChangeText={(text) => setConfig(prev => ({ ...prev, apiBaseUrl: text }))}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="server-outline" size={16} color="#666" /> 代理端口
              </Text>
              <TextInput
                style={styles.input}
                placeholder="3001"
                value={config.proxyPort}
                onChangeText={(text) => setConfig(prev => ({ ...prev, proxyPort: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="apps-outline" size={16} color="#666" /> 应用名称
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Wardrobe"
                value={config.appName}
                onChangeText={(text) => setConfig(prev => ({ ...prev, appName: text }))}
              />
            </View>
          </View>

          {/* 操作按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={saveConfig}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>保存配置</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={testConnection}
              disabled={loading}
            >
              <Ionicons name="pulse-outline" size={20} color="#007AFF" />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>测试连接</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.warningButton]}
              onPress={resetConfig}
              disabled={loading}
            >
              <Ionicons name="refresh-outline" size={20} color="#FF9500" />
              <Text style={[styles.buttonText, styles.warningButtonText]}>重置配置</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={skipConfig}
              disabled={loading}
            >
              <Ionicons name="arrow-forward-outline" size={20} color="#666" />
              <Text style={[styles.buttonText, styles.skipButtonText]}>跳过配置</Text>
            </TouchableOpacity>
          </View>

          {/* 帮助信息 */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>配置说明:</Text>
            <Text style={styles.helpText}>• 认证Token: 用于API访问授权</Text>
            <Text style={styles.helpText}>• API地址: 后端服务器地址</Text>
            <Text style={styles.helpText}>• 代理端口: 开发环境代理服务器端口</Text>
            <Text style={styles.helpText}>• 应用名称: 显示在界面上的应用名</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  warningButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  skipButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  warningButtonText: {
    color: '#FF9500',
  },
  skipButtonText: {
    color: '#666',
  },
  helpContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
});
