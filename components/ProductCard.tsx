import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GetProductsQuery } from '../generated/graphql';
import { getDirectusThumbnailUrl } from '../utils/directus';

export type Product = GetProductsQuery['products'][0];

interface ProductCardProps {
  product: Product;
}

// 获取屏幕宽度并计算卡片宽度
const { width: screenWidth } = Dimensions.get('window');
const HORIZONTAL_PADDING = 32; // 左右各16px padding
const ITEM_SEPARATOR = 12; // 卡片间距
const VISIBLE_CARDS = 2.2; // 显示2.2个卡片，创造滑动效果
const cardWidth = (screenWidth - HORIZONTAL_PADDING - ITEM_SEPARATOR * (VISIBLE_CARDS - 1)) / VISIBLE_CARDS;

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
          <View style={styles.overlay}>
            <View style={styles.contentOverlay}>
              <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
              {product.subtitle && (
                <Text style={styles.desc} numberOfLines={1}>{product.subtitle}</Text>
              )}
              {product.price !== undefined && (
                <Text style={styles.price}>￥{product.price}</Text>
              )}
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>暂无图片</Text>
          <View style={styles.contentOverlay}>
            <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
            {product.subtitle && (
              <Text style={styles.desc} numberOfLines={1}>{product.subtitle}</Text>
            )}
            {product.price !== undefined && (
              <Text style={styles.price}>￥{product.price}</Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    width: cardWidth, // 使用动态计算的宽度
    aspectRatio: 0.75, // 宽高比 3:4，适合商品展示
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // 内容放在底部
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 半透明黑色遮罩
    padding: 12,
    justifyContent: 'flex-end',
    minHeight: '40%', // 至少占40%高度
  },
  contentOverlay: {
    justifyContent: 'flex-end',
  },
  placeholderCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff', // 白色文字在图片背景上更清晰
    lineHeight: 20,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  desc: {
    fontSize: 12,
    color: '#f0f0f0', // 浅灰白色
    lineHeight: 16,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  price: {
    fontSize: 18,
    color: '#FFD700', // 金色价格更突出
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default ProductCard;
