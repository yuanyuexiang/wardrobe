import { gql, useQuery } from '@apollo/client';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

const GET_PRODUCT_DETAIL = gql`
  query GetProductDetail($id: ID!) {
    products_by_id(id: $id) {
      id
      name
      image
      price
      description
    }
  }
`;

const ProductDetail: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useQuery(GET_PRODUCT_DETAIL, { variables: { id } });

  if (loading) return <ActivityIndicator />;
  const product = data?.products_by_id;
  if (!product) return <Text>未找到商品</Text>;

  return (
    <View style={styles.container}>
      {/* 商品图片 */}
      {product.image && (
        <View style={styles.imageWrap}>
          <Image source={{ uri: product.image }} style={styles.image} />
        </View>
      )}
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>￥{product.price}</Text>
      <Text style={styles.desc}>{product.description}</Text>
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
  },
  price: {
    fontSize: 18,
    color: '#e91e63',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProductDetail;
