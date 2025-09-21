// System API 类型定义（手动创建，因为与主 schema 有冲突）
// 用户认证已移除，现在使用设备授权系统

// 保留设备相关类型定义可能需要的接口
export interface DeviceInfo {
  android_id?: string;
  brand?: string;
  manufacturer?: string;
  model_name?: string;
  device_type?: string;
  device_name?: string;
  os_name?: string;
  os_version?: string;
}
