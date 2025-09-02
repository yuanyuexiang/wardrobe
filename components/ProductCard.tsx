import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GetProductsQuery } from '../generated/graphql';
import { getDirectusThumbnailUrl } from '../utils/directus';
import { getCardWidth } from '../utils/constants';

export type Product = GetProductsQuery['products'][0];

interface ProductCardProps {
  product: Product;
}

// 使用统一的卡片宽度计算
const cardWidth = getCardWidth();

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
          resizeMode="cover" // 恢复cover模式，但确保容器正确
        >
          {/* 使用flex布局：上半部分空白，下半部分是文字区域 */}
          <View style={styles.cardContent}>
            {/* 上半部分：空白区域让图片显示 */}
            <View style={styles.imageArea}>
            </View>
            
            {/* 下半部分：文字区域 */}
            <View style={styles.textArea}>
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
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
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
    width: cardWidth, // 使用动态计算的宽度
    height: cardWidth / 0.75, // 明确设置高度，确保4:3比例
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute', // 确保图片覆盖整个卡片
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column', // 垂直排列
    position: 'relative', // 确保内容在图片之上
    zIndex: 1,
  },
  imageArea: {
    flex: 3, // 增加到3，给图片更多空间
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    flex: 2, // 增加到2，给文字更多空间
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // 增加不透明度
    padding: 16,
    justifyContent: 'flex-start', // 改为从顶部开始排列
    minHeight: 100, // 添加最小高度确保可见
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
    fontSize: 20, // 增加到20px，确保移动端可见
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 }, // 增强阴影
    textShadowRadius: 4, // 增强阴影
  },
  desc: {
    fontSize: 16, // 增加到16px，确保移动端可见
    color: '#f5f5f5', // 更亮的颜色
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 }, // 增强阴影
    textShadowRadius: 4, // 增强阴影
  },
  price: {
    fontSize: 24, // 增加到24px，确保价格醒目
    color: '#FFD700', // 金色价格
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 }, // 增强阴影
    textShadowRadius: 4, // 增强阴影
  },
});

export default ProductCard;
