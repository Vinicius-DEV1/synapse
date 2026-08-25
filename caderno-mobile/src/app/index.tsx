import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/AppContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PageScreen } from '../screens/PageScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { EpubReaderScreen } from '../screens/EpubReaderScreen';
import { DrawerContent } from '../components/drawer/DrawerContent';
import { colors } from '../theme/colors';

type ScreenType = 'home' | 'page' | 'library' | 'epub-reader';

interface NavigationState {
  screen: ScreenType;
  pageId?: string | null;
  bookId?: string | null;
}

export default function MainAppNavigator() {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppStore();
  const [currentNav, setCurrentNav] = useState<NavigationState>({ screen: 'home' });
  const [navHistory, setNavHistory] = useState<NavigationState[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navigateTo = useCallback((next: NavigationState) => {
    setNavHistory((prev) => [...prev, currentNav]);
    setCurrentNav(next);
    setIsDrawerOpen(false);
  }, [currentNav]);

  const goBack = useCallback(() => {
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return true;
    }

    if (navHistory.length > 0) {
      const prevNav = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, prev.length - 1));
      setCurrentNav(prevNav);
      if (prevNav.pageId) {
        dispatch({ type: 'SET_ACTIVE_PAGE', pageId: prevNav.pageId });
      }
      if (prevNav.bookId) {
        dispatch({ type: 'SET_ACTIVE_BOOK', bookId: prevNav.bookId });
      }
      return true;
    }

    if (currentNav.screen !== 'home') {
      setCurrentNav({ screen: 'home' });
      return true;
    }

    return false; // Allow app to exit if at root home
  }, [isDrawerOpen, navHistory, currentNav, dispatch]);

  // Native Android Hardware / Gesture Back Button Handler
  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return goBack();
    });
    return () => backSubscription.remove();
  }, [goBack]);

  // If user is not yet authenticated, display secure E2EE Login Screen
  if (!state.isAuth) {
    return <LoginScreen />;
  }

  const navigateToPage = (pageId: string) => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId });
    navigateTo({ screen: 'page', pageId });
  };

  const navigateToLibrary = () => {
    navigateTo({ screen: 'library' });
  };

  const navigateToBook = (bookId: string) => {
    dispatch({ type: 'SET_ACTIVE_BOOK', bookId });
    navigateTo({ screen: 'epub-reader', bookId });
  };

  const navigateToHome = () => {
    setNavHistory([]);
    setCurrentNav({ screen: 'home' });
    setIsDrawerOpen(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Active Screen */}
      {currentNav.screen === 'home' && (
        <HomeScreen
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigateToPage={navigateToPage}
          onNavigateToLibrary={navigateToLibrary}
          onNavigateToBook={navigateToBook}
        />
      )}

      {currentNav.screen === 'page' && currentNav.pageId && (
        <PageScreen
          pageId={currentNav.pageId}
          onBack={goBack}
          onNavigateToPage={navigateToPage}
        />
      )}

      {currentNav.screen === 'library' && (
        <LibraryScreen
          onBack={goBack}
          onNavigateToBook={navigateToBook}
        />
      )}

      {currentNav.screen === 'epub-reader' && currentNav.bookId && (
        <EpubReaderScreen
          bookId={currentNav.bookId}
          onBack={goBack}
        />
      )}

      {/* Drawer Overlay Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDrawerOpen(false)}>
          <View style={styles.drawerBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.drawerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <DrawerContent
                  onNavigateToPage={navigateToPage}
                  onNavigateToLibrary={navigateToLibrary}
                  onNavigateToHome={navigateToHome}
                  onCloseDrawer={() => setIsDrawerOpen(false)}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: colors.darkBg,
  },
});
