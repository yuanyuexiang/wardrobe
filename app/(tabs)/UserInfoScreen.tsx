import { gql, useMutation, useQuery } from '@apollo/client';
import React from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

const GET_USER = gql`
  query GetUser {
    users_me {
      id
      email
      first_name
      last_name
      avatar
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $first_name: String, $last_name: String) {
    update_users_item(id: $id, data: { first_name: $first_name, last_name: $last_name }) {
      id
      first_name
      last_name
    }
  }
`;

const UserInfoScreen: React.FC = () => {
  const { data, loading, refetch } = useQuery(GET_USER);
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');

  React.useEffect(() => {
    if (data?.users_me) {
      setFirstName(data.users_me.first_name || '');
      setLastName(data.users_me.last_name || '');
    }
  }, [data]);

  if (loading) return <ActivityIndicator />;
  const user = data?.users_me;
  if (!user) return <Text>未找到用户信息</Text>;

  const handleSave = async () => {
    await updateUser({ variables: { id: user.id, first_name: firstName, last_name: lastName } });
    refetch();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>邮箱: {user.email}</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="姓"
      />
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="名"
      />
      <Button title={updating ? '保存中...' : '保存'} onPress={handleSave} disabled={updating} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
});

export default UserInfoScreen;
