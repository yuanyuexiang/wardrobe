// System API 类型定义（手动创建，因为与主 schema 有冲突）

export interface DirectusRole {
  id: string;
  name: string;
}

export interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  status: string;
  role?: DirectusRole;
  last_access?: string;
  location?: string;
  title?: string;
  description?: string;
  avatar?: string;
  language?: string;
}

export interface GetCurrentUserData {
  users_me: DirectusUser;
}

// GraphQL 查询字符串
export const GET_CURRENT_USER = `
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
