
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function findWorkflow(name) {
    try {
        const response = await axios.get(`${API_URL}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': API_KEY
            },
            params: {
                name: name
            }
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log(JSON.stringify(response.data.data[0], null, 2));
        } else {
            console.log("Workflow not found.");
            // List some to help identify
            const listResponse = await axios.get(`${API_URL}/api/v1/workflows`, {
                headers: {
                    'X-N8N-API-KEY': API_KEY
                },
                params: {
                    limit: 10
                }
            });
            console.log("Existing workflows (first 10):");
            listResponse.data.data.forEach(w => console.log(`- ${w.name} (ID: ${w.id})`));
        }
    } catch (error) {
        console.error("Error fetching workflows:", error.response?.data || error.message);
    }
}

const targetName = "Agente de agendamento - IA";
findWorkflow(targetName);
