
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function deploySimplifiedWorkflow() {
    try {
        const workflowData = JSON.parse(fs.readFileSync('workflow_simplified.json', 'utf8'));

        // Create as a NEW workflow
        const response = await axios.post(`${API_URL}/api/v1/workflows`, workflowData, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("Successfully deployed simplified workflow!");
        console.log(`New Workflow ID: ${response.data.id}`);
        console.log(`URL: https://n8n.camiloruas.dev/workflow/${response.data.id}`);
    } catch (error) {
        console.error("Error deploying simplified workflow:", error.response?.data || error.message);
    }
}

deploySimplifiedWorkflow();
