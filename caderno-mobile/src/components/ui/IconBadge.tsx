import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

interface IconBadgeProps {
  children: React.ReactNode;
  bg?: string;
  size?: number;
  style?: ViewStyle;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  children,
  bg = 'rgba(139, 92, 246, 0.15)',
  size = 42,
  style,
}) => {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
