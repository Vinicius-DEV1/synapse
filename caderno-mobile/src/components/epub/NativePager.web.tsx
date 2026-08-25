import React from 'react';
import { View, StyleSheet } from 'react-native';

interface NativePagerProps {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
  style?: any;
}

export const NativePager = React.forwardRef<any, NativePagerProps>(
  ({ initialPage = 0, onPageSelected, children, style }, ref) => {
    const childArray = React.Children.toArray(children);
    const [currentPage, setCurrentPage] = React.useState(initialPage);

    React.useImperativeHandle(ref, () => ({
      setPage: (page: number) => {
        setCurrentPage(page);
        onPageSelected?.({ nativeEvent: { position: page } });
      },
    }));

    return (
      <View style={[styles.container, style]}>
        {childArray[currentPage] || null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
