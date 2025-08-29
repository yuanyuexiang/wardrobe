import React from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
// 建议后续将用户相关 query/ mutation 也 codegen 自动生成

const UserInfoScreen: React.FC = () => {
  // 这里暂用 mock，实际项目建议用 codegen hooks
  const user = { id: '1', email: 'test@example.com', first_name: '张', last_name: '三' };
  const [firstName, setFirstName] = React.useState(user.first_name);
  const [lastName, setLastName] = React.useState(user.last_name);
  const [updating, setUpdating] = React.useState(false);

  const handleSave = async () => {
    setUpdating(true);
    // TODO: 调用 codegen 生成的 mutation
    setTimeout(() => setUpdating(false), 1000);
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
