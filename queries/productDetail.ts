import { gql } from '@apollo/client';

export const GET_PRODUCT_DETAIL = gql`
  query GetProductDetail($id: ID!) {
    products_by_id(id: $id) {
      id
      name
      subtitle
      description
      price
      market_price
      stock
      barcode
      brand
      main_image
      images
      video_url
      is_on_sale
      status
      location
      total_sales_volume
      rating_avg
      total_reviews
      category_id {
        id
        name
        description
      }
    }
  }
`;
