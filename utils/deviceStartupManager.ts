/**
 * 设备启动管理器
 * 基于设备信息进行应用状态判断和路由
 */
import { logger } from './logger';
import { configManager } from './configManager';
import { ApolloClient, createHttpLink, InMemoryCache, gql } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

export interface DeviceStartupInfo {
  androidId?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  modelName?: string | null;
  deviceType?: Device.DeviceType | null;
  osName?: string | null;
  osVersion?: string | null;
  totalMemory?: number | null;
}

export interface TerminalInfo {
  id: string;
  android_id: string;
  brand: string;
  manufacturer: string;
  model_name: string;
  device_type?: string;
  device_name?: string;
  os_name?: string;
  os_version?: string;
  supported_cpu_architectures?: string[];
  total_memory?: number;
  date_created?: string;
  date_updated?: string;
  authorized_boutique?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    category?: string;
    status?: string;
  };
}

export type AppStartupState = 
  | 'loading'           // 正在检查
  | 'first_time'        // 第一次使用，需要注册设备
  | 'pending_approval'  // 设备已注册，等待审批
  | 'approved'          // 设备已审批，可以进入应用
  | 'error';           // 检查过程中出错

// GraphQL查询
const GET_TERMINAL_BY_ANDROID_ID = gql`
  query GetTerminalByAndroidId($androidId: String!) {
    terminals(filter: { android_id: { _eq: $androidId } }, limit: 1) {
      id
      android_id
      brand
      manufacturer
      model_name
      authorized_boutique {
        id
        name
      }
    }
  }
`;

const REGISTER_DEVICE = gql`
  mutation RegisterDevice($data: create_terminals_input!) {
    create_terminals_item(data: $data) {
      id
      android_id
      brand
      manufacturer
      model_name
      device_type
      device_name
      os_name
      os_version
      total_memory
      date_created
    }
  }
`;

class DeviceStartupManager {
  private static instance: DeviceStartupManager;
  private deviceInfo: DeviceStartupInfo = {};
  private apolloClient: ApolloClient<any> | null = null;

  static getInstance(): DeviceStartupManager {
    if (!DeviceStartupManager.instance) {
      DeviceStartupManager.instance = new DeviceStartupManager();
    }
    return DeviceStartupManager.instance;
  }

  private constructor() {}

  /**
   * 测试 GraphQL 连接
   */
  private async testGraphQLConnection(): Promise<void> {
    try {
      if (!this.apolloClient) {
        this.createApolloClient();
      }

      // 使用最简单的内省查询测试连接
      const testQuery = gql`
        query TestConnection {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      await this.apolloClient!.query({
        query: testQuery,
        fetchPolicy: 'network-only',
      });

      logger.info('DeviceStartupManager', 'GraphQL连接测试成功');
    } catch (error: any) {
      logger.error('DeviceStartupManager', 'GraphQL连接测试失败', {
        error: String(error),
        message: error.message,
        networkError: error.networkError?.message,
        statusCode: error.networkError?.statusCode,
      });
      throw error;
    }
  }

  /**
   * 获取设备信息
   */
  private async getDeviceInfo(): Promise<DeviceStartupInfo> {
    try {
      const deviceInfo: DeviceStartupInfo = {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        deviceType: Device.deviceType,
        osName: Device.osName,
        osVersion: Device.osVersion,
        totalMemory: Device.totalMemory,
      };

      // 获取设备唯一标识符
      try {
        if (Device.osName === 'Android') {
          // Android 平台使用 Android ID
          deviceInfo.androidId = await Application.getAndroidId();
        } else if (typeof window !== 'undefined') {
          // Web 浏览器环境使用固定值
          deviceInfo.androidId = 'web_browser_device';
        } else {
          // 其他平台使用固定值
          deviceInfo.androidId = 'mobile_app_device';
        }
      } catch (error) {
        logger.warn('DeviceStartupManager', '无法获取设备标识符，使用默认值', String(error));
        // 降级方案：根据环境使用不同的默认值
        if (typeof window !== 'undefined') {
          deviceInfo.androidId = 'web_browser_fallback';
        } else {
          deviceInfo.androidId = 'mobile_app_fallback';
        }
      }

      this.deviceInfo = deviceInfo;
      logger.info('DeviceStartupManager', '设备信息获取成功', {
        ...deviceInfo,
        androidId: deviceInfo.androidId
      });
      return deviceInfo;
    } catch (error) {
      logger.error('DeviceStartupManager', '获取设备信息失败', String(error));
      throw error;
    }
  }

  /**
   * 创建Apollo客户端
   */

  /**
   * 生成字符串哈希值
   */
  private async hashString(str: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hash));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substr(0, 16);
    } else {
      // 降级方案：简单哈希
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(36);
    }
  }

  /**
   * 获取已保存的设备ID
   */
  private async getStoredDeviceId(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        // Web 环境使用 localStorage
        return localStorage.getItem('device_id');
      } else {
        // React Native 环境使用 AsyncStorage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem('device_id');
      }
    } catch (error) {
      logger.warn('DeviceStartupManager', '读取存储的设备ID失败', String(error));
      return null;
    }
  }

  /**
   * 保存设备ID
   */
  private async storeDeviceId(deviceId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Web 环境使用 localStorage
        localStorage.setItem('device_id', deviceId);
      } else {
        // React Native 环境使用 AsyncStorage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('device_id', deviceId);
      }
    } catch (error) {
      logger.warn('DeviceStartupManager', '保存设备ID失败', String(error));
    }
  }

  /**
   * 创建Apollo客户端
   */
  private createApolloClient(): ApolloClient<any> {
    const config = configManager.getConfig();
    const isDev = process.env.NODE_ENV === 'development';
    
    let apiUri: string;
    
    // 开发环境强制使用代理（避免CORS问题）
    if (isDev) {
      apiUri = 'http://localhost:3001/api/graphql';
      logger.info('DeviceStartupManager', '开发环境：使用本地代理服务器');
    } else if (config.apiBaseUrl && config.apiBaseUrl !== '') {
      apiUri = `${config.apiBaseUrl}/graphql`;
      logger.info('DeviceStartupManager', '生产环境：使用配置的API地址');
    } else {
      // 最终降级到默认配置
      const { DEFAULT_CONFIG } = require('./configManager');
      apiUri = `${DEFAULT_CONFIG.apiBaseUrl}/graphql`;
      logger.info('DeviceStartupManager', '降级：使用默认API地址');
    }

    logger.info('DeviceStartupManager', 'Apollo客户端配置', {
      apiUri,
      hasAuthToken: !!config.authToken,
      authTokenLength: config.authToken?.length || 0,
      configApiBase: config.apiBaseUrl,
      isDev,
      nodeEnv: process.env.NODE_ENV
    });

    const httpLink = createHttpLink({
      uri: apiUri,
      fetchOptions: { mode: 'cors' },
    });

    const authLink = setContext((_: any, context: any) => ({
      headers: {
        ...context.headers,
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
    }));

    this.apolloClient = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });

    return this.apolloClient;
  }

  /**
   * 根据Android ID查询终端信息
   */
  private async getTerminalInfo(androidId: string): Promise<TerminalInfo | null> {
    try {
      if (!this.apolloClient) {
        logger.info('DeviceStartupManager', '创建Apollo客户端');
        this.createApolloClient();
      }

      logger.info('DeviceStartupManager', '开始查询终端信息', { 
        androidId: `${androidId.substring(0, 8)}...`,
        clientExists: !!this.apolloClient
      });

      const { data } = await this.apolloClient!.query({
        query: GET_TERMINAL_BY_ANDROID_ID,
        variables: { androidId },
        fetchPolicy: 'network-only',
        errorPolicy: 'all', // 包含部分错误的数据
      });

      logger.info('DeviceStartupManager', '终端查询结果', { 
        terminalsCount: data?.terminals?.length || 0,
        hasData: !!data
      });

      if (data?.terminals && data.terminals.length > 0) {
        const terminal = data.terminals[0];
        logger.info('DeviceStartupManager', '找到终端记录', { 
          terminalId: terminal.id,
          hasAuthorizedBoutique: !!terminal.authorized_boutique 
        });

        return {
          id: terminal.id,
          android_id: terminal.android_id,
          brand: terminal.brand || '',
          manufacturer: terminal.manufacturer || '',
          model_name: terminal.model_name || '',
          authorized_boutique: terminal.authorized_boutique ? {
            id: terminal.authorized_boutique.id,
            name: terminal.authorized_boutique.name,
          } : undefined,
        };
      }

      logger.info('DeviceStartupManager', '未找到终端记录');
      return null;
    } catch (error: any) {
      logger.error('DeviceStartupManager', '查询终端信息失败', {
        error: String(error),
        message: error.message,
        networkError: error.networkError?.message,
        graphQLErrors: error.graphQLErrors?.map((e: any) => e.message),
        statusCode: error.networkError?.statusCode,
      });

      // 如果是网络错误或者400错误，可能是配置问题
      if (error.networkError?.statusCode === 400 || error.message?.includes('400')) {
        logger.warn('DeviceStartupManager', 'GraphQL查询返回400错误，可能是API配置问题');
      }
      
      throw error;
    }
  }

  /**
   * 注册新设备
   */
  async registerDevice(): Promise<void> {
    try {
      if (!this.apolloClient) {
        this.createApolloClient();
      }

      const deviceData = {
        android_id: this.deviceInfo.androidId,
        brand: this.deviceInfo.brand,
        manufacturer: this.deviceInfo.manufacturer,
        model_name: this.deviceInfo.modelName,
        device_type: this.getDeviceTypeString(this.deviceInfo.deviceType),
        device_name: `${this.deviceInfo.brand || ''} ${this.deviceInfo.modelName || ''}`.trim() || null,
        os_name: this.deviceInfo.osName,
        os_version: this.deviceInfo.osVersion,
        total_memory: this.deviceInfo.totalMemory?.toString(),
        // 注意：不设置 authorized_user 和 boutique，等待管理员审批
      };

      const { data } = await this.apolloClient!.mutate({
        mutation: REGISTER_DEVICE,
        variables: { data: deviceData },
      });

      if (data.create_terminals_item) {
        logger.info('DeviceStartupManager', '设备注册成功', JSON.stringify(data.create_terminals_item));
      }
    } catch (error) {
      logger.error('DeviceStartupManager', '设备注册失败', String(error));
      throw error;
    }
  }

  /**
   * 检查应用启动状态
   */
  async checkStartupState(): Promise<{
    state: AppStartupState;
    terminalInfo?: TerminalInfo | null;
    deviceInfo?: DeviceStartupInfo;
  }> {
    try {
      logger.info('DeviceStartupManager', '开始检查应用启动状态');

      // 0. 首先检查基本配置是否存在
      const config = configManager.getConfig();
      if (!config.authToken || !config.apiBaseUrl) {
        logger.info('DeviceStartupManager', '基本配置未完成，需要先进行配置');
        return { state: 'first_time', deviceInfo: await this.getDeviceInfo() };
      }

      // 1. 获取设备信息
      const deviceInfo = await this.getDeviceInfo();

      // 设备信息现在总是包含 androidId，不再需要额外检查

      // 2. 查询终端信息
      let terminalInfo: TerminalInfo | null = null;
      try {
        terminalInfo = await this.getTerminalInfo(deviceInfo.androidId!);
      } catch (error) {
        logger.error('DeviceStartupManager', '查询终端信息出错', String(error));
        // 如果是网络或认证错误，可能需要重新配置
        const errorMsg = String(error);
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || 
            errorMsg.includes('token') || errorMsg.includes('400')) {
          logger.info('DeviceStartupManager', '认证或请求失败，跳转到配置界面');
          return { state: 'first_time', deviceInfo };
        }
        return { state: 'error', deviceInfo };
      }

      // 3. 判断状态
      if (!terminalInfo) {
        // 第一次使用，需要注册设备
        logger.info('DeviceStartupManager', '设备未注册，需要首次注册');
        return { state: 'first_time', deviceInfo };
      } else if (!terminalInfo.authorized_boutique) {
        // 设备已注册但没有授权店铺，等待审批
        logger.info('DeviceStartupManager', '设备已注册，等待审批', JSON.stringify(terminalInfo));
        return { state: 'pending_approval', terminalInfo, deviceInfo };
      } else {
        // 设备已审批，可以进入应用
        logger.info('DeviceStartupManager', '设备已审批，可以进入应用', JSON.stringify(terminalInfo));
        
        // 保存店铺信息到本地配置
        await configManager.saveConfig({
          ...config,
          selectedBoutiqueId: terminalInfo.authorized_boutique.id,
          selectedBoutiqueName: terminalInfo.authorized_boutique.name || '店铺',
          isConfigured: true,
        });

        return { state: 'approved', terminalInfo, deviceInfo };
      }
    } catch (error) {
      logger.error('DeviceStartupManager', '检查启动状态失败', String(error));
      return { state: 'error' };
    }
  }

  private getDeviceTypeString(deviceType: any): string | null {
    if (!deviceType) return null;
    
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
  }

  /**
   * 获取当前设备信息
   */
  getDeviceInfoSync(): DeviceStartupInfo {
    return this.deviceInfo;
  }
}

export const deviceStartupManager = DeviceStartupManager.getInstance();