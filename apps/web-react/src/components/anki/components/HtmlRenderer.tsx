import React from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  html: string;
  className?: string;
  as?: React.ElementType;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({ 
  html, 
  className,
  as: Component = 'span' 
}) => {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  });

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
