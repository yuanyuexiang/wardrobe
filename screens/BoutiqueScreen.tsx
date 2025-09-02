import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyBoutiqueQuery } from '../generated/graphql';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getAssetUrl } from '../config/api';
import { logger } from '../utils/logger';
import { useImagePreload } from '../utils/imageCache';
import { LAYOUT } from '../utils/constants';

const { screenWidth } = LAYOUT;

const BoutiqueScreen: React.FC = () => {
  // 使用全局用户状态管理
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  
  // 使用图片缓存优化
  const { preload, preloadBatch, getImageUrl, getThumbnailUrl } = useImagePreload();
  
  // 图片预览状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [previewImageSource, setPreviewImageSource] = useState<{uri: string, cache?: 'force-cache'} | null>(null);

  // 打开图片预览
  const openImagePreview = (imageId: string) => {
    logger.debug('BoutiqueScreen', '打开图片预览', { imageId, currentUrl: previewImageUrl });
    
    const imageUrl = getAssetUrl(imageId);
    const imageSource = { uri: imageUrl, cache: 'force-cache' as const };
    
    setPreviewImageUrl(imageUrl);
    setPreviewImageSource(imageSource); // 使用相同的source对象
    setPreviewVisible(true);
  };

  // 关闭图片预览
  const closeImagePreview = () => {
    setPreviewVisible(false);
    logger.debug('BoutiqueScreen', '关闭图片预览');
  };

  const { data, error } = useGetMyBoutiqueQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id
  });

  const boutique = data?.boutiques?.[0]; // 假设一个用户只有一个商家

  // 预加载主图片和相册图片到缓存
  useEffect(() => {
    if (boutique?.main_image) {
      // 预加载主图片
      preload(boutique.main_image, 'high').catch(err => {
        logger.error('BoutiqueScreen', '主图片预加载失败', err);
      });
    }

    // 预加载相册图片
    if (boutique?.images) {
      let imageIds: string[] = [];
      try {
        imageIds = Array.isArray(boutique.images) 
          ? boutique.images 
          : JSON.parse(boutique.images as string);
      } catch (err) {
        logger.error('BoutiqueScreen', '解析相册图片失败', err);
      }

      if (imageIds.length > 0) {
        preloadBatch(imageIds, 'normal').catch(err => {
          logger.error('BoutiqueScreen', '相册图片批量预加载失败', err);
        });
      }
    }
  }, [boutique?.main_image, boutique?.images, preload, preloadBatch]);

  if (error || !boutique) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error ? `加载失败：${error.message}` : '暂无商家信息'}
          </Text>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>创建商家</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.star, i <= rating ? styles.filledStar : styles.emptyStar]}>
          ★
        </Text>
      );
    }
    return stars;
  };

  const renderImages = () => {
    if (!boutique.images) return null;
    
    let images: string[] = [];
    try {
      images = Array.isArray(boutique.images) ? boutique.images : JSON.parse(boutique.images as string);
    } catch {
      images = [];
    }

    if (images.length === 0) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
        {images.map((imageId, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.imageWrapper}
            onPress={() => openImagePreview(imageId)}
          >
            {Platform.OS === 'web' ? (
              <img
                src={getAssetUrl(imageId)}
                style={{
                  width: 120,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 8
                }}
                alt={`商家图片 ${index + 1}`}
              />
            ) : (
              <Image
                source={{ 
                  uri: getAssetUrl(imageId),
                  cache: 'force-cache'
                }}
                style={styles.boutiqueImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fc" />
      
      {/* 标题 */}
      <Text style={styles.pageTitle}>商家</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
      {/* 商家头部信息 */}
      <View style={styles.header}>
        {boutique.main_image && (
          <TouchableOpacity 
            style={styles.mainImageContainer}
            onPress={() => boutique.main_image && openImagePreview(boutique.main_image)}
          >
            {Platform.OS === 'web' ? (
              <img
                src={getAssetUrl(boutique.main_image)}
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 12
                }}
                alt="商家主图"
              />
            ) : (
              <Image
                source={{ 
                  uri: getAssetUrl(boutique.main_image),
                  cache: 'force-cache'
                }}
                style={styles.mainImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            )}
          </TouchableOpacity>
        )}
        
        <View style={styles.boutiqueInfo}>
          <Text style={styles.boutiqueName}>{boutique.name}</Text>
          
          {boutique.address && (
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>📍</Text>
              <Text style={styles.addressText}>{boutique.address}</Text>
            </View>
          )}
          
          {boutique.stars && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(boutique.stars)}
              </View>
              <Text style={styles.ratingText}>{boutique.stars.toFixed(1)}</Text>
            </View>
          )}
          
          <View style={styles.statusContainer}>
            <Text style={[
              styles.statusText,
              boutique.status === 'published' ? styles.activeStatus : styles.inactiveStatus
            ]}>
              {boutique.status === 'published' ? '营业中' : '暂停营业'}
            </Text>
          </View>
        </View>
      </View>

      {/* 商家图片展示 */}
      {renderImages()}

      {/* 底部信息 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📅 创建时间: {new Date(boutique.date_created).toLocaleDateString('zh-CN')}
        </Text>
        <Text style={styles.footerText}>
          🔄 最后更新: {new Date(boutique.date_updated).toLocaleDateString('zh-CN')}
        </Text>
      </View>
      </ScrollView>

      {/* 图片预览Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeImagePreview}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeImagePreview}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageContainer}>
              {Platform.OS === 'web' ? (
                <img
                  src={previewImageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  alt="图片预览"
                />
              ) : (
                <Image
                  source={previewImageSource || { uri: previewImageUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              )}
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainImageContainer: {
    marginBottom: 16,
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  boutiqueInfo: {
    gap: 8,
  },
  boutiqueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLabel: {
    fontSize: 16,
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 18,
  },
  filledStar: {
    color: '#ff6b35',
  },
  emptyStar: {
    color: '#ddd',
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  statusContainer: {
    alignSelf: 'flex-start',
  },
  statusText: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  activeStatus: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  },
  inactiveStatus: {
    backgroundColor: '#ffeaa7',
    color: '#f39c12',
  },
  imagesContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  imageWrapper: {
    marginRight: 12,
  },
  boutiqueImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  footer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    padding: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});

export default BoutiqueScreen;
