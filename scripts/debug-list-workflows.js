
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function listAllWorkflows() {
    try {
        const response = await axios.get(`${API_URL}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': API_KEY
            },
            params: {
                limit: 100
            }
        });

        console.log("Workflows found:");
        response.data.data.forEach(w => {
            console.log(`- ${w.name} (ID: ${w.id})`);
        });
    } catch (error) {
        console.error("Error listing workflows:", error.response?.data || error.message);
    }
}

listAllWorkflows();
