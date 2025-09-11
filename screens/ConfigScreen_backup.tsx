import React, { useState  // 加载保存的配置
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
  };'react';
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
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
        logger.info('ConfigScreen', '加载保存的配置', parsedConfig);
      }
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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
      
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

  const resetConfig = () => {
    Alert.alert(
      '重置配置',
      '确定要重置为默认配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            setConfig(DEFAULT_CONFIG);
            logger.info('ConfigScreen', '配置已重置为默认值');
          },
        },
      ]
    );
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
      
    } catch (error) {
      logger.error('ConfigScreen', '连接测试失败', error);
      Alert.alert('连接失败', `无法连接到服务器: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
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
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfigWithFlag));
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 标题区域 */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="settings" size={32} color="#ff6b35" />
            </View>
            <Text style={styles.title}>应用配置</Text>
            <Text style={styles.subtitle}>首次使用需要配置应用参数</Text>
          </View>

          {/* 配置表单 */}
          <View style={styles.form}>
            {/* 认证Token */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>认证Token *</Text>
              <TextInput
                style={styles.input}
                value={config.authToken}
                onChangeText={(text) => setConfig(prev => ({ ...prev, authToken: text }))}
                placeholder="请输入API认证Token"
                secureTextEntry
                multiline
              />
              <Text style={styles.hint}>用于API认证的Bearer Token</Text>
            </View>

            {/* API地址 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API服务器地址 *</Text>
              <TextInput
                style={styles.input}
                value={config.apiBaseUrl}
                onChangeText={(text) => setConfig(prev => ({ ...prev, apiBaseUrl: text }))}
                placeholder="https://your-api-server.com"
                keyboardType="url"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>后端API服务器的完整地址</Text>
            </View>

            {/* 代理端口 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>本地代理端口</Text>
              <TextInput
                style={styles.input}
                value={config.proxyPort}
                onChangeText={(text) => setConfig(prev => ({ ...prev, proxyPort: text }))}
                placeholder="3001"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>开发环境使用的代理服务器端口</Text>
            </View>

            {/* 应用名称 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>应用名称</Text>
              <TextInput
                style={styles.input}
                value={config.appName}
                onChangeText={(text) => setConfig(prev => ({ ...prev, appName: text }))}
                placeholder="Wardrobe"
              />
              <Text style={styles.hint}>显示在应用中的名称</Text>
            </View>
          </View>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={saveConfig}
              disabled={loading}
            >
              <Ionicons name="save" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>
                {loading ? '保存中...' : '保存配置'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={testConnection}
                disabled={loading}
              >
                <Ionicons name="wifi" size={18} color="#ff6b35" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>测试连接</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={resetConfig}
                disabled={loading}
              >
                <Ionicons name="refresh" size={18} color="#666" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>重置</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipConfig}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>跳过配置，使用默认设置</Text>
            </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff5f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actions: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#ff6b35',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
