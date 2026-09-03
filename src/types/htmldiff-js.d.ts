declare module 'htmldiff-js' {
  interface HtmlDiffStatic {
    execute: (oldHtml: string, newHtml: string) => string;
  }
  const HtmlDiff: HtmlDiffStatic;
  export default HtmlDiff;
}
