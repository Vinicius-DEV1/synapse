const seg = new Intl.Segmenter('en', {granularity: 'word'});
const segments = Array.from(seg.segment(' And with Alison\'s decision looming. I    wanted to check in with both of them. '));
const res = segments.map(seg => {
    if (seg.isWordLike) return seg.segment;
    let cleanSpace = seg.segment.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');
    if (cleanSpace.trim().length === 0 && cleanSpace.length > 0) cleanSpace = ' ';
    return cleanSpace;
});
console.log(res.join(''));
