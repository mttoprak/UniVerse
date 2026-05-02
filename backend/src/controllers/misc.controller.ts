import {Request, Response} from "express";
import fs from "fs/promises";
import path from "path";

interface IDistrict {
    id: string;
    il_id: string;
    name: string;
}

export const getDistricts = async (req: Request, res: Response) => {
    try {

        const { city_id } = req.params;
        if (!city_id) {
            return res.status(400).json({ error: "city_id parametresi gerekli." });
        }

        const dataPath = path.join(__dirname, "../data/districts.json");

        const rawData = await fs.readFile(dataPath, "utf-8");
        const districts: IDistrict[] = JSON.parse(rawData);

        const filteredDistricts = districts.filter(d => d.il_id === city_id);

        if (filteredDistricts.length === 0) {
            return res.status(404).json({ message: "Couldn't find the districts." });
        }

        return res.status(200).json(filteredDistricts.map(d => d.name));

    }catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }
}