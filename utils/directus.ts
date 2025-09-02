/**
 * Directus 工具函数
 */

// Directus 基础 URL
import { Directus } from '@directus/sdk';
import { Client, fetchExchange } from 'urql';
import { DocumentNode } from 'graphql/language/ast';
import { Variables } from 'urql';
import { API_CONFIG } from '../config/api';

const DIRECTUS_BASE_URL = API_CONFIG.BASE_URL;

/**
 * 将 Directus 文件 ID 转换为完整的图片 URL
 * @param fileId Directus 文件 ID
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
