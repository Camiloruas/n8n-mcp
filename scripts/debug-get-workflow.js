
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function getWorkflow(id) {
    try {
        const response = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: {
                'X-N8N-API-KEY': API_KEY
            }
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error fetching workflow:", error.response?.data || error.message);
    }
}

const workflowId = process.argv[2] || "R8yWq2AnS0lE9z60";
getWorkflow(workflowId);
