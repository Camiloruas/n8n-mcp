
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function debugLastExecution() {
    const workflowId = "20Rq4ar-aW-W3s3CvO_px";
    try {
        const response = await axios.get(`${API_URL}/api/v1/executions`, {
            headers: { 'X-N8N-API-KEY': API_KEY },
            params: { workflowId: workflowId, limit: 1 }
        });

        if (response.data.data.length > 0) {
            const execId = response.data.data[0].id;
            console.log(`Checking execution ${execId}...`);
            const execDetails = await axios.get(`${API_URL}/api/v1/executions/${execId}`, {
                headers: { 'X-N8N-API-KEY': API_KEY }
            });

            // Check first node's data
            console.log("Execution Data:", JSON.stringify(execDetails.data.data.resultData, null, 2));
        } else {
            console.log("No executions found.");
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

debugLastExecution();
