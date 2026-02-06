
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function getWorkflow(id, filename) {
    try {
        const response = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: {
                'X-N8N-API-KEY': API_KEY
            }
        });
        fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
        console.log(`Saved ${filename}`);
    } catch (error) {
        console.error(`Error fetching workflow ${id}:`, error.response?.data || error.message);
    }
}

async function main() {
    await getWorkflow("Wn8FfWkBfgt56QPm", "workflow_main.json");
    await getWorkflow("20Rq4ar-aW-W3s3CvO_px", "workflow_tool.json");
}

main();
