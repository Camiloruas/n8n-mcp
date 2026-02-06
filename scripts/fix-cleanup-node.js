
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixCleanupNode() {
    const portfolioId = "eMikHpGyw6OFxuob";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const cleanupNode = wf.nodes.find(n => n.name === 'Limpar Input para IA');
        if (cleanupNode) {
            const inputAssign = cleanupNode.parameters.assignments.assignments.find(a => a.name === 'input');
            if (inputAssign) {
                inputAssign.value = "={{ $json.input }}";
            }
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Cleanup node fixed: now reads from 'input'.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

fixCleanupNode();
