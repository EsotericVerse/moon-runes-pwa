// LOC homepage: BlockNote's U+FFFC (object replacement character) is not a
// textual paragraph. Strip only placeholder-only paragraphs and lone
// replacement characters; preserve intentional <br>, text and HTML links.
const placeholder=/(?:\uFFFC|&#0*65532;|&#x0*fffc;)/gi;
const placeholderParagraph=/<p\b[^>]*>\s*(?:(?:\uFFFC|&#0*65532;|&#x0*fffc;)\s*)+<\/p>/gi;

export function stripLocHomeEditorPlaceholders(html=''){
  return String(html??'').replace(placeholderParagraph,'').replace(placeholder,'');
}
