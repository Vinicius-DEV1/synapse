import { useRef, useEffect, useCallback, useState } from 'react';
import FloatingToolbar from './FloatingToolbar';
import BlockHandle from './BlockHandle';
import SlashMenu from './SlashMenu';
import PageSearchMenu from './PageSearchMenu';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useStore } from '../store/useStore';
import ImageViewerModal from './ImageViewerModal';
import { Copy, Trash, Sparkles } from 'lucide-react';
import { getSettings } from '../utils/settings';
import type { AppSettings } from '../utils/settings';
import AiPromptModal from './AiPromptModal';

interface EditorProps {
  pageId: string | null;
  initialContent: string;
  onSave: (content: string, embeddedSaves?: {id: string, content: string}[]) => void;
  onCreateLinkedPage?: (title: string) => Promise<string>;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/g;

export default function Editor({ pageId, initialContent, onSave, onCreateLinkedPage }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<{ node: HTMLElement; x: number; y: number } | null>(null);
  const [calloutEmojiPicker, setCalloutEmojiPicker] = useState<{ node: HTMLElement; x: number; y: number } | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, query: string, node: Node } | null>(null);
  const [pageMenu, setPageMenu] = useState<{ x: number, y: number, query: string, node: Node } | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [aiModal, setAiModal] = useState<{ x: number, y: number, contextText?: string, contextImage?: string, targetNode?: Node, chatId?: string } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const { state, dispatch } = useStore();
  const lastPageIdRef = useRef(pageId);
  const isComposingRef = useRef(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Listen to settings changes
  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  // Drag and Drop State
  const draggedNodeRef = useRef<HTMLElement | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    left: number;
    width: number;
    targetNode: HTMLElement;
    position: 'before' | 'after';
  } | null>(null);

  // Debounced save
  const debouncedSave = useCallback(
    debounce((editorContentHtml: string) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorContentHtml;
      
      const embeddedSaves: {id: string, content: string}[] = [];
      
      const embeds = tempDiv.querySelectorAll('.page-embed-content:not(.hidden)');
      embeds.forEach(embed => {
        const pageId = (embed.closest('.page-reference') as HTMLElement)?.dataset.pageId;
        if (pageId) {
          embeddedSaves.push({ id: pageId, content: embed.innerHTML });
        }
      });

      // Strip all embed contents before saving the main page
      tempDiv.querySelectorAll('.page-embed-content').forEach(embed => {
        embed.innerHTML = '';
      });

      onSave(tempDiv.innerHTML, embeddedSaves);
    }, 800),
    [onSave]
  );

  // Load content when pageId changes
  useEffect(() => {
    if (editorRef.current && pageId !== lastPageIdRef.current) {
      editorRef.current.innerHTML = initialContent || '<p><br></p>';
      
      // Reset question blocks
      editorRef.current.querySelectorAll('.question-block').forEach(qb => {
        qb.setAttribute('data-answered', 'false');
        qb.querySelectorAll('input[type="radio"]').forEach((radio: any) => {
          radio.checked = false;
        });

        // Add delete button if it doesn't exist
        if (!qb.querySelector('.question-delete-btn')) {
          qb.classList.add('relative');
          const delBtn = document.createElement('button');
          delBtn.className = 'question-delete-btn absolute top-2 right-2 p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors';
          delBtn.contentEditable = 'false';
          delBtn.title = 'Deletar Questão';
          delBtn.innerHTML = '🗑️';
          qb.insertBefore(delBtn, qb.firstChild);
        }
      });

      lastPageIdRef.current = pageId;
    }
  }, [pageId, initialContent]);

  // Synchronize page reference titles when state.pages changes
  useEffect(() => {
    if (!editorRef.current) return;
    
    let needsSave = false;
    const pageRefs = editorRef.current.querySelectorAll('.page-reference');
    
    pageRefs.forEach(ref => {
      const pId = (ref as HTMLElement).dataset.pageId;
      if (!pId) return;
      
      const targetPage = state.pages.find(p => p.id === pId);
      if (targetPage) {
        const nameSpan = ref.querySelector('.page-name');
        if (nameSpan) {
          const expectedText = `📄 ${targetPage.title}`;
          if (nameSpan.textContent !== expectedText) {
            nameSpan.textContent = expectedText;
            needsSave = true;
          }
        }
      }
    });

    if (needsSave) {
      debouncedSave(editorRef.current.innerHTML);
    }
  }, [state.pages, debouncedSave]);

  // Initial content load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent || '<p><br></p>';
      
      // Reset question blocks
      editorRef.current.querySelectorAll('.question-block').forEach(qb => {
        qb.setAttribute('data-answered', 'false');
        qb.querySelectorAll('input[type="radio"]').forEach((radio: any) => {
          radio.checked = false;
        });

        // Add delete button if it doesn't exist
        if (!qb.querySelector('.question-delete-btn')) {
          qb.classList.add('relative');
          const delBtn = document.createElement('button');
          delBtn.className = 'question-delete-btn absolute top-2 right-2 p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors';
          delBtn.contentEditable = 'false';
          delBtn.title = 'Deletar Questão';
          delBtn.innerHTML = '🗑️';
          qb.insertBefore(delBtn, qb.firstChild);
        }
      });
      
      const ensureTrailingEditable = (container: Element) => {
        const last = container.lastElementChild;
        if (!last || last.getAttribute('contenteditable') === 'false' || (last.tagName !== 'P' && last.tagName !== 'DIV' && last.tagName !== 'UL' && last.tagName !== 'OL')) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          container.appendChild(p);
        }
      };
      ensureTrailingEditable(editorRef.current);
      editorRef.current.querySelectorAll('.group-content, .toggle-content, .callout-content').forEach(ensureTrailingEditable);
    }
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposingRef.current) return;
    
    // Check all p and div elements for the patterns
    const elements = editorRef.current.querySelectorAll('p, div:not(.todo-item):not(.callout-block):not(.editor-content)');
    
    elements.forEach(el => {
      const text = el.textContent || '';
      
      // Pattern: starts with [] followed by space
      if (text.match(/^\[\][\s\u00A0]/)) {
        const remainingText = text.substring(3);
        const todoDiv = document.createElement('div');
        todoDiv.className = 'todo-item';
        todoDiv.innerHTML = `<input type="checkbox" /><span contenteditable="true">${remainingText || '<br>'}</span>`;
        el.replaceWith(todoDiv);
        
        const span = todoDiv.querySelector('span');
        if (span) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(span);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } 
      // Pattern: starts with # to ###### followed by space (H1 to H6)
      else if (text.match(/^(#{1,6})[\s\u00A0]/)) {
        const match = text.match(/^(#{1,6})[\s\u00A0]/);
        if (match) {
          const level = match[1].length;
          const remainingText = text.substring(level + 1);
          const h = document.createElement(`h${level}`);
          h.innerHTML = remainingText || '<br>';
          el.replaceWith(h);
          
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(h);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with /callout followed by space
      else if (text.match(/^\/callout[\s\u00A0]/)) {
        const remainingText = text.substring(9);
        const calloutDiv = document.createElement('div');
        calloutDiv.className = 'callout-block';
        calloutDiv.innerHTML = `<span class="callout-icon" contenteditable="false">💡</span><div class="callout-content" contenteditable="true">${remainingText || '<br>'}</div>`;
        
        // Always create a paragraph below the callout
        const afterP = document.createElement('p');
        afterP.innerHTML = '<br>';
        el.replaceWith(calloutDiv);
        calloutDiv.after(afterP);
        
        const content = calloutDiv.querySelector('.callout-content');
        if (content) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(content);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with - or * followed by space
      else if (text.match(/^[-*][\s\u00A0]/)) {
        const remainingText = text.substring(2);
        const ul = document.createElement('ul');
        ul.className = 'list-disc pl-6 my-1 marker:text-dark-subtext';
        ul.innerHTML = `<li>${remainingText || '<br>'}</li>`;
        el.replaceWith(ul);
        
        const li = ul.querySelector('li');
        if (li) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(li);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with 1. followed by space
      else if (text.match(/^1\.[\s\u00A0]/)) {
        const remainingText = text.substring(3);
        const ol = document.createElement('ol');
        ol.className = 'list-decimal pl-6 my-1 marker:text-dark-subtext';
        ol.innerHTML = `<li>${remainingText || '<br>'}</li>`;
        el.replaceWith(ol);
        
        const li = ol.querySelector('li');
        if (li) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(li);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with > followed by space
      else if (text.match(/^>[\s\u00A0]/)) {
        const remainingText = text.substring(2);
        const details = document.createElement('details');
        details.className = 'toggle-block my-1 marker:text-dark-subtext';
        details.open = true;
        details.innerHTML = `<summary class="cursor-pointer outline-none font-medium" contenteditable="true">${remainingText || '<br>'}</summary><div class="toggle-content pl-6 mt-1 text-dark-subtext" contenteditable="true"><p><br></p></div>`;
        el.replaceWith(details);
        
        const summary = details.querySelector('summary');
        if (summary) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(summary);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with ``` followed by space
      else if (text.match(/^```[\s\u00A0]/)) {
        const remainingText = text.substring(4);
        const pre = document.createElement('pre');
        pre.className = 'code-block bg-black/40 border border-white/10 p-4 rounded-lg my-2 overflow-x-auto font-mono text-sm text-brand-300';
        pre.innerHTML = `<code contenteditable="true" class="outline-none block">${remainingText || '<br>'}</code>`;
        
        const afterP = document.createElement('p');
        afterP.innerHTML = '<br>';
        
        el.replaceWith(pre);
        pre.after(afterP);
        
        const code = pre.querySelector('code');
        if (code) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(code);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      // Pattern: starts with --- followed by space
      else if (text.match(/^---[\s\u00A0]/)) {
        const hr = document.createElement('hr');
        hr.className = 'editor-divider';
        hr.contentEditable = 'false';
        
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        
        if (el.parentNode) {
          el.parentNode.insertBefore(hr, el);
        }
        el.replaceWith(newP);
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(newP);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });

    // Slash Menu & Page Menu detection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const textToCursor = node.textContent?.slice(0, range.startOffset) || '';
        const match = textToCursor.match(/(?:^|\s)\/([a-zA-Z0-9-\s\u00A0]*)$/);
        
        if (match) {
          const rect = range.getBoundingClientRect();
          let x = rect.left;
          let y = rect.bottom;
          
          if (rect.width === 0 && rect.height === 0) {
            const elRect = node.parentElement?.getBoundingClientRect();
            if (elRect) {
              x = elRect.left + (textToCursor.length * 8); // approx cursor offset
              y = elRect.bottom;
            }
          }
          
          const query = match[1].replace(/\u00A0/g, ' '); // normalize spaces
          if (query.startsWith('page ')) {
            setSlashMenu(null);
            setPageMenu({
              x,
              y: y + 4,
              query: query.substring(5),
              node
            });
          } else if (!query.includes(' ')) {
            setPageMenu(null);
            setSlashMenu({
              x,
              y: y + 4,
              query,
              node
            });
          } else {
            setSlashMenu(null);
            setPageMenu(null);
          }
        } else {
          setSlashMenu(null);
          setPageMenu(null);
        }
      } else {
         setSlashMenu(null);
         setPageMenu(null);
      }
    }

    const ensureTrailingEditable = (container: Element) => {
      const last = container.lastElementChild;
      if (!last || last.getAttribute('contenteditable') === 'false' || (last.tagName !== 'P' && last.tagName !== 'DIV' && last.tagName !== 'UL' && last.tagName !== 'OL')) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        container.appendChild(p);
      }
    };
    ensureTrailingEditable(editorRef.current);
    editorRef.current.querySelectorAll('.group-content, .toggle-content, .callout-content').forEach(ensureTrailingEditable);

    debouncedSave(editorRef.current.innerHTML);
  }, [debouncedSave]);

  const handlePageSelect = useCallback(async (pageId: string | 'new', pageTitle: string) => {
    if (!pageMenu) return;
    
    let targetPageId = pageId;
    if (pageId === 'new' && onCreateLinkedPage) {
      targetPageId = await onCreateLinkedPage(pageTitle);
      if (!targetPageId) return;
    }
    
    const node = pageMenu.node;
    if (node.textContent) {
      const regex = new RegExp(`(?:^|\\s)/page ${pageMenu.query}$`);
      node.textContent = node.textContent.replace(regex, (match) => match.startsWith(' ') ? ' ' : '');
    }
    
    setPageMenu(null);
    
    const block = node.parentElement?.closest('p, h1, h2, h3, h4, h5, h6, .todo-item, .callout-block, .group-content') as HTMLElement;
    if (!block) return;
    
    const replacementHtml = `
      <div class="page-reference bg-dark-card/30 p-2 rounded-lg my-2 border border-white/5" data-page-id="${targetPageId}" contenteditable="false">
        <div class="flex items-center gap-2">
          <button class="toggle-embed-btn p-1 hover:bg-white/10 rounded transition-colors" contenteditable="false">⏬</button>
          <span class="page-name cursor-pointer hover:underline text-brand-300" contenteditable="false">📄 ${pageTitle}</span>
        </div>
        <div class="page-embed-content hidden pl-4 mt-2 border-l-2 border-brand-500/30 text-dark-text/90" contenteditable="true"></div>
      </div><p><br></p>`;
      
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = replacementHtml;
    
    const newNodes = Array.from(tempDiv.childNodes);
    const parent = block.parentNode;
    
    if (parent) {
      newNodes.forEach(n => parent.insertBefore(n, block));
      if (block.textContent?.trim() === '') {
        block.remove();
      }
    }
    
    const targetForCursor = newNodes[newNodes.length - 1] as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(targetForCursor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
  }, [pageMenu, debouncedSave, onCreateLinkedPage]);

  const handleSlashSelect = useCallback((commandId: string) => {
    if (!slashMenu) return;
    
    const node = slashMenu.node;

    if (commandId === 'page') {
      if (node.textContent) {
        const regex = new RegExp(`(?:^|\\s)/${slashMenu.query}$`);
        node.textContent = node.textContent.replace(regex, (match) => match.startsWith(' ') ? ' /page \u00A0' : '/page \u00A0');
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setSlashMenu(null);
      const rect = node.parentElement?.getBoundingClientRect();
      if (rect) {
        setPageMenu({
          x: rect.left,
          y: rect.bottom + 4,
          query: '',
          node
        });
      }
      return;
    }

    if (commandId === 'ia') {
      if (node.textContent) {
        const regex = new RegExp(`(?:^|\\s)/${slashMenu.query}$`);
        node.textContent = node.textContent.replace(regex, (match) => match.startsWith(' ') ? ' ' : '');
      }
      setSlashMenu(null);
      const rect = node.parentElement?.getBoundingClientRect();
      if (rect) {
        setAiModal({
          x: rect.left,
          y: rect.bottom + 4,
          targetNode: node,
          chatId: `prompt_${Date.now()}`
        });
      }
      return;
    }

    if (node.textContent) {
      const regex = new RegExp(`(?:^|\\s)/${slashMenu.query}$`);
      node.textContent = node.textContent.replace(regex, (match) => match.startsWith(' ') ? ' ' : '');
    }
    
    setSlashMenu(null);
    
    const block = node.parentElement?.closest('p, h1, h2, h3, h4, h5, h6, .todo-item, .callout-block, .group-content, .table-wrapper') as HTMLElement;
    if (!block) return;
    
    let replacementHtml = '';
    let isBlock = false;
    
    switch (commandId) {
      case 'h1': replacementHtml = `<h1>${block.innerHTML}</h1>`; isBlock = true; break;
      case 'h2': replacementHtml = `<h2>${block.innerHTML}</h2>`; isBlock = true; break;
      case 'h3': replacementHtml = `<h3>${block.innerHTML}</h3>`; isBlock = true; break;
      case 'text': replacementHtml = `<p>${block.innerHTML || '<br>'}</p>`; isBlock = true; break;
      case 'todo': 
        replacementHtml = `<div class="todo-item"><input type="checkbox" /><span contenteditable="true">${block.innerHTML || '<br>'}</span></div>`; 
        isBlock = true; 
        break;
      case 'bullet':
        replacementHtml = `<ul><li>${block.innerHTML || '<br>'}</li></ul>`;
        isBlock = true;
        break;
      case 'callout':
        replacementHtml = `<div class="callout-block"><span class="callout-icon" contenteditable="false">💡</span><div class="callout-content" contenteditable="true">${block.innerHTML || '<br>'}</div></div><p><br></p>`;
        isBlock = true;
        break;
      case 'toggle':
        replacementHtml = `<details class="toggle-block my-1 marker:text-dark-subtext" open><summary class="cursor-pointer outline-none font-medium" contenteditable="true">${block.innerHTML || '<br>'}</summary><div class="toggle-content pl-6 mt-1 text-dark-subtext" contenteditable="true"><p><br></p></div></details>`;
        isBlock = true;
        break;
      case 'code':
        replacementHtml = `<pre class="code-block bg-black/40 border border-white/10 p-4 rounded-lg my-2 overflow-x-auto font-mono text-sm text-brand-300"><code contenteditable="true" class="outline-none block">${block.innerHTML || '<br>'}</code></pre><p><br></p>`;
        isBlock = true;
        break;
      case 'group':
        replacementHtml = `
          <div class="group-collection bg-dark-bg border border-white/10 rounded-xl my-4 overflow-hidden shadow-lg shadow-black/20" contenteditable="false">
            <div class="group-header flex items-center gap-2 p-3 bg-dark-card border-b border-white/5 transition-colors hover:bg-white/5" contenteditable="false">
              <button class="toggle-group-btn p-1 hover:bg-white/10 rounded transition-colors text-brand-400 font-bold" contenteditable="false">🔽🔽</button>
              <span class="group-title-icon text-lg" contenteditable="false">📁</span>
              <span class="group-title font-bold outline-none flex-1 text-brand-100 bg-transparent placeholder-white/30" contenteditable="true" data-placeholder="Nome da Coleção...">${block.innerHTML && block.innerHTML !== '<br>' ? block.innerHTML : ''}</span>
            </div>
            <div class="group-content p-4 pl-8 border-l-2 border-white/5 ml-4" contenteditable="true">
              <p><br></p>
            </div>
          </div>
          <p><br></p>`;
        isBlock = true;
        break;
      case 'divider':
        replacementHtml = `<hr class="editor-divider" contenteditable="false" /><p><br></p>`;
        isBlock = true;
        break;
      case 'table':
        replacementHtml = `
          <div class="table-wrapper my-4" contenteditable="false">
            <table class="editor-table w-full border-collapse border border-white/10" contenteditable="false">
              <tbody>
                <tr>
                  <td class="border border-white/10 p-2 min-w-[100px] outline-none" contenteditable="true"><br></td>
                  <td class="border border-white/10 p-2 min-w-[100px] outline-none" contenteditable="true"><br></td>
                </tr>
                <tr>
                  <td class="border border-white/10 p-2 min-w-[100px] outline-none" contenteditable="true"><br></td>
                  <td class="border border-white/10 p-2 min-w-[100px] outline-none" contenteditable="true"><br></td>
                </tr>
              </tbody>
            </table>
            <div class="table-controls flex gap-2 mt-1 opacity-0 transition-opacity" contenteditable="false">
              <button class="add-row-btn text-xs text-brand-400 hover:bg-white/10 px-2 py-1 rounded transition-colors" contenteditable="false">+ Linha</button>
              <button class="add-col-btn text-xs text-brand-400 hover:bg-white/10 px-2 py-1 rounded transition-colors" contenteditable="false">+ Coluna</button>
            </div>
          </div>
          <p><br></p>`;
        isBlock = true;
        break;
      case 'question':
        replacementHtml = `
          <div class="question-block relative" data-answered="false" data-correct-index="0" contenteditable="false">
            <button class="question-delete-btn absolute top-2 right-2 p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors" contenteditable="false" title="Deletar Questão">🗑️</button>
            <div class="question-text" contenteditable="true">Escreva sua pergunta aqui...</div>
            <div class="question-options">
              <div class="question-option" data-index="0">
                <input type="radio" name="q_${Date.now()}" value="0">
                <span contenteditable="true">Opção A (Correta)</span>
              </div>
              <div class="question-option" data-index="1">
                <input type="radio" name="q_${Date.now()}" value="1">
                <span contenteditable="true">Opção B</span>
              </div>
              <div class="question-option" data-index="2">
                <input type="radio" name="q_${Date.now()}" value="2">
                <span contenteditable="true">Opção C</span>
              </div>
              <div class="question-option" data-index="3">
                <input type="radio" name="q_${Date.now()}" value="3">
                <span contenteditable="true">Opção D</span>
              </div>
            </div>
            <button class="question-answer-btn">Responder</button>
          </div>
          <p><br></p>`;
        isBlock = true;
        break;
    }
    
    if (isBlock) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = replacementHtml;
      
      const newNodes = Array.from(tempDiv.childNodes);
      const parent = block.parentNode;
      let targetForCursor = newNodes[0] as HTMLElement;
      
      if (parent) {
        newNodes.forEach(n => parent.insertBefore(n, block));
        block.remove();
      }
      
      if (commandId === 'todo') targetForCursor = targetForCursor.querySelector('span') as HTMLElement;
      if (commandId === 'callout') targetForCursor = targetForCursor.querySelector('.callout-content') as HTMLElement;
      if (commandId === 'toggle') targetForCursor = targetForCursor.querySelector('summary') as HTMLElement;
      if (commandId === 'code') targetForCursor = targetForCursor.querySelector('code') as HTMLElement;
      if (commandId === 'bullet') targetForCursor = targetForCursor.querySelector('li') as HTMLElement;
      if (commandId === 'group') targetForCursor = targetForCursor.querySelector('.group-title') as HTMLElement;
      if (commandId === 'table') targetForCursor = targetForCursor.querySelector('td') as HTMLElement;
      if (commandId === 'question') targetForCursor = targetForCursor.querySelector('.question-text') as HTMLElement;
      if (commandId === 'divider') targetForCursor = newNodes[1] as HTMLElement;
      
      if (targetForCursor) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(targetForCursor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
    }
  }, [slashMenu, debouncedSave]);

  // Handle paste (images + smart links)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;

    // Check for images
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target?.result as string;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '12px';
            img.style.margin = '8px 8px 8px 0';
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'top';

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              range.collapse(false);
            }

            if (editorRef.current) {
              debouncedSave(editorRef.current.innerHTML);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }

    // Check for plain text with URLs
    const text = clipboardData.getData('text/plain');
    if (text && URL_REGEX.test(text)) {
      // If it's ONLY a URL, create a smart link
      const trimmed = text.trim();
      if (trimmed.match(/^https?:\/\/\S+$/)) {
        e.preventDefault();
        const link = document.createElement('a');
        link.href = trimmed;
        link.textContent = trimmed;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(link);
          range.collapse(false);
        }

        if (editorRef.current) {
          debouncedSave(editorRef.current.innerHTML);
        }
        return;
      }
    }
  }, [debouncedSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (slashMenu) {
      if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape') {
        // Allow SlashMenu global keydown to handle these
        return;
      }
    }

    const target = e.target as HTMLElement;

    if (selectedImage) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        selectedImage.remove();
        setSelectedImage(null);
        if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNode(selectedImage);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand('copy');
        return;
      }
    }

    if (target.classList.contains('group-title')) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const groupContent = target.closest('.group-collection')?.querySelector('.group-content');
        if (groupContent) {
           const first = groupContent.firstElementChild as HTMLElement;
           if (first) {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(first);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
           }
        }
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const node = selection.getRangeAt(0).startContainer;
      const block = node.parentElement?.closest('li, .todo-item, p, h1, h2, h3, h4, h5, h6, .callout-block') as HTMLElement;
      if (block) {
        const currentMargin = parseInt(block.style.marginLeft || '0', 10);
        if (e.shiftKey) {
          block.style.marginLeft = Math.max(0, currentMargin - 24) + 'px';
        } else {
          block.style.marginLeft = (currentMargin + 24) + 'px';
        }
        if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
      }
      return;
    }

    // Enter and Backspace in editor
    if (!e.shiftKey && (e.key === 'Enter' || e.key === 'Backspace')) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement as HTMLElement;
        }
        const parentEl = node as HTMLElement;
        const todoItem = parentEl?.closest('.todo-item');
        const calloutBlock = parentEl?.closest('.callout-block');

        if (todoItem) {
          const span = todoItem.querySelector('span');
          const textContent = span?.textContent?.trim() || '';

          if (e.key === 'Enter') {
            e.preventDefault();
            if (textContent === '') {
              // Break out of list
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              todoItem.replaceWith(p);
              
              const newRange = document.createRange();
              newRange.selectNodeContents(p);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              // Create new todo
              const newTodo = document.createElement('div');
              newTodo.className = 'todo-item';
              newTodo.innerHTML = '<input type="checkbox" /><span contenteditable="true"><br></span>';
              todoItem.after(newTodo);
              
              const newSpan = newTodo.querySelector('span');
              if (newSpan) {
                const newRange = document.createRange();
                newRange.selectNodeContents(newSpan);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          } else if (e.key === 'Backspace') {
            // Only convert back if we are at the beginning
            if (range.startOffset === 0 && selection.isCollapsed) {
              e.preventDefault();
              const p = document.createElement('p');
              p.innerHTML = span?.innerHTML || '<br>';
              todoItem.replaceWith(p);
              
              const newRange = document.createRange();
              newRange.setStart(p.firstChild || p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        } else if (calloutBlock) {
          if (e.key === 'Enter') {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const r = sel.getRangeAt(0);
              const content = calloutBlock.querySelector('.callout-content') as HTMLElement;
              
              const clone = r.cloneRange();
              clone.selectNodeContents(content);
              clone.setStart(r.endContainer, r.endOffset);
              const isAtEnd = clone.toString().replace(/\u200B/g, '').trim() === '';

              let isDoubleEnter = false;
              const node = r.startContainer;
              if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent?.replace(/\u200B/g, '') === '') {
                  if (node.previousSibling?.nodeName === 'BR') isDoubleEnter = true;
                }
              } else {
                const prev = node.childNodes[r.startOffset - 1];
                if (prev?.nodeName === 'BR') isDoubleEnter = true;
              }
              
              // If callout content is completely empty
              const isEmpty = content.textContent?.replace(/\u200B/g, '').trim() === '';

              // Break out if empty OR double enter at the end
              if (isEmpty || (isAtEnd && isDoubleEnter)) {
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                calloutBlock.after(newP);

                const newRange = document.createRange();
                newRange.selectNodeContents(newP);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
                return;
              }

              // Otherwise insert a real line break at cursor position
              r.deleteContents();

              const br = document.createElement('br');
              r.insertNode(br);

              let nextNode = br.nextSibling;
              if (!nextNode || (nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent === '')) {
                const zwsp = document.createTextNode('\u200B');
                br.parentNode?.insertBefore(zwsp, br.nextSibling);
                nextNode = zwsp;
              }

              const newRange = document.createRange();
              newRange.setStartAfter(br);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);

              if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
            }
          }
        }
      }
    }

    // Escape inside callout exits it
    if (e.key === 'Escape') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement as HTMLElement;
        const calloutBlock = (node as HTMLElement)?.closest('.callout-block');
        if (calloutBlock) {
          e.preventDefault();
          const newP = document.createElement('p');
          newP.innerHTML = '<br>';
          calloutBlock.after(newP);
          const newRange = document.createRange();
          newRange.selectNodeContents(newP);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        }
      }
    }
  }, [debouncedSave]);

  // Handle checkbox clicks via event delegation
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      const todoItem = checkbox.closest('.todo-item');
      if (todoItem) {
        if (checkbox.checked) {
          todoItem.classList.add('completed');
        } else {
          todoItem.classList.remove('completed');
        }
        if (editorRef.current) {
          debouncedSave(editorRef.current.innerHTML);
        }
      }
    }

    // Handle callout icon clicks for emoji picker
    if (target.classList.contains('callout-icon')) {
      const rect = target.getBoundingClientRect();
      setCalloutEmojiPicker({
        node: target,
        x: rect.left,
        y: rect.bottom + 8,
      });
      return;
    }

    // Handle AI chat reference clicks
    const aiChatRef = target.closest('.ai-chat-reference');
    if (aiChatRef) {
      e.preventDefault();
      const chatId = aiChatRef.getAttribute('data-chat-id');
      if (chatId) {
        dispatch({ type: 'OPEN_AI_CHAT', chatId });
      }
      return;
    }

    // Handle Table add row
    if (target.classList.contains('add-row-btn')) {
      e.preventDefault();
      const wrapper = target.closest('.table-wrapper');
      const tbody = wrapper?.querySelector('tbody');
      if (tbody) {
        const firstRow = tbody.querySelector('tr');
        if (firstRow) {
          const newRow = document.createElement('tr');
          const colsCount = firstRow.querySelectorAll('td').length;
          for (let i = 0; i < colsCount; i++) {
            const td = document.createElement('td');
            td.className = 'border border-white/10 p-2 min-w-[100px] outline-none';
            td.contentEditable = 'true';
            td.innerHTML = '<br>';
            newRow.appendChild(td);
          }
          tbody.appendChild(newRow);
          if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        }
      }
      return;
    }

    // Handle Table add col
    if (target.classList.contains('add-col-btn')) {
      e.preventDefault();
      const wrapper = target.closest('.table-wrapper');
      const rows = wrapper?.querySelectorAll('tr');
      if (rows && rows.length > 0) {
        rows.forEach(row => {
          const td = document.createElement('td');
          td.className = 'border border-white/10 p-2 min-w-[100px] outline-none';
          td.contentEditable = 'true';
          td.innerHTML = '<br>';
          row.appendChild(td);
        });
        if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
      }
      return;
    }
    // Handle Question Delete Button
    if (target.closest('.question-delete-btn')) {
      e.preventDefault();
      const questionBlock = target.closest('.question-block');
      if (questionBlock) {
        questionBlock.remove();
        if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
      }
      return;
    }

    // Handle Question Answer Button
    if (target.classList.contains('question-answer-btn')) {
      e.preventDefault();
      const questionBlock = target.closest('.question-block') as HTMLElement;
      if (questionBlock) {
        const correctIndex = questionBlock.getAttribute('data-correct-index');
        const selectedRadio = questionBlock.querySelector('input[type="radio"]:checked') as HTMLInputElement;
        
        if (selectedRadio) {
          if (selectedRadio.value === correctIndex) {
            questionBlock.setAttribute('data-answered', 'correct');
          } else {
            questionBlock.setAttribute('data-answered', 'incorrect');
          }
          if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        } else {
          alert('Selecione uma opção antes de responder.');
        }
      }
      return;
    }

    // Image click
    if (target.tagName === 'IMG') {
      setSelectedImage(target as HTMLImageElement);
    } else {
      setSelectedImage(null);
    }

    // Handle clicks on the empty space of group-content to focus the trailing line
    if (target.classList.contains('group-content') || target.classList.contains('toggle-content')) {
      const last = target.lastElementChild as HTMLElement;
      if (last && last.getAttribute('contenteditable') !== 'false') {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(last);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
    }

    // Handle Group Embeds Toggle
    if (target.classList.contains('toggle-group-btn')) {
      e.preventDefault();
      const groupBlock = target.closest('.group-collection') as HTMLElement;
      if (groupBlock) {
        const groupContent = groupBlock.querySelector('.group-content') as HTMLElement;
        if (groupContent) {
          const isExpanded = target.dataset.expanded === 'true';
          
          if (!isExpanded) {
            // Expand all
            target.dataset.expanded = 'true';
            target.textContent = '🔽🔽';
            
            // Super Expand: open all page embeds inside
            const toggleEmbedBtns = groupContent.querySelectorAll('.toggle-embed-btn');
            toggleEmbedBtns.forEach(btn => {
              const embedContent = btn.closest('.page-reference')?.querySelector('.page-embed-content');
              if (embedContent && embedContent.classList.contains('hidden')) {
                (btn as HTMLElement).click();
              }
            });
          } else {
            // Close group
            target.dataset.expanded = 'false';
            target.textContent = '▶️▶️';
            
            // Super Collapse: close all page embeds inside
            const toggleEmbedBtns = groupContent.querySelectorAll('.toggle-embed-btn');
            toggleEmbedBtns.forEach(btn => {
              const embedContent = btn.closest('.page-reference')?.querySelector('.page-embed-content');
              if (embedContent && !embedContent.classList.contains('hidden')) {
                (btn as HTMLElement).click();
              }
            });
          }
          if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        }
      }
      return;
    }

    // Handle Page Embeds Toggle
    if (target.classList.contains('toggle-embed-btn')) {
      e.preventDefault();
      const referenceBlock = target.closest('.page-reference') as HTMLElement;
      if (referenceBlock) {
        const pageId = referenceBlock.dataset.pageId;
        const embedContent = referenceBlock.querySelector('.page-embed-content') as HTMLElement;
        if (pageId && embedContent) {
          if (embedContent.classList.contains('hidden')) {
            // Open it
            embedContent.classList.remove('hidden');
            target.textContent = '⏫';
            // Fetch content from store
            const targetPage = state.pages.find(p => p.id === pageId);
            if (targetPage) {
              embedContent.innerHTML = targetPage.content || '<p><br></p>';
            }
          } else {
            // Close it
            embedContent.classList.add('hidden');
            target.textContent = '⏬';
            // Trigger save to persist edits before wiping
            if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
            embedContent.innerHTML = '';
          }
        }
      }
      return;
    }

    // Handle Page Name Click
    if (target.classList.contains('page-name')) {
      e.preventDefault();
      const referenceBlock = target.closest('.page-reference') as HTMLElement;
      if (referenceBlock) {
        const pageId = referenceBlock.dataset.pageId;
        if (pageId) {
          dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
        }
      }
      return;
    }

    // Handle link clicks
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      if (href) {
        window.open(href, '_blank');
      }
    }
  }, [debouncedSave]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editorRef.current || isComposingRef.current) return;
    const target = e.target as HTMLElement;
    
    // Ignore hover reset if moving over the handle or popovers
    if (target.closest('.block-handle') || target.closest('.emoji-picker-react')) {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      return;
    }

    const block = target.closest('p, h1, h2, h3, h4, h5, h6, .todo-item, .callout-block, .editor-divider, .group-collection, .table-wrapper') as HTMLElement;
    if (block && editorRef.current.contains(block)) {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      const rect = block.getBoundingClientRect();
      setHoveredBlock({
        node: block,
        x: rect.left - 24,
        y: rect.top + (rect.height > 24 ? 4 : 0),
      });
    } else {
      if (!hoverTimeoutRef.current) {
        hoverTimeoutRef.current = window.setTimeout(() => {
          setHoveredBlock(null);
          hoverTimeoutRef.current = null;
        }, 150);
      }
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredBlock(null);
      hoverTimeoutRef.current = null;
    }, 150);
  }, []);

  const handleDeleteBlock = useCallback(() => {
    if (hoveredBlock?.node) {
      hoveredBlock.node.remove();
      setHoveredBlock(null);
      if (editorRef.current) {
        debouncedSave(editorRef.current.innerHTML);
      }
    }
  }, [hoveredBlock, debouncedSave]);

  const handleChangeBlockColor = useCallback((color: string, isBackground: boolean) => {
    if (hoveredBlock?.node) {
      if (isBackground) {
        hoveredBlock.node.style.backgroundColor = color;
      } else {
        hoveredBlock.node.style.color = color;
      }
      setHoveredBlock(null);
      if (editorRef.current) {
        debouncedSave(editorRef.current.innerHTML);
      }
    }
  }, [hoveredBlock, debouncedSave]);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (hoveredBlock?.node) {
      draggedNodeRef.current = hoveredBlock.node;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ''); // required for Firefox
      
      try {
        e.dataTransfer.setDragImage(hoveredBlock.node, 0, 0);
      } catch (err) {}
      
      // Delay opacity so drag image stays opaque
      setTimeout(() => {
        if (draggedNodeRef.current) draggedNodeRef.current.style.opacity = '0.3';
      }, 0);
    }
  }, [hoveredBlock]);

  const handleDragEnd = useCallback(() => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.style.opacity = '1';
      draggedNodeRef.current = null;
    }
    setDropIndicator(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // allow drop
    const dragged = draggedNodeRef.current;
    const hasFiles = e.dataTransfer.types.includes('Files');
    
    if (!dragged && !hasFiles) return;
    
    e.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move';
    const target = e.target as HTMLElement;
    const block = target.closest('p, h1, h2, h3, h4, h5, h6, .todo-item, .callout-block, .editor-divider, .group-collection, .table-wrapper, img') as HTMLElement;
    
    if (block && editorRef.current?.contains(block) && block !== dragged) {
      const rect = block.getBoundingClientRect();
      const isTopHalf = e.clientY < rect.top + rect.height / 2;
      
      setDropIndicator({
        top: isTopHalf ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        targetNode: block,
        position: isTopHalf ? 'before' : 'after'
      });
    } else {
      // If we move away from blocks but are still in editor, we could clear it, but let's keep it until drag end
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dragged = draggedNodeRef.current;
    const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0;
    
    if (!dragged && !hasFiles) {
      handleDragEnd();
      return;
    }

    if (hasFiles) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgHtml = `<img src="${event.target?.result}" alt="Dropped Image" class="max-w-full rounded-lg border border-white/10 my-4" />`;
          const pContainer = document.createElement('p');
          pContainer.innerHTML = imgHtml;
          
          const nextP = document.createElement('p');
          nextP.innerHTML = '<br>';
          
          if (dropIndicator) {
            const parent = dropIndicator.targetNode.parentNode;
            if (dropIndicator.position === 'before') {
              parent?.insertBefore(pContainer, dropIndicator.targetNode);
              parent?.insertBefore(nextP, dropIndicator.targetNode);
            } else {
              const nextSibling = dropIndicator.targetNode.nextSibling;
              parent?.insertBefore(pContainer, nextSibling);
              parent?.insertBefore(nextP, nextSibling);
            }
          } else {
            editorRef.current?.appendChild(pContainer);
            editorRef.current?.appendChild(nextP);
          }
          
          if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
        };
        reader.readAsDataURL(file);
      }
      handleDragEnd();
      return;
    }
    
    if (!dropIndicator || !dragged) {
      handleDragEnd();
      return;
    }
    
    // Move draggedNode
    if (dropIndicator.position === 'before') {
      dropIndicator.targetNode.parentNode?.insertBefore(dragged, dropIndicator.targetNode);
    } else {
      dropIndicator.targetNode.parentNode?.insertBefore(dragged, dropIndicator.targetNode.nextSibling);
    }
    
    if (editorRef.current) {
      debouncedSave(editorRef.current.innerHTML);
    }
    
    handleDragEnd();
  }, [dropIndicator, handleDragEnd, debouncedSave]);

  // Handle text selection for floating toolbar
  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbarPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    }, 10);
  }, []);

  // Hide toolbar on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setShowToolbar(false);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  return (
    <div 
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Editor Content */}
      <div 
        className="max-w-[800px] mx-auto pb-[50vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget && editorRef.current) {
            const lastChild = editorRef.current.lastElementChild as HTMLElement;
            if (lastChild) {
              const range = document.createRange();
              range.selectNodeContents(lastChild);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
            editorRef.current.focus();
          }
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={settings.spellcheck}
          className={`editor-content min-h-[300px] leading-relaxed text-dark-text/90 focus:outline-none ${settings.fontSize} ai-highlight-${settings.aiChatHighlight || 'glow'}`}
          data-placeholder="Comece a escrever... (digite [] para criar uma tarefa)"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onDoubleClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
              setSelectedImage(target as HTMLImageElement);
              setIsViewerOpen(true);
            }
          }}
          onMouseUp={handleMouseUp}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ></div >
      </div>

        {showToolbar && (
        <FloatingToolbar 
          x={toolbarPos.x} 
          y={toolbarPos.y} 
          onAiClick={() => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
              const text = selection.toString();
              const range = selection.getRangeAt(0);
              const targetNode = range.commonAncestorContainer;
              
              // Wrap the selection in a clean span, styling is handled by CSS based on user settings
              const spanHtml = `<span class="ai-chat-reference" title="Abrir chat da IA" data-chat-id="${text.replace(/"/g, '&quot;')}">${text}</span>`;
              document.execCommand('insertHTML', false, spanHtml);
              
              setAiModal({ x: toolbarPos.x, y: toolbarPos.y, contextText: text, targetNode });
              setShowToolbar(false);
            }
          }}
        />
      )}

      {slashMenu && !pageMenu && (
        <SlashMenu
          x={slashMenu.x}
          y={slashMenu.y}
          query={slashMenu.query}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {pageMenu && (
        <PageSearchMenu
          x={pageMenu.x}
          y={pageMenu.y}
          query={pageMenu.query}
          onSelect={handlePageSelect}
          onClose={() => setPageMenu(null)}
        />
      )}

      {hoveredBlock && !slashMenu && !pageMenu && (
        <div 
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              window.clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <BlockHandle 
            x={hoveredBlock.x} 
            y={hoveredBlock.y} 
            onDelete={handleDeleteBlock} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onChangeColor={handleChangeBlockColor}
          />
        </div>
      )}

      {dropIndicator && (
        <div 
          className="fixed z-50 bg-brand-500 rounded-full pointer-events-none transition-all duration-75"
          style={{
            top: dropIndicator.top,
            left: dropIndicator.left,
            width: dropIndicator.width,
            height: '3px',
            transform: 'translateY(-50%)',
            boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)'
          }}
        />
      )}

      {calloutEmojiPicker && (
        <div 
          className="fixed z-50 animate-fade-in" 
          style={{ left: calloutEmojiPicker.x, top: calloutEmojiPicker.y }}
        >
          <div className="fixed inset-0" onClick={() => setCalloutEmojiPicker(null)} />
          <div className="relative bg-dark-bg border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(emojiData) => {
                // eslint-disable-next-line react-hooks/immutability
                calloutEmojiPicker.node.textContent = emojiData.emoji;
                setCalloutEmojiPicker(null);
                if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
              }}
              lazyLoadEmojis={true}
              searchDisabled={false}
              skinTonesDisabled={true}
            />
          </div>
        </div>
      )}

      {selectedImage && (
        <div 
          className="fixed z-40 bg-dark-card/90 backdrop-blur border border-white/10 rounded-lg p-2 shadow-xl flex items-center gap-2 animate-fade-in"
          style={{
            top: selectedImage.getBoundingClientRect().top - 48,
            left: selectedImage.getBoundingClientRect().left,
          }}
        >
          <button 
            onClick={() => {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNode(selectedImage);
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('copy');
              setSelectedImage(null);
            }}
            className="p-1.5 hover:bg-white/10 rounded text-brand-300 transition-colors"
            title="Copiar"
          >
            <Copy size={16} />
          </button>
          
          <button 
            onClick={() => {
              const rect = selectedImage.getBoundingClientRect();
              
              // Draw image to canvas to get base64
              const canvas = document.createElement('canvas');
              canvas.width = selectedImage.naturalWidth;
              canvas.height = selectedImage.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(selectedImage, 0, 0);
                const base64 = canvas.toDataURL('image/jpeg');
                setAiModal({ 
                  x: rect.left + rect.width / 2, 
                  y: rect.top - 8, 
                  contextImage: base64, 
                  targetNode: selectedImage 
                });
              }
            }}
            className="p-1.5 hover:bg-white/10 rounded text-brand-400 transition-colors"
            title="IA Assistente"
          >
            <Sparkles size={16} />
          </button>

          <button 
            onClick={() => {
              selectedImage.remove();
              setSelectedImage(null);
              if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
            }}
            className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
            title="Deletar"
          >
            <Trash size={16} />
          </button>
        </div>
      )}

      {selectedImage && (
        <div 
          className="fixed z-40 w-4 h-4 bg-brand-500 border-2 border-white rounded-full cursor-nwse-resize shadow-lg"
          style={{
            top: selectedImage.getBoundingClientRect().bottom - 8,
            left: selectedImage.getBoundingClientRect().right - 8,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = selectedImage.offsetWidth;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(100, startWidth + (moveEvent.clientX - startX));
              selectedImage.style.width = `${newWidth}px`;
              selectedImage.style.maxWidth = '100%';
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        />
      )}

      <ImageViewerModal 
        isOpen={isViewerOpen}
        imageSrc={selectedImage ? (selectedImage.getAttribute('src') || selectedImage.src) : ''}
        onClose={() => setIsViewerOpen(false)}
        onSave={(newSrc) => {
          if (selectedImage) {
            selectedImage.src = newSrc;
            if (editorRef.current) debouncedSave(editorRef.current.innerHTML);
          }
          setIsViewerOpen(false);
        }}
      />

      {aiModal && (() => {
        const chatId = aiModal.chatId || aiModal.contextImage || aiModal.contextText || 'global';
        return (
          <AiPromptModal
            x={aiModal.x}
            y={aiModal.y}
            chatId={chatId}
            messages={state.aiChatSessions[chatId]?.messages || []}
            contextText={aiModal.contextText}
            contextImage={aiModal.contextImage}
            onMessageAdd={(id, msgs) => {
              dispatch({
                type: 'UPDATE_AI_CHAT',
                session: {
                  id,
                  pageId: pageId || '',
                  pageTitle: state.pages.find(p => p.id === pageId)?.title || 'Página',
                  contextText: aiModal.contextText,
                  contextImage: aiModal.contextImage,
                  messages: msgs,
                  updatedAt: Date.now()
                }
              });
            }}
            onClear={(id) => dispatch({ type: 'DELETE_AI_CHAT', id })}
            onClose={() => setAiModal(null)}
            onSuccess={(response) => {
              if (!editorRef.current || !aiModal.targetNode) return;
              
              let blockNode = aiModal.targetNode as HTMLElement;
            if (blockNode.nodeType === Node.TEXT_NODE) {
              blockNode = blockNode.parentElement as HTMLElement;
            }
            while (blockNode && blockNode.parentElement !== editorRef.current && !blockNode.parentElement?.classList.contains('group-content') && !blockNode.parentElement?.classList.contains('toggle-content') && !blockNode.parentElement?.classList.contains('callout-content')) {
              blockNode = blockNode.parentElement as HTMLElement;
            }

            if (!blockNode || !blockNode.parentElement) {
              const p = document.createElement('p');
              p.textContent = response;
              editorRef.current.appendChild(p);
              return;
            }

            let isQuestion = false;
            try {
              const parsed = JSON.parse(response);
              const questions = Array.isArray(parsed) ? parsed : [parsed];
              const validQuestions = questions.filter(q => q.enunciado && Array.isArray(q.opcoes) && typeof q.correta === 'number');
              
              if (validQuestions.length > 0) {
                isQuestion = true;
                validQuestions.reverse().forEach((q) => {
                  const questionDiv = document.createElement('div');
                  questionDiv.className = 'question-block relative';
                  questionDiv.dataset.answered = "false";
                  questionDiv.dataset.correctIndex = q.correta.toString();
                  questionDiv.contentEditable = "false";
                  
                  let html = `
                    <button class="question-delete-btn absolute top-2 right-2 p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors" contenteditable="false" title="Deletar Questão">🗑️</button>
                    <div class="question-text" contenteditable="true">${q.enunciado}</div>
                    <div class="question-options">`;
                  q.opcoes.forEach((opt: string, idx: number) => {
                    html += `<div class="question-option" data-index="${idx}"><input type="radio" name="q_${Date.now()}_${Math.random()}" value="${idx}"><span contenteditable="true">${opt}</span></div>`;
                  });
                  html += `</div><button class="question-answer-btn">Responder</button>`;
                  
                  questionDiv.innerHTML = html;
                  if (blockNode.parentElement) {
                    blockNode.parentElement.insertBefore(questionDiv, blockNode.nextSibling);
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    blockNode.parentElement.insertBefore(p, questionDiv.nextSibling);
                  }
                });
              }
            } catch (e) {}

            if (!isQuestion) {
              const lines = response.split('\n').filter(l => l.trim() !== '');
              let lastInserted = blockNode;
              lines.forEach(line => {
                const p = document.createElement('p');
                p.textContent = line;
                if (lastInserted.parentElement) {
                  lastInserted.parentElement.insertBefore(p, lastInserted.nextSibling);
                  lastInserted = p;
                }
              });
            }

            debouncedSave(editorRef.current.innerHTML);
          }}
        />
        );
      })()}
    </div>
  );
}
