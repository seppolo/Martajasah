
import { GoogleGenAI } from "@google/genai";

/**
 * Initialize the Google GenAI SDK
 * Using the API_KEY from process.env as per requirements.
 */
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

/** 
 * Mendapatkan rekomendasi menu harian berdasarkan stok yang ada menggunakan Gemini 3 Flash
 */
export const getMenuRecommendation = async (stock: any[]) => {
  try {
    const ai = getAIClient();
    const stockSummary = stock
      .filter(s => s.itemType === 'BAHAN')
      .map(s => `${s.name}: ${s.quantity} ${s.unit}`)
      .join(", ");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Bertindaklah sebagai Ahli Gizi untuk program MBG (Makan Bergizi Gratis). 
      Berdasarkan stok bahan berikut: ${stockSummary}.
      Berikan 3 set menu makan siang sekolah yang seimbang (Karbo, Protein, Sayur, Buah/Susu).
      Gunakan bahan yang tersedia sebanyak mungkin. 
      Format jawaban dalam Markdown yang rapi dengan tabel porsi.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Gagal mendapatkan rekomendasi menu AI.");
  }
};

/** 
 * Menganalisis tingkat stok dan memberikan peringatan strategis
 */
export const analyzeStockLevels = async (stock: any[]) => {
  try {
    const ai = getAIClient();
    const data = JSON.stringify(stock.map(s => ({ 
      n: s.name, 
      q: s.quantity, 
      u: s.unit, 
      min: s.minThreshold 
    })));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analisis data stok inventori dapur SPPG berikut: ${data}. 
      Identifikasi barang yang kritis (di bawah threshold) dan berikan saran prioritas pengadaan untuk operasional 1 minggu ke depan.
      Berikan output dalam poin-poin Markdown yang singkat dan padat.`,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Gagal menganalisis stok via AI.");
  }
};
