import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GetProductsQuery } from '../generated/graphql';

export type Product = GetProductsQuery['products'][0];

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({ pathname: '/ProductDetail', params: { id: product.id } });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {product.main_image ? (
          <Image source={{ uri: product.main_image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      {product.subtitle && (
        <Text style={styles.desc} numberOfLines={1}>{product.subtitle}</Text>
      )}
      {product.price !== undefined && (
        <Text style={styles.price}>￥{product.price}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '48%',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#f8f8f8',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginHorizontal: 8,
    lineHeight: 18,
  },
  desc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    marginHorizontal: 8,
    lineHeight: 16,
  },
  price: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: 'bold',
    marginTop: 4,
    marginHorizontal: 8,
    marginBottom: 8,
  },
});

export default ProductCard;
