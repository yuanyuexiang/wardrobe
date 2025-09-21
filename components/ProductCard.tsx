import { useRouter } from 'expo-router';
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GetProductsQuery } from '../generated/graphql';
import { getDirectusThumbnailUrl } from '../utils/directus';

export type Product = GetProductsQuery['products'][0];

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({ pathname: '/ProductDetail', params: { id: product.id } });
  };

  // 获取优化后的图片 URL
  const imageUrl = product.main_image ? getDirectusThumbnailUrl(product.main_image, 320) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {imageUrl ? (
        <ImageBackground 
          source={{ uri: imageUrl }} 
          style={styles.backgroundImage} 
          resizeMode="cover"
        >
          <View style={styles.cardContent}>
            <View style={styles.textArea}>
              <Text style={styles.name} numberOfLines={2}>
                {product.name || '商品名称'}
              </Text>
              {product.subtitle && (
                <Text style={styles.desc} numberOfLines={1}>
                  {product.subtitle}
                </Text>
              )}
              {/* <Text style={styles.price}>
                ￥{product.price !== undefined ? product.price : '价格'}
              </Text> */}
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.placeholderCard}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.placeholderText}>暂无图片</Text>
          </View>
          <View style={[styles.textArea, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}>
            <Text style={[styles.name, { color: '#333', textShadowColor: 'transparent' }]} numberOfLines={2}>
              {product.name || '商品名称'}
            </Text>
            {product.subtitle && (
              <Text style={[styles.desc, { color: '#666', textShadowColor: 'transparent' }]} numberOfLines={1}>
                {product.subtitle}
              </Text>
            )}
            <Text style={[styles.price, { color: '#ff6b35', textShadowColor: 'transparent' }]}>
              ￥{product.price !== undefined ? product.price : '价格'}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 8,
    // iOS 阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Android 阴影
    elevation: 6,
    // Web 阴影
    ...(typeof window !== 'undefined' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    }),
    // 简单的flex布局，让卡片填充可用空间
    flex: 1,
    width: 280,
    overflow: 'hidden',
  },
  backgroundImage: {
    flex: 1, // 充满整个容器
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end', // 内容对齐到底部
  },
  imageArea: {
    // 移除固定 flex，让图片自然显示
  },
  textArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'flex-start',
    // 移除最大高度限制，让文本区域自然适应内容
  },
  placeholderCard: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'space-between', // 改为space-between，让内容分布更均匀
    alignItems: 'stretch',
    padding: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 4, // 固定间距
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  desc: {
    fontSize: 13,
    color: '#f5f5f5',
    lineHeight: 16,
    marginBottom: 4, // 固定间距
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default ProductCard;
