
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function fixPostgresMemoryError() {
    const portfolioId = "eMikHpGyw6OFxuob";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Update "Preparar Dados" to only output "mensagem" but we need the others for tools.
        // Actually, the best way in n8n is to keep the nodes but change the Agent input.
        // I will add a "Set" node called "Limpar Input" just before the Agent.

        const cleanInputNode = {
            parameters: {
                assignments: {
                    assignments: [
                        {
                            id: "input-key",
                            name: "input",
                            value: "={{ $json.mensagem }}",
                            type: "string"
                        }
                    ]
                },
                options: {}
            },
            type: "n8n-nodes-base.set",
            typeVersion: 3.4,
            position: [330, -100],
            id: "clean-input-node-1",
            name: "Limpar Input para IA"
        };

        // Check if already exists to avoid duplication
        if (!wf.nodes.find(n => n.name === cleanInputNode.name)) {
            wf.nodes.push(cleanInputNode);
        }

        // 2. Adjust Connections
        // Webhook -> Preparar Dados -> Limpar Input -> AI Agent
        wf.connections["Preparar Dados"].main = [[{ node: "Limpar Input para IA", type: "main", index: 0 }]];
        wf.connections["Limpar Input para IA"] = {
            main: [
                [
                    {
                        node: "AI Agent",
                        type: "main",
                        index: 0
                    }
                ]
            ]
        };

        // 3. Update AI Agent to use the new "input" key
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.text = "={{ $json.input }}";
            // Ensure memory still uses the phone from Preparar Dados
            const memoryNode = wf.nodes.find(n => n.name === 'Memória Postgres');
            if (memoryNode) {
                memoryNode.parameters.sessionKey = "={{ $('Preparar Dados').item.json.telefone }}";
            }
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Successfully fixed the Postgres Memory key error.");
    } catch (error) {
        console.error("Error fixing memory node:", error.response?.data || error.message);
    }
}

fixPostgresMemoryError();
