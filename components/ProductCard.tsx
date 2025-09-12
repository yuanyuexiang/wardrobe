import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GetProductsQuery } from '../generated/graphql';
import { getDirectusThumbnailUrl } from '../utils/directus';
import { getCardWidth, TAB_BAR_HEIGHT } from '../utils/constants';

export type Product = GetProductsQuery['products'][0];

interface ProductCardProps {
  product: Product;
}

// 使用统一的卡片宽度计算
const cardWidth = getCardWidth();
// 计算安全的卡片高度，确保不会被底部导航栏遮挡
const cardHeight = cardWidth * 1.2; // 调整比例，从 /0.75 (1.33) 改为 *1.2

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
    height: cardHeight, // 使用安全的高度，确保不被导航栏遮挡
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
    flex: 2, // 减少图片区域比例，从3改为2
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    flex: 1, // 减少文字区域比例，从2改为1，更紧凑
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // 增加不透明度，从0.3改为0.75
    padding: 12, // 减少内边距，从16改为12
    justifyContent: 'flex-start', 
    minHeight: 80, // 减少最小高度，从100改为80
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
    fontSize: 16, // 减少字体大小，从20改为16，更紧凑
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 20, // 调整行高
    marginBottom: 6, // 减少间距
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  desc: {
    fontSize: 13, // 减少字体大小，从16改为13
    color: '#f5f5f5',
    lineHeight: 16, // 调整行高
    marginBottom: 6, // 减少间距，从10改为6
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  price: {
    fontSize: 18, // 减少字体大小，从24改为18，但保持醒目
    color: '#FFD700',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});

export default ProductCard;
