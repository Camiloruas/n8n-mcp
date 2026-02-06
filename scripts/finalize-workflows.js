
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function finalizeWorkflows() {
    try {
        // 1. Update Consultar (Raw JSON return)
        const consultId = "20Rq4ar-aW-W3s3CvO_px";
        const { data: wfC } = await axios.get(`${API_URL}/api/v1/workflows/${consultId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // The AI is better at handling the raw list of objects.
        // We will make "Buscar horários disponíveis" the last node or 
        // add a simple transformation to keep only necessary fields.
        wfC.nodes = wfC.nodes.filter(n => !['Formatar Data', 'Code in JavaScript'].includes(n.name));

        const simplifyNode = {
            parameters: {
                jsCode: `
return $input.all().map(item => ({
    json: {
        id: item.json.id,
        horario: item.json.hora_inicio.slice(0, 5),
        data: item.json.data
    }
}));
`
            },
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [600, 0],
            name: "Simplificar Dados"
        };

        if (!wfC.nodes.find(n => n.name === simplifyNode.name)) {
            wfC.nodes.push(simplifyNode);
        }

        wfC.connections["Buscar horários disponíveis"].main = [[{ node: "Simplificar Dados", type: "main", index: 0 }]];
        wfC.connections["Simplificar Dados"] = { main: [[]] }; // It's the end

        await axios.put(`${API_URL}/api/v1/workflows/${consultId}`, {
            name: wfC.name,
            nodes: wfC.nodes,
            connections: wfC.connections,
            settings: wfC.settings,
            staticData: wfC.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Consultar updated to return simple JSON objects.");

        // 2. Update Agendar (Fix references)
        const bookId = "8C195OrvhCXh3biQ";
        const { data: wfB } = await axios.get(`${API_URL}/api/v1/workflows/${bookId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const checkNode = wfB.nodes.find(n => n.name === 'Verificar Slot');
        if (checkNode) {
            // It should search using slot_id from the first node
            checkNode.parameters.filters.conditions[0].keyValue = "={{ $node[\"Receber Dados\"].json.slot_id }}";
        }

        const reserveNode = wfB.nodes.find(n => n.name === 'Reservar Slot');
        if (reserveNode) {
            // Filter by ID from the "Verificar Slot" node
            reserveNode.parameters.filters.conditions[0].keyValue = "={{ $node[\"Verificar Slot\"].json.id }}";
            reserveNode.parameters.fieldsUi.fieldValues[1].fieldValue = "={{ $node[\"Receber Dados\"].json.telefone }}";
        }

        const recordNode = wfB.nodes.find(n => n.name === 'Criar Reserva');
        if (recordNode) {
            recordNode.parameters.fieldsUi.fieldValues[0].fieldValue = "={{ $node[\"Verificar Slot\"].json.id }}";
            recordNode.parameters.fieldsUi.fieldValues[1].fieldValue = "={{ $node[\"Receber Dados\"].json.telefone }}";
        }

        await axios.put(`${API_URL}/api/v1/workflows/${bookId}`, {
            name: wfB.name,
            nodes: wfB.nodes,
            connections: wfB.connections,
            settings: wfB.settings,
            staticData: wfB.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Agendar fixed with correct node references.");

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

finalizeWorkflows();
