import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface TabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Tab: React.FC<TabProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, selected && styles.selectedTab]}
  >
    <Text style={[styles.tabText, selected && styles.selectedTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTab: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  tabText: {
    fontSize: 15, // 增加标签文字大小，提高可读性
    color: '#666',
    fontWeight: '500',
  },
  selectedTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Tab;
