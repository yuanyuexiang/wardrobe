/**
 * 图片加载和缓存优化工具
 * 统一管理应用中的图片加载、缓存和优化策略
 */
import { Image } from 'react-native';
import { getAssetUrl } from '../config/api';
import { logger } from './logger';

interface ImageCacheItem {
  url: string;
  timestamp: number;
  loading: boolean;
}

class ImageCache {
  private cache = new Map<string, ImageCacheItem>();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_EXPIRE_TIME = 30 * 60 * 1000; // 30分钟

  /**
   * 预加载图片到缓存
   */
  async preload(assetId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    if (!assetId) return;

    const url = getAssetUrl(assetId);
    const cacheKey = assetId;

    // 检查是否已在缓存中
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      logger.debug('ImageCache', '图片已在缓存中', { assetId, url });
      return;
    }

    // 检查是否正在加载
    if (cached?.loading) {
      logger.debug('ImageCache', '图片正在加载中', { assetId });
      return;
    }

    // 标记为加载中
    this.cache.set(cacheKey, {
      url,
      timestamp: Date.now(),
      loading: true,
    });

    try {
      logger.debug('ImageCache', '开始预加载图片', { assetId, url, priority });
      
      await Image.prefetch(url);
      
      // 更新缓存状态
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        loading: false,
      });

      logger.info('ImageCache', '图片预加载成功', { assetId, url });
      
      // 清理过期缓存
      this.cleanExpiredCache();
      
    } catch (error) {
      logger.error('ImageCache', '图片预加载失败', { assetId, url, error });
      
      // 移除失败的缓存项
      this.cache.delete(cacheKey);
      
      throw error;
    }
  }

  /**
   * 批量预加载图片
   */
  async preloadBatch(assetIds: string[], priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const validIds = assetIds.filter(id => id && typeof id === 'string');
    
    if (validIds.length === 0) return;

    logger.info('ImageCache', '开始批量预加载图片', { count: validIds.length, priority });

    const promises = validIds.map(id => 
      this.preload(id, priority).catch(err => {
        logger.warn('ImageCache', '批量加载中某图片失败', { assetId: id, error: err });
        return null; // 不让单个失败影响整体
      })
    );

    await Promise.allSettled(promises);
    
    logger.info('ImageCache', '批量预加载完成', { total: validIds.length });
  }

  /**
   * 获取图片URL（带缓存检查）
   */
  getImageUrl(assetId: string, width?: number, height?: number, quality?: number): string {
    if (!assetId) return '';

    let url = getAssetUrl(assetId);
    
    // 添加优化参数
    const params: string[] = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    if (quality) params.push(`quality=${quality}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return url;
  }

  /**
   * 获取缩略图URL
   */
  getThumbnailUrl(assetId: string, size: number = 300): string {
    return this.getImageUrl(assetId, size, size, 80);
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item, now)) {
        expired.push(key);
      }
    }

    // 删除过期项
    expired.forEach(key => this.cache.delete(key));

    // 如果缓存太大，删除最老的项
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.cache.delete(key));
      
      logger.debug('ImageCache', '清理缓存', { 
        expired: expired.length, 
        oversized: toDelete.length,
        remaining: this.cache.size 
      });
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: ImageCacheItem, now: number = Date.now()): boolean {
    return now - item.timestamp > this.CACHE_EXPIRE_TIME;
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    const total = this.cache.size;
    const loading = Array.from(this.cache.values()).filter(item => item.loading).length;
    const expired = Array.from(this.cache.values()).filter(item => this.isExpired(item, now)).length;

    return {
      total,
      loading,
      expired,
      valid: total - expired - loading,
    };
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    logger.info('ImageCache', '清空所有缓存');
  }
}

// 创建全局图片缓存实例
export const imageCache = new ImageCache();

// 便捷的Hook函数
export const useImagePreload = () => {
  return {
    preload: imageCache.preload.bind(imageCache),
    preloadBatch: imageCache.preloadBatch.bind(imageCache),
    getImageUrl: imageCache.getImageUrl.bind(imageCache),
    getThumbnailUrl: imageCache.getThumbnailUrl.bind(imageCache),
    getStats: imageCache.getStats.bind(imageCache),
  };
};
