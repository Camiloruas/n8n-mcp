
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;
async function listWorkflows() {
    try {
        const response = await axios.get(`${API_URL}/api/v1/workflows`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        console.log(JSON.stringify(response.data.data.map(w => ({ id: w.id, name: w.name })), null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}
listWorkflows();
