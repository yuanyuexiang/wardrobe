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
              <Text style={styles.name} numberOfLines={2}>
                {product.name || '商品名称'}
              </Text>
              {product.subtitle && (
                <Text style={styles.desc} numberOfLines={1}>
                  {product.subtitle}
                </Text>
              )}
              <Text style={styles.price}>
                ￥{product.price !== undefined ? product.price : '价格'}
              </Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>暂无图片</Text>
          <View style={styles.contentOverlay}>
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
    position: 'relative',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 增加遮罩不透明度，确保文字清晰可见
    padding: 16, // 从12增加到16，给文字更多空间
    justifyContent: 'flex-end',
    minHeight: '45%', // 从40%增加到45%，确保文字有足够空间
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  contentOverlay: {
    justifyContent: 'flex-end',
  },
  placeholderCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'flex-end', // 改为底部对齐，与背景图片保持一致
    alignItems: 'stretch',
    position: 'relative',
    padding: 16,
  },
  placeholderText: {
    fontSize: 16, // 从14增加到16，与标题保持一致
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
  },
  name: {
    fontSize: 18, // 从16增加到18，让标题更突出
    fontWeight: 'bold',
    color: '#ffffff', // 白色文字在图片背景上更清晰
    lineHeight: 22, // 相应增加行高
    marginBottom: 6, // 增加底部间距
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  desc: {
    fontSize: 14, // 从12增加到14，提高可读性
    color: '#f0f0f0', // 浅灰白色
    lineHeight: 18, // 相应增加行高
    marginBottom: 8, // 增加底部间距
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    fontSize: 22, // 从18增加到22，让价格更醒目
    color: '#FFD700', // 金色价格更突出
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default ProductCard;
