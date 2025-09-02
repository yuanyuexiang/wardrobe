/**
 * Directus 工具函数
 */

import { API_CONFIG } from '../config/api';

const DIRECTUS_BASE_URL = API_CONFIG.BASE_URL;

/**
 * 将 Directus 文件 ID 转换为完整的图片 URL
 * @param fileId Directus 文件 ID 或已有的完整URL
 * @param width 可选的宽度参数（用于图片优化）
 * @param height 可选的高度参数（用于图片优化）
 * @param quality 可选的质量参数（1-100）
 * @returns 完整的图片 URL
 */
export const getDirectusImageUrl = (
  fileId: string,
  width?: number,
  height?: number,
  quality?: number
): string => {
  if (!fileId) return '';
  
  // 检查是否已经是完整的URL
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
    console.warn('⚠️ getDirectusImageUrl 收到完整URL而非文件ID:', fileId);
    return fileId; // 如果已经是完整URL，直接返回
  }
  
  // 检查是否包含重复的域名前缀
  if (fileId.includes('forge.matrix-net.tech')) {
    console.warn('⚠️ 检测到重复域名的文件ID:', fileId);
    return fileId; // 直接返回，避免再次拼接
  }
  
  let url = `${DIRECTUS_BASE_URL}/assets/${fileId}`;
  
  // 添加查询参数进行图片优化
  const params: string[] = [];
  
  if (width) params.push(`width=${width}`);
  if (height) params.push(`height=${height}`);
  if (quality) params.push(`quality=${quality}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return url;
};

/**
 * 获取优化的缩略图 URL
 * @param fileId Directus 文件 ID
 * @param size 缩略图尺寸 (默认 300px)
 * @returns 缩略图 URL
 */
export const getDirectusThumbnailUrl = (fileId: string, size: number = 300): string => {
  return getDirectusImageUrl(fileId, size, size, 80);
};

/**
 * 获取高质量的原图 URL
 * @param fileId Directus 文件 ID
 * @returns 原图 URL
 */
export const getDirectusOriginalUrl = (fileId: string): string => {
  return getDirectusImageUrl(fileId);
};
