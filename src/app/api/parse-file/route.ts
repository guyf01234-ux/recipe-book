import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
// @ts-ignore
import WordExtractor from 'word-extractor';
import { parseRecipeWithGemini, getGeminiClient, getActiveGeminiModel, FALLBACK_MODELS, robustJsonParse } from '@/lib/gemini';
import { ParsedRecipe } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

const wordDocExtractor = new WordExtractor();

/**
 * Converts DOCX to plain text while strictly preserving paragraph spacing,
 * line breaks, lists, and headings as they were in the original Word document.
 */
async function extractFormattedTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    let html = htmlResult.value;

    if (!html || html.trim() === '') {
      const rawResult = await mammoth.extractRawText({ buffer });
      return rawResult.value;
    }

    // Convert HTML elements to text with proper spacing
    let text = html
      // Paragraphs -> double newline for clean separation between paragraphs
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      // Line breaks -> single newline
      .replace(/<br\s*[\/]?>/gi, '\n')
      // Headings -> newlines before and after
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<h[1-6][^>]*>/gi, '\n')
      // Lists -> bullet point and newline
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<ol[^>]*>/gi, '')
      // Tables -> newlines per row
      .replace(/<\/tr>/gi, '\n')
      .replace(/<td[^>]*>/gi, '  ')
      .replace(/<\/td>/gi, '  ')
      .replace(/<tr[^>]*>/gi, '')
      .replace(/<\/?table[^>]*>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize multiple consecutive empty lines to maximum 2
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  } catch (err) {
    console.warn('HTML conversion failed for docx, falling back to extractRawText:', err);
    const rawResult = await mammoth.extractRawText({ buffer });
    return rawResult.value;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const modelOverride = formData.get('model') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    const lowerName = fileName.toLowerCase();

    if (
      lowerName.endsWith('.docx') ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await extractFormattedTextFromDocx(buffer);
    } else if (
      lowerName.endsWith('.doc') ||
      fileType === 'application/msword'
    ) {
      // Legacy Microsoft Word 97-2003 binary format
      const extractedDoc = await wordDocExtractor.extract(buffer);
      extractedText = (extractedDoc.getBody() || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } else if (lowerName.endsWith('.pdf') || fileType === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      // Normalize line breaks in PDF text
      extractedText = pdfData.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    } else if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      fileType.startsWith('text/')
    ) {
      extractedText = buffer
        .toString('utf-8')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    } else if (
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      fileType.startsWith('image/')
    ) {
      // For images, use Gemini Multimodal with automatic fallback
      const ai = getGeminiClient();
      const initialModel = modelOverride || (await getActiveGeminiModel());
      const base64Data = buffer.toString('base64');
      const mimeType = fileType || (lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg');

      const prompt = `
אתה שף מומחה. בתמונה זו מופיע מתכון בעברית (צילום דף מתכון, מחברת, ספר או מסמך).
חלץ את כל פרטי המתכון והחזר אך ורק אובייקט JSON תקין (ללא markdown וללא הערות) במבנה הבא:
{
  "title": "שם המתכון בעברית",
  "description": "תיאור קצר או פתיח",
  "servings": "כמות מנות",
  "prepTime": "זמן הכנה",
  "cookTime": "זמן בישול/אפייה",
  "ingredients": ["רשימת מצרכים כמערך של מחרוזות בעברית עם כמויות ומידות"],
  "instructions": ["שלבי הכנה ברורים כמערך של מחרוזות בעברית"],
  "notes": "הערות השף וטיפים",
  "suggestedCategory": "הצעת קטגוריה בעברית (למשל: עוגות וקינוחים, מרקים, איטלקי, אסייתי, עיקריות)"
}
`;

      const modelsToTry = [
        initialModel,
        ...FALLBACK_MODELS.filter((m) => m !== initialModel),
      ];

      let lastError: any = null;
      let parsed: ParsedRecipe | null = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const cleaned = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = robustJsonParse<ParsedRecipe>(cleaned);
          break;
        } catch (err: any) {
          lastError = err;
          const isRetryable =
            err?.status === 503 ||
            err?.status === 429 ||
            err?.status === 404 ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('no longer available') ||
            err?.message?.includes('NOT_FOUND') ||
            err?.message?.includes('UNAVAILABLE');

          if (isRetryable) {
            console.warn(`Image parsing with model ${model} failed, trying fallback...`);
            continue;
          }
          throw err;
        }
      }

      if (!parsed) {
        throw lastError || new Error('Failed to parse image recipe');
      }

      const reconstructedRaw = `[טקסט שחולץ מתמונה: ${fileName}]\n\n` +
        `שם המתכון: ${parsed.title || ''}\n\n` +
        (parsed.description ? `תיאור: ${parsed.description}\n\n` : '') +
        (parsed.servings || parsed.prepTime || parsed.cookTime
          ? `זמנים ומנות: ${[parsed.prepTime, parsed.cookTime, parsed.servings].filter(Boolean).join(' | ')}\n\n`
          : '') +
        `מצרכים:\n${(parsed.ingredients || []).map((i) => `• ${i}`).join('\n')}\n\n` +
        `הוראות הכנה:\n${(parsed.instructions || []).map((s, idx) => `${idx + 1}. ${s}`).join('\n\n')}` +
        (parsed.notes ? `\n\nהערות:\n${parsed.notes}` : '');

      return NextResponse.json({
        recipe: {
          title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
          description: parsed.description || '',
          servings: parsed.servings || '',
          prepTime: parsed.prepTime || '',
          cookTime: parsed.cookTime || '',
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
          instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
          notes: parsed.notes || '',
          suggestedCategory: parsed.suggestedCategory || '',
          rawContent: reconstructedRaw,
        },
        rawText: reconstructedRaw,
      });
    } else {
      return NextResponse.json(
        {
          error:
            'פורמט קובץ לא נתמך. אנא העלה קבצי Word (.docx, .doc), PDF (.pdf), טקסט (.txt), או תמונות (.jpg, .png)',
        },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim() === '') {
      return NextResponse.json(
        { error: 'לא הצלחנו לחלץ טקסט מהקובץ. ייתכן שהקובץ ריק או מוגן.' },
        { status: 422 }
      );
    }

    // Process extracted text with Gemini (with automatic model fallback)
    const parsedRecipe = await parseRecipeWithGemini(extractedText, modelOverride || undefined);

    // Attach raw plain text preserving document line breaks
    parsedRecipe.rawContent = extractedText;

    // Use filename as title fallback if AI didn't catch a title
    if (!parsedRecipe.title || parsedRecipe.title.trim() === '') {
      parsedRecipe.title = fileName.replace(/\.[^/.]+$/, '');
    }

    return NextResponse.json({
      recipe: parsedRecipe,
      rawText: extractedText,
    });
  } catch (error: any) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: `שגיאה בפענוח הקובץ: ${error.message || error}` },
      { status: 500 }
    );
  }
}
