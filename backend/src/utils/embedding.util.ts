// src/utils/embedding.util.ts
//
// OpenAI text-embedding-3-small (1536 boyut) ile embedding uretir.
// listingToText: bir ilani, embedding'e verilecek tek bir metne cevirir.
// ONEMLI: hem backfill hem createListing hook hem arama HEP bu formati kullanmali.



const MODEL = "text-embedding-3-small";

export function listingToText(l: {
    type: string;
    category?: string | null;
    title: string;
    description?: string | null;
    location?: string | null;
    features?: Record<string, string> | null;
}): string {
    const parts: string[] = [l.type];
    if (l.category) parts.push(l.category);
    parts.push(l.title);
    if (l.description) parts.push(l.description);
    if (l.location) parts.push(l.location);
    // features JSON'unu "anahtar: deger" olarak duzlestir (RAM: 16GB gibi)
    if (l.features && typeof l.features === "object") {
        for (const [k, v] of Object.entries(l.features)) parts.push(`${k}: ${v}`);
    }
    return parts.filter(Boolean).join(". ").slice(0, 8000);
}

// Tek metin
export async function embedText(text: string): Promise<number[]> {
    const [vec] = await embedBatch([text]);
    return vec;
}

// Toplu (backfill icin) - tek cagrida 100'e kadar metin
export async function embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
}

// pgvector'a yazilacak string format: "[0.1,0.2,...]"
export const toVectorLiteral = (vec: number[]) => JSON.stringify(vec);