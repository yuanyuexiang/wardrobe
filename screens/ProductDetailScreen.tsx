import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useGetProductsQuery } from '../generated/graphql';

const ProductDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 复用 GetProductsQuery，实际项目建议单独写详情 query
  const { data, loading } = useGetProductsQuery({ variables: { search: '', categoryFilter: undefined, limit: 1, offset: 0 } });
  const product = data?.products.find(p => p.id === id);

  if (loading) return <ActivityIndicator />;
  if (!product) return <Text>未找到商品</Text>;

  return (
    <View style={styles.container}>
      {product.main_image && (
        <View style={styles.imageWrap}>
          <Image source={{ uri: product.main_image }} style={styles.image} />
        </View>
      )}
      <Text style={styles.name}>{product.name}</Text>
      {product.subtitle && <Text style={styles.desc}>{product.subtitle}</Text>}
      <Text style={styles.price}>￥{product.price}</Text>
      {product.description && <Text style={styles.desc}>{product.description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  imageWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  price: {
    fontSize: 18,
    color: '#e91e63',
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default ProductDetailScreen;
