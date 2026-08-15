import { useCallback } from 'react';
import { useStore } from '../../store/useStore';

export function useAiSidebarResize() {
  const { state, dispatch } = useStore();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = state.aiSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      let newWidth = startWidth + deltaX;
      
      if (newWidth < 300) newWidth = 300;
      if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;

      dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: newWidth });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [state.aiSidebarWidth, dispatch]);

  const handleResetWidth = useCallback(() => {
    dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: 340 });
  }, [dispatch]);

  return {
    width: state.aiSidebarWidth,
    handleMouseDown,
    handleResetWidth
  };
}
