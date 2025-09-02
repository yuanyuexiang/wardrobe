/**
 * 用户状态管理 Hook
 * 统一管理用户信息和认证状态
 */
import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { systemApolloClient } from '../utils/systemApolloClient';
import { logger } from '../utils/logger';

interface DirectusRole {
  id: string;
  name: string;
}

interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  status: string;
  role?: DirectusRole;
  last_access?: string;
}

interface UserState {
  user: DirectusUser | null;
  loading: boolean;
  error: string | null;
}

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

export const useCurrentUser = () => {
  const [state, setState] = useState<UserState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      logger.debug('UserHook', '开始获取当前用户信息');
      
      const result = await systemApolloClient.query({
        query: GET_CURRENT_USER,
        fetchPolicy: 'no-cache'
      });
      
      logger.info('UserHook', '用户信息获取成功', { userId: result.data.users_me?.id });
      
      setState({
        user: result.data.users_me,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户信息失败';
      logger.error('UserHook', '用户信息获取失败', err);
      
      setState({
        user: null,
        loading: false,
        error: errorMessage,
      });
    }
  };

  const refetchUser = () => {
    fetchUser();
  };

  const clearUser = () => {
    setState({
      user: null,
      loading: false,
      error: null,
    });
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    refetchUser,
    clearUser,
    isAuthenticated: !!state.user && state.user.status === 'active',
  };
};
