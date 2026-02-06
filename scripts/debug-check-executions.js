
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function checkExecutions(workflowId, name) {
    try {
        const response = await axios.get(`${API_URL}/api/v1/executions`, {
            headers: { 'X-N8N-API-KEY': API_KEY },
            params: {
                workflowId: workflowId,
                limit: 5
            }
        });

        console.log(`\nLast executions for ${name} (${workflowId}):`);
        if (response.data.data.length === 0) {
            console.log("No executions found.");
        } else {
            response.data.data.forEach(exec => {
                console.log(`- ID: ${exec.id}, Status: ${exec.status}, Started: ${exec.startedAt}`);
                if (exec.status === 'failed') {
                    console.log(`  Error: ${exec.error?.message || 'Unknown error'}`);
                }
            });
        }
    } catch (error) {
        console.error(`Error checking executions for ${name}:`, error.response?.data || error.message);
    }
}

async function main() {
    await checkExecutions("20Rq4ar-aW-W3s3CvO_px", "agenda_consultar_disponibilidade");
    await checkExecutions("Wn8FfWkBfgt56QPm", "Agente de agendamento - IA");
}

main();
