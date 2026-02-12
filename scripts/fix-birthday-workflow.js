
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = "X1loXnG3eCWnY8UhKqkng";

async function fixBirthdayWorkflow() {
    try {
        console.log(`Fetching workflow ${WORKFLOW_ID}...`);
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("Nodes found:", wf.nodes.map(n => n.type));

        const redisNode = wf.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.memoryRedisChat');
        if (!redisNode) {
            console.error("Redis Chat Memory node not found!");
            return;
        }

        console.log("Found Redis Chat Memory node:", redisNode.name);

        // Fix: Set a static session key instead of relying on the trigger's sessionId
        redisNode.parameters.sessionKey = "birthday_checker_session";

        // Ensure sessionTTL is set (it was 2 in the debug output, keeping it)
        if (!redisNode.parameters.sessionTTL) {
            redisNode.parameters.sessionTTL = 2; // Hours
        }

        console.log("Updating workflow...");
        await axios.put(`${API_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("✅ Workflow updated successfully!");

        // Optional: Trigger a test run
        // console.log("Triggering test execution...");
        // await axios.post(`${API_URL}/api/v1/workflows/${WORKFLOW_ID}/execute`, {}, { headers: { 'X-N8N-API-KEY': API_KEY } });

    } catch (error) {
        console.error("Error updating workflow:", error);
        if (error.response) {
            console.error("Status:", error.response.status, error.response.statusText);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("No response received. Error stack:", error.stack);
        }
    }
}

fixBirthdayWorkflow();
