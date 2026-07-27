// backfill-embeddings.ts
// KONUM: backend/ klasorunun kokune koy (seed2.ts ile ayni yere).
//
// Calistirma (backend klasorunun icinde):
//   $env:OPENAI_API_KEY = "sk-..."
//   npx tsx backfill-embeddings.ts
//
// embedding'i olmayan tum ilanlari vektorler. Tekrar calistirilabilir;
// sadece hala bos olanlari doldurur.

import "dotenv/config";
import { prisma } from "./src/graphql/context";
import { listingToText, embedBatch, toVectorLiteral } from "./src/utils/embedding.util";

const BATCH = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
    // Unsupported (vector) kolonu Prisma where ile sorgulanamaz -> raw ile id'leri al
    const idRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Listing" WHERE embedding IS NULL AND is_deleted = false
  `;
    const ids = idRows.map((r) => r.id);

    if (ids.length === 0) {
        console.log("Vektorlenecek ilan yok, hepsi hazir.");
        return;
    }
    console.log(`${ids.length} ilan vektorlenecek...`);

    for (let i = 0; i < ids.length; i += BATCH) {
        const batchIds = ids.slice(i, i + BATCH);

        // tam ilan verisini cek (features dahil)
        const listings = await prisma.listing.findMany({
            where: { id: { in: batchIds } },
        });

        const texts = listings.map((l) => listingToText(l as any));
        const vectors = await embedBatch(texts);

        // her ilani raw UPDATE ile yaz (vector tipi typed client'tan yazilamaz)
        await Promise.all(
            listings.map((l, j) =>
                prisma.$executeRaw`
          UPDATE "Listing" SET embedding = ${toVectorLiteral(vectors[j])}::vector
          WHERE id = ${l.id}
        `
            )
        );

        console.log(`  ${Math.min(i + BATCH, ids.length)}/${ids.length} tamam`);
        await sleep(300);
    }

    console.log("Bitti. Tum ilanlarin koordinati var.");
}

main()
    .catch((e) => {
        console.error("Backfill hatasi:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());