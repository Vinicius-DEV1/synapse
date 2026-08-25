import React from 'react';
import PagerView from 'react-native-pager-view';

interface NativePagerProps {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
  style?: any;
}

export const NativePager = React.forwardRef<any, NativePagerProps>(
  ({ initialPage = 0, onPageSelected, children, style }, ref) => {
    return (
      <PagerView
        ref={ref}
        style={style}
        initialPage={initialPage}
        onPageSelected={onPageSelected}
      >
        {children}
      </PagerView>
    );
  }
);
