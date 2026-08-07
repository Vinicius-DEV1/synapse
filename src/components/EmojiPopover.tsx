import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface EmojiPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  children: React.ReactNode;
}

export default function EmojiPopover({ onEmojiSelect, children }: EmojiPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left,
        y: rect.bottom + 8,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div 
        ref={triggerRef}
        onClick={(e) => { 
          e.stopPropagation(); 
          setIsOpen(!isOpen); 
        }} 
        className="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
      >
        {children}
      </div>
      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[100] animate-fade-in shadow-2xl" 
          style={{ 
            left: Math.min(coords.x, window.innerWidth - 350), 
            top: Math.min(coords.y, window.innerHeight - 450) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={(emoji: EmojiClickData) => {
              onEmojiSelect(emoji.emoji);
              setIsOpen(false);
            }}
            lazyLoadEmojis={true}
            searchDisabled={false}
            skinTonesDisabled={true}
          />
        </div>,
        document.body
      )}
    </>
  );
}
