import { describe, it, expect } from 'vitest';
import { detectFileType } from './file-type-detector';

describe('detectFileType', () => {
  it('identifies PDF documents', () => {
    expect(detectFileType('book.pdf')).toBe('pdf');
    expect(detectFileType('DOCUMENT.PDF')).toBe('pdf');
  });

  it('identifies image formats', () => {
    expect(detectFileType('photo.png')).toBe('image');
    expect(detectFileType('pic.jpg')).toBe('image');
    expect(detectFileType('graphic.jpeg')).toBe('image');
    expect(detectFileType('vector.svg')).toBe('image');
    expect(detectFileType('anim.gif')).toBe('image');
    expect(detectFileType('modern.webp')).toBe('image');
  });

  it('identifies video formats', () => {
    expect(detectFileType('movie.mp4')).toBe('video');
    expect(detectFileType('clip.mkv')).toBe('video');
    expect(detectFileType('web.webm')).toBe('video');
    expect(detectFileType('record.mov')).toBe('video');
  });

  it('identifies e-books', () => {
    expect(detectFileType('novel.epub')).toBe('epub');
  });

  it('identifies presentations / slides', () => {
    expect(detectFileType('deck.pptx')).toBe('slide');
    expect(detectFileType('slides.ppt')).toBe('slide');
    expect(detectFileType('presentation.key')).toBe('slide');
    expect(detectFileType('notes.odp')).toBe('slide');
  });

  it('identifies text and code formats including tsx', () => {
    expect(detectFileType('readme.md')).toBe('text');
    expect(detectFileType('notes.txt')).toBe('text');
    expect(detectFileType('config.json')).toBe('text');
    expect(detectFileType('Component.tsx')).toBe('text');
    expect(detectFileType('script.ts')).toBe('text');
    expect(detectFileType('app.jsx')).toBe('text');
    expect(detectFileType('main.js')).toBe('text');
    expect(detectFileType('styles.css')).toBe('text');
    expect(detectFileType('index.html')).toBe('text');
  });

  it('identifies archives and fallback to other', () => {
    expect(detectFileType('bundle.zip')).toBe('archive');
    expect(detectFileType('backup.tar.gz')).toBe('archive');
    expect(detectFileType('archive.7z')).toBe('archive');
    expect(detectFileType('unknown.xyz123')).toBe('other');
  });
});
