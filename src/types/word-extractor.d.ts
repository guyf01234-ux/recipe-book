declare module 'word-extractor' {
  export default class WordExtractor {
    extract(document: string | Buffer): Promise<{
      getBody(): string;
      getFootnotes(): string;
      getHeaders(): string;
      getAnnotations(): string;
    }>;
  }
}
