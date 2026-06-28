const fs = require('fs');
const file = 'src/components/library/PdfReader.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{/* Header */}');
const endStr = '</button>\n        </div>\n      </div>';
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex === -1 || endIndex === -1) {
  console.log('Markers not found!');
  process.exit(1);
}

const replacement = `{/* Floating Top-Left Controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 opacity-10 md:opacity-30 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3 bg-dark-card/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-xl">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="hidden md:block font-medium text-sm truncate max-w-[200px] pr-3" title={book.title}>
            {book.title}
          </span>
        </div>
      </div>

      {/* Floating Vertical Toolbar - Right Side */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-50 flex flex-col items-center gap-3 bg-dark-card/90 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl opacity-10 md:opacity-30 hover:opacity-100 transition-opacity duration-300">
        {/* Pagination */}
        <div className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-1.5 w-full">
          <span className="text-[10px] text-dark-subtext uppercase tracking-wider font-semibold">Pág</span>
          <input 
            type="number"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                scrollToPage(val);
              }
            }}
            className="w-10 bg-transparent text-center text-xs font-medium text-white focus:outline-none focus:bg-white/10 rounded py-1"
            min={1}
            max={totalPages}
          />
          <span className="text-[10px] text-dark-subtext border-t border-white/10 pt-1 w-full text-center">{totalPages}</span>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Zoom */}
        <button 
          onClick={() => handleZoom(z => Math.min(3, z + 0.25))}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Aumentar (Ctrl++)"
        >
          <ZoomIn size={18} />
        </button>
        
        {zoomInputActive ? (
          <input
            ref={zoomInputRef}
            type="number"
            min={50}
            max={300}
            value={zoomInputValue}
            onChange={e => setZoomInputValue(e.target.value)}
            onBlur={() => {
              const parsed = parseInt(zoomInputValue, 10);
              if (!isNaN(parsed)) {
                handleZoom(Math.min(3, Math.max(0.5, parsed / 100)));
              }
              setZoomInputActive(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const parsed = parseInt(zoomInputValue, 10);
                if (!isNaN(parsed)) {
                  handleZoom(Math.min(3, Math.max(0.5, parsed / 100)));
                }
                setZoomInputActive(false);
              } else if (e.key === 'Escape') {
                setZoomInputActive(false);
              }
            }}
            className="text-[10px] text-dark-text w-10 text-center bg-white/10 border border-white/20 rounded py-0.5 outline-none focus:border-brand-400"
            autoFocus
          />
        ) : (
          <span
            className="text-[10px] text-dark-subtext font-medium cursor-pointer hover:text-white transition-colors"
            title="Clique para digitar um zoom"
            onClick={() => {
              setZoomInputValue(String(Math.round(zoom * 100)));
              setZoomInputActive(true);
            }}
          >{Math.round(zoom * 100)}%</span>
        )}

        <button 
          onClick={() => handleZoom(z => Math.max(0.5, z - 0.25))}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Diminuir (Ctrl+-)"
        >
          <ZoomOut size={18} />
        </button>

        <div className="w-full h-px bg-white/10" />

        {/* Tools */}
        <button 
          onClick={() => setShowSearch(prev => !prev)}
          className={\`p-2 rounded-lg transition-all \${showSearch ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}\`}
          title="Buscar (Ctrl+F)"
        >
          <Search size={18} />
        </button>
        
        <button 
          onClick={toggleBookmark}
          className={\`p-2 rounded-lg transition-all \${isBookmarked ? 'bg-red-500/20 text-red-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}\`}
          title="Marcar página (B)"
        >
          {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
        
        <button 
          onClick={cycleReadingMode}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Modo de leitura (M)"
        >
          {readingMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        <button 
          onClick={() => setShowAnnotations(prev => !prev)}
          className={\`p-2 rounded-lg transition-all \${showAnnotations ? 'bg-blue-500/20 text-blue-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}\`}
          title="Anotações e Sumário (S)"
        >
          <StickyNote size={18} />
        </button>
      </div>`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, newContent, 'utf8');
console.log('Success!');