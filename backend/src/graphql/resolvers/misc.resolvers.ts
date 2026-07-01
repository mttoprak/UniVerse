import fs from "fs/promises";
import path from "path";
import { GraphQLContext } from "../context";

interface IDistrict {
    id: string;
    il_id: string;
    name: string;
}

export const miscResolvers = {
    Query: {
        getDistricts: async (_parent: any, args: { il: string }, context: GraphQLContext) => {
            try {
                // REST API'deki city_id yerine GraphQL argümanı olan "il" değerini kullanıyoruz
                const { il } = args;

                if (!il) {
                    throw new Error("Validasyon Hatası: 'il' parametresi gerekli.");
                }

                // JSON dosyasını okuma işlemi
                const dataPath = path.join(process.cwd(), "src", "data", "districts.json");
                const rawData = await fs.readFile(dataPath, "utf-8");
                const districts: IDistrict[] = JSON.parse(rawData);

                // Gelen il_id (veya plaka) değerine göre filtrele
                const filteredDistricts = districts.filter(d => d.il_id === il);

                if (filteredDistricts.length === 0) {
                    throw new Error("Not Found: Bu şehre ait ilçe bulunamadı.");
                }

                // Sadece isimleri içeren bir string dizisi (array) dönüyoruz -> [String!]!
                return filteredDistricts.map(d => d.name);

            } catch (e: any) {
                console.error("getDistricts error:", e);
                // Frontend'in yakalayabileceği temiz bir hata fırlatıyoruz
                throw new Error(`Sunucu Hatası: İlçeler getirilemedi. Detay: ${e.message}`);
            }
        }
    }
};