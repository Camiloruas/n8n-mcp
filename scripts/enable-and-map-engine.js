
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function enableAndMapEngine() {
    const engineId = "2KtkOaUAIx_IntJD-wHya";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${engineId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Enable Gerar Slots
        const codeNode = wf.nodes.find(n => n.name === 'Gerar Slots');
        if (codeNode) {
            codeNode.disabled = false;
        }

        // 2. Set explicit mapping in Create a row
        const createNode = wf.nodes.find(n => n.name === 'Create a row');
        if (createNode) {
            createNode.parameters.dataToSend = "defineBelow";
            createNode.parameters.fieldsUi = {
                fieldValues: [
                    { fieldId: "data", fieldValue: "={{ $json.data }}" },
                    { fieldId: "hora_inicio", fieldValue: "={{ $json.hora_inicio }}" },
                    { fieldId: "hora_fim", fieldValue: "={{ $json.hora_fim }}" },
                    { fieldId: "status", fieldValue: "={{ $json.status }}" }
                ]
            };
        }

        await axios.put(`${API_URL}/api/v1/workflows/${engineId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Engine node enabled and explicit mapping set in 'Create a row'.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}
enableAndMapEngine();
