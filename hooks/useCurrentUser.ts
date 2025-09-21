/**
 * 简化的用户状态管理 Hook
 * 由于改用设备授权系统，不再需要获取用户信息
 */
import { useState } from 'react';

interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  status: string;
}

interface UserState {
  user: DirectusUser | null;
  loading: boolean;
  error: string | null;
}

export const useCurrentUser = () => {
  // 返回空的用户状态，保持API兼容性
  const [state] = useState<UserState>({
    user: null,
    loading: false, // 不再需要加载
    error: null,
  });

  const refetchUser = () => {
    // 空实现，保持兼容性
  };

  const clearUser = () => {
    // 空实现，保持兼容性
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    refetchUser,
    clearUser,
    isAuthenticated: true, // 设备授权系统中认为总是已认证
  };
};
