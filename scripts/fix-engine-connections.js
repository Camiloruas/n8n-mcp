
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixEngineConnections() {
    const engineId = "2KtkOaUAIx_IntJD-wHya";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${engineId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Ensure nodes are correct
        // Nodes are already "Gerar Slots", "Get a row", etc.

        // 2. Fix Connections
        wf.connections = {
            "Schedule Trigger": {
                "main": [[{ "node": "Get a row", "type": "main", "index": 0 }]]
            },
            "Get a row": {
                "main": [[{ "node": "Gerar Slots", "type": "main", "index": 0 }]]
            },
            "Gerar Slots": {
                "main": [[{ "node": "Create a row", "type": "main", "index": 0 }]]
            }
        };

        // 3. Put it back
        await axios.put(`${API_URL}/api/v1/workflows/${engineId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Engine workflow connections cleaned and fixed successfully.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
fixEngineConnections();
