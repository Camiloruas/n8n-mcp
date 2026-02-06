
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function standardizeConsultar() {
    const id = "20Rq4ar-aW-W3s3CvO_px";
    const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': API_KEY } });

    // Ensure it ends with a clean message. The code node already does this, but let's be sure.
    // The current code node name is "Code in JavaScript"
    await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        staticData: wf.staticData
    }, { headers: { 'X-N8N-API-KEY': API_KEY } });
    console.log("Consultar standardized.");
}

async function standardizeCancelar() {
    const id = "nj8BbsVlFjHFYWDoE-qA9";
    const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, { headers: { 'X-N8N-API-KEY': API_KEY } });

    // 1. Fix hardcoded phone
    const setNode = wf.nodes.find(n => n.name === 'Receber telefone cliente');
    if (setNode) {
        setNode.parameters.assignments.assignments[0].value = "={{ $json.telefone }}";
    }

    // 2. Add standardized response node if not exists
    const responseNodeName = "Retorno Padronizado";
    if (!wf.nodes.find(n => n.name === responseNodeName)) {
        const newNode = {
            parameters: {
                assignments: {
                    assignments: [
                        {
                            id: "msg-id",
                            name: "mensagem",
                            value: "Reserva cancelada com sucesso.",
                            type: "string"
                        }
                    ]
                }
            },
            type: "n8n-nodes-base.set",
            typeVersion: 3.4,
            position: [1040, 0],
            name: responseNodeName
        };
        wf.nodes.push(newNode);

        // Connect last node to this one
        const lastNode = "Marcar reserva como cancelada";
        if (!wf.connections[lastNode]) wf.connections[lastNode] = { main: [[]] };
        wf.connections[lastNode].main[0].push({ node: responseNodeName, type: "main", index: 0 });
    }

    await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        staticData: wf.staticData
    }, { headers: { 'X-N8N-API-KEY': API_KEY } });
    console.log("Cancelar standardized.");
}

async function main() {
    await standardizeConsultar();
    await standardizeCancelar();
}

main();
