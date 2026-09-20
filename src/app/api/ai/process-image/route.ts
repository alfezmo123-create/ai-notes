import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    // Fetch the image from the Firebase Storage download URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to download image from the provided URL' }, { status: 400 });
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    const base64Data = buffer.toString('base64');

    const defaultPrompt = `
      Analyze this image thoroughly. If it contains handwritten notes, text, or diagrams, extract all the useful knowledge.
      Format your response using ONLY semantic HTML (<h1>, <h2>, <p>, <ul>, <li>). Do not use markdown. Do not include any pleasantries or conversational filler; just output the final structured HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt || defaultPrompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              }
            }
          ]
        }
      ]
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error('Error processing image with AI:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
