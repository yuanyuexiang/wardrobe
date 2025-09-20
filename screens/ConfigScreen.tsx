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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { logger } from '../utils/logger';
import { configManager, AppConfig, DEFAULT_CONFIG } from '../utils/configManager';
import { ApolloClient, createHttpLink, InMemoryCache, gql } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GetCurrentUserData } from '../types/systemApi';
import DeviceInfo, { DeviceInfoData } from '../components/DeviceInfo';
import { useTerminals } from '../hooks/useTerminals';

interface Boutique {
  id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  code?: string | null;
  category?: string | null;
  contact?: string | null;
  expire_date?: any | null;
  main_image?: string | null;
  images?: any | null;
  status?: string | null;
  stars?: number | null;
  sort?: number | null;
  date_created?: any | null;
  date_updated?: any | null;
}

// GraphQL 查询
const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    users_me {
      id
      first_name
      last_name
      email
      status
      role {
        id
        name
      }
      last_access
    }
  }
`;

const GET_MY_BOUTIQUES = gql`
  query GetMyBoutiques($userId: ID!) {
    boutiques(filter: { user_created: { id: { _eq: $userId } } }) {
      id
      name
      main_image
      address
      city
      category
      status
    }
  }
`;

export default function ConfigScreen() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [selectedBoutique, setSelectedBoutique] = useState<Boutique | null>(null);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoData>({});
  
  // 使用terminals hook
  const { terminals, currentTerminal, syncDeviceInfo } = useTerminals(config.userId);

  // 处理设备信息就绪
  const handleDeviceInfoReady = (info: DeviceInfoData) => {
    setDeviceInfo(info);
    logger.info('ConfigScreen', '设备信息就绪', JSON.stringify(info));
  };

  // 加载保存的配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      await configManager.loadConfig();
      const currentConfig = configManager.getConfig();
      setConfig(currentConfig);
      
      // 判断是否为重新配置：
      // 1. 如果配置已完成 且 是通过路由访问(/config)，则为重新配置
      // 2. 如果配置未完成，则为初次配置
      const isRouteAccess = typeof window !== 'undefined' && window.location && 
        (window.location.pathname?.includes('/config') || window.location.hash?.includes('/config'));
      const isReconfig = currentConfig.isConfigured && isRouteAccess;
      
      setIsReconfiguring(isReconfig);
      
      logger.info('ConfigScreen', '配置加载成功', { 
        isConfigured: currentConfig.isConfigured,
        isRouteAccess,
        isReconfiguring: isReconfig
      });
    } catch (error) {
      logger.error('ConfigScreen', '加载配置失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 创建临时Apollo客户端用于获取店铺信息
  const createTempApolloClient = (apiBaseUrl: string, authToken: string, isSystemAPI: boolean = false) => {
    const isDev = process.env.NODE_ENV === 'development';
    const isWebEnvironment = typeof window !== 'undefined';
    const currentHost = isWebEnvironment ? window.location?.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

    let apiUri: string;
    if (isWebEnvironment && isDev && isLocalhost) {
      apiUri = `http://localhost:3001/api/graphql${isSystemAPI ? '/system' : ''}`;
    } else {
      apiUri = `${apiBaseUrl}/graphql${isSystemAPI ? '/system' : ''}`;
    }

    logger.info('ConfigScreen', 'Apollo客户端配置', {
      apiUri,
      isSystemAPI,
      isDev,
      isLocalhost,
      currentHost
    });

    const httpLink = createHttpLink({
      uri: apiUri,
      fetchOptions: { mode: 'cors' },
    });

    const authLink = setContext((_: any, context: any) => ({
      headers: {
        ...context.headers,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }));

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
  };

  // 获取用户的店铺列表
  const fetchUserBoutiques = async () => {
    try {
      setLoading(true);
      
      // 调试信息：记录请求配置
      logger.info('ConfigScreen', '开始获取用户和店铺信息', {
        apiBaseUrl: config.apiBaseUrl,
        authToken: config.authToken ? `${config.authToken.substring(0, 10)}...` : 'empty'
      });
      
      // 首先使用系统API获取当前用户信息
      const systemClient = createTempApolloClient(config.apiBaseUrl, config.authToken, true);
      
      logger.info('ConfigScreen', '尝试获取用户信息...');
      const { data: userData } = await systemClient.query<GetCurrentUserData>({
        query: GET_CURRENT_USER,
        fetchPolicy: 'network-only',
      });

      if (!userData.users_me) {
        throw new Error('无法获取用户信息，请检查Token是否正确');
      }

      const userId = userData.users_me.id;
      setConfig(prev => ({ ...prev, userId }));
      
      logger.info('ConfigScreen', '用户信息获取成功', { userId, email: userData.users_me.email });

      // 然后使用主API获取该用户的店铺
      const mainClient = createTempApolloClient(config.apiBaseUrl, config.authToken, false);
      
      logger.info('ConfigScreen', '尝试获取店铺信息...', { userId });
      const { data: boutiqueData } = await mainClient.query({
        query: GET_MY_BOUTIQUES,
        variables: { userId },
        fetchPolicy: 'network-only',
      });

      if (boutiqueData.boutiques) {
        const userBoutiques = boutiqueData.boutiques;
        setBoutiques(userBoutiques);
        
        logger.info('ConfigScreen', '获取店铺成功', { 
          userId, 
          boutiquesCount: userBoutiques.length,
          userName: `${userData.users_me.first_name || ''} ${userData.users_me.last_name || ''}`.trim()
        });

        if (userBoutiques.length === 0) {
          Alert.alert('提示', '未找到您的店铺，请联系管理员');
          return;
        }
        
        setCurrentStep(2);
      }
    } catch (error: any) {
      logger.error('ConfigScreen', '获取店铺失败', error);
      
      // 提供更详细的错误信息
      let errorMessage = '无法获取店铺信息';
      if (error.networkError) {
        errorMessage += ': 网络连接失败，请检查网络或代理设置';
      } else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage += ': ' + error.graphQLErrors[0].message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('获取失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = async () => {
    // 验证必填字段
    if (!config.authToken.trim()) {
      Alert.alert('错误', '请输入认证Token');
      return;
    }
    
    if (!config.apiBaseUrl.trim()) {
      Alert.alert('错误', '请输入API地址');
      return;
    }

    // 获取店铺信息
    await fetchUserBoutiques();
  };

  const handleStep2Complete = async () => {
    console.log('=== 完成配置按钮被点击 ===');
    
    if (!selectedBoutique) {
      Alert.alert('错误', '请选择一个店铺');
      return;
    }

    try {
      setLoading(true);
      console.log('开始保存配置...');
      
      // 保存完整配置
      const configToSave: AppConfig = {
        ...config,
        selectedBoutiqueId: selectedBoutique.id,
        selectedBoutiqueName: selectedBoutique.name || '未命名店铺',
        isConfigured: true,
      };
      
      await configManager.saveConfig(configToSave);
      console.log('配置保存成功，开始同步设备信息...');
      
      // 同步设备信息到服务器
      if (Object.keys(deviceInfo).length > 0 && config.userId) {
        try {
          await syncDeviceInfo(deviceInfo, config.userId);
          console.log('设备信息同步成功');
        } catch (deviceError) {
          console.warn('设备信息同步失败，但不影响主流程:', deviceError);
          // 设备信息同步失败不阻止配置完成
        }
      }
      
      // 验证配置是否真的保存成功
      const savedConfig = configManager.getConfig();
      console.log('验证保存的配置:', savedConfig);
      
      // 等待一下确保配置已经保存
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 直接导航而不是刷新页面
      if (typeof window !== 'undefined' && window.location) {
        console.log('Web环境：导航到首页');
        window.location.href = '/';
      } else {
        console.log('移动端环境：使用路由跳转');
        router.replace('/(tabs)');
      }
      
    } catch (error) {
      console.error('配置失败:', error);
      Alert.alert('配置失败', '保存配置时出现错误，请重试');
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

  const useDevConfig = async () => {
    try {
      setLoading(true);
      const devConfig = {
        ...DEFAULT_CONFIG,
        isConfigured: true,
      };
      await configManager.saveConfig(devConfig);
      logger.info('ConfigScreen', '使用开发配置成功', devConfig);
      Alert.alert('配置完成', '开发配置已设置，即将进入应用');
      // 触发页面重载以应用新配置
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        } else {
          // React Native环境中使用路由替换
          router.replace('/(tabs)');
        }
      }, 1000);
    } catch (error) {
      logger.error('ConfigScreen', '设置开发配置失败', error);
      Alert.alert('设置失败', '设置开发配置时出现错误');
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

  const renderStep1 = () => (
    <>
      {/* 头部 */}
      <View style={styles.header}>
        {isReconfiguring && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              logger.info('ConfigScreen', '返回主页');
              try {
                router.back();
              } catch (error) {
                logger.error('ConfigScreen', '返回失败，尝试导航到首页', error);
                router.replace('/');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Ionicons name="settings-outline" size={60} color="#007AFF" />
        <Text style={styles.title}>
          {isReconfiguring ? '重新配置' : '应用配置'}
        </Text>
        <Text style={styles.subtitle}>步骤 1/2: 配置API连接</Text>
      </View>

      {/* 步骤指示器 */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepItem, styles.activeStep]}>
          <Text style={[styles.stepText, styles.activeStepText]}>1</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <Text style={styles.stepText}>2</Text>
        </View>
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
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.devButton]}
          onPress={useDevConfig}
          disabled={loading}
        >
          <Ionicons name="code-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>使用开发配置</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleStep1Next}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>下一步</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      {/* 头部 */}
      <View style={styles.header}>
        {isReconfiguring && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              logger.info('ConfigScreen', '返回主页');
              try {
                router.back();
              } catch (error) {
                logger.error('ConfigScreen', '返回失败，尝试导航到首页', error);
                router.replace('/');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Ionicons name="storefront-outline" size={60} color="#007AFF" />
        <Text style={styles.title}>选择店铺</Text>
        <Text style={styles.subtitle}>步骤 2/2: 选择您的店铺</Text>
      </View>

      {/* 步骤指示器 */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepItem, styles.completedStep]}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
        <View style={[styles.stepLine, styles.completedStepLine]} />
        <View style={[styles.stepItem, styles.activeStep]}>
          <Text style={[styles.stepText, styles.activeStepText]}>2</Text>
        </View>
      </View>

      {/* 店铺列表 */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>请选择您的店铺：</Text>
        {boutiques.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>未找到店铺</Text>
            <Text style={styles.emptySubtext}>请联系管理员检查您的权限</Text>
          </View>
        ) : (
          boutiques.map((boutique) => (
            <TouchableOpacity
              key={boutique.id}
              style={[
                styles.boutiqueItem,
                selectedBoutique?.id === boutique.id && styles.selectedBoutiqueItem
              ]}
              onPress={() => setSelectedBoutique(boutique)}
            >
              <View style={styles.boutiqueInfo}>
                <Ionicons 
                  name="storefront" 
                  size={24} 
                  color={selectedBoutique?.id === boutique.id ? '#007AFF' : '#666'} 
                />
                <Text style={[
                  styles.boutiqueName,
                  selectedBoutique?.id === boutique.id && styles.selectedBoutiqueName
                ]}>
                  {boutique.name || '未命名店铺'}
                </Text>
              </View>
              {selectedBoutique?.id === boutique.id && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 设备信息 */}
      <View style={styles.form}>
        <DeviceInfo 
          onDeviceInfoReady={handleDeviceInfoReady} 
          showDetails={true} 
        />
        
        {/* 显示已注册的终端设备 */}
        {terminals && terminals.length > 0 && (
          <View style={styles.terminalsSection}>
            <Text style={styles.sectionTitle}>已注册的设备 ({terminals.length})</Text>
            {terminals.slice(0, 3).map((terminal, index) => (
              <View key={terminal.id || index} style={styles.terminalItem}>
                <View style={styles.terminalInfo}>
                  <Text style={styles.terminalName}>
                    {terminal.deviceName || `${terminal.brand || ''} ${terminal.modelName || ''}`.trim() || '未知设备'}
                  </Text>
                  <Text style={styles.terminalDetails}>
                    {terminal.osName} {terminal.osVersion} • {terminal.deviceType}
                  </Text>
                </View>
                {terminal.id === currentTerminal?.id && (
                  <View style={styles.currentDeviceIndicator}>
                    <Text style={styles.currentDeviceText}>当前</Text>
                  </View>
                )}
              </View>
            ))}
            {terminals.length > 3 && (
              <Text style={styles.moreDevicesText}>还有 {terminals.length - 3} 个设备...</Text>
            )}
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setCurrentStep(1)}
          disabled={loading}
        >
          <Ionicons name="arrow-back-outline" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>上一步</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleStep2Complete}
          disabled={loading || !selectedBoutique}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>完成配置</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 ? renderStep1() : renderStep2()}
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 8,
    zIndex: 1,
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
  devButton: {
    backgroundColor: '#34C759',
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
  
  // 步骤指示器样式
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  stepItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#007AFF',
  },
  completedStep: {
    backgroundColor: '#34C759',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeStepText: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  completedStepLine: {
    backgroundColor: '#34C759',
  },
  
  // 店铺选择样式
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  boutiqueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedBoutiqueItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  boutiqueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boutiqueName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  selectedBoutiqueName: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },

  // 设备信息样式
  terminalsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  terminalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  terminalInfo: {
    flex: 1,
  },
  terminalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  terminalDetails: {
    fontSize: 12,
    color: '#666',
  },
  currentDeviceIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  currentDeviceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  moreDevicesText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
