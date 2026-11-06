import { foldText } from './filters/syntax';

/**
 * Renders `children` with `<mark>` around every occurrence of `highlight` (case- and accent-insensitive).
 * Pair with `getFilterHighlights` to highlight filter matches in custom cell renders.
 */
export function DataTableHighlight({ children, highlight }: { children: string; highlight: string[] | undefined }) {
  const terms = highlight?.map((term) => foldText(term)).filter(Boolean);
  if (!terms?.length || !children) return children;

  // Folding can change string length (e.g. decomposed accents), so map folded indices back per character.
  const chars = [...children];
  const folded = chars.map((char) => foldText(char));
  const haystack = folded.join('');
  const starts: number[] = [];
  let offset = 0;
  for (const part of folded) {
    starts.push(offset);
    offset += part.length;
  }

  const marked = new Array<boolean>(chars.length).fill(false);
  for (const term of terms) {
    for (let index = haystack.indexOf(term); index !== -1; index = haystack.indexOf(term, index + 1)) {
      const end = index + term.length;
      starts.forEach((start, i) => {
        if (start < end && start + folded[i].length > index) marked[i] = true;
      });
    }
  }

  const segments: { text: string; mark: boolean }[] = [];
  chars.forEach((char, i) => {
    const last = segments[segments.length - 1];
    if (last && last.mark === marked[i]) last.text += char;
    else segments.push({ text: char, mark: marked[i] });
  });

  return segments.map((segment, i) =>
    segment.mark ? (
      <mark key={i} className="mantine-datatable-highlight">
        {segment.text}
      </mark>
    ) : (
      segment.text
    )
  );
}
