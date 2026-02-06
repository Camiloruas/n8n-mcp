
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function updatePortfolioWorkflow() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const cancelId = "nj8BbsVlFjHFYWDoE-qA9";
    const bookId = "8C195OrvhCXh3biQ";
    const consultId = "20Rq4ar-aW-W3s3CvO_px";

    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Ensure all 3 tool nodes exist
        const tools = [
            {
                name: "consultar_horarios",
                id: consultId,
                inputs: {
                    data: "={{ $json.data }}"
                },
                schema: [
                    { id: "data", displayName: "Data", required: true, type: "string", description: "Data (YYYY-MM-DD)" }
                ]
            },
            {
                name: "agendar_reserva",
                id: bookId,
                inputs: {
                    slot_id: "={{ $json.slot_id }}",
                    telefone: "={{ $node[\"Preparar Dados\"].json.telefone }}"
                },
                schema: [
                    { id: "slot_id", displayName: "ID do Slot", required: true, type: "string" },
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ]
            },
            {
                name: "cancelar_reserva",
                id: cancelId,
                inputs: {
                    telefone: "={{ $node[\"Preparar Dados\"].json.telefone }}"
                },
                schema: [
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ]
            }
        ];

        wf.nodes = wf.nodes.filter(n => n.type !== "@n8n/n8n-nodes-langchain.toolWorkflow");

        tools.forEach((t, index) => {
            wf.nodes.push({
                parameters: {
                    workflowId: {
                        __rl: true,
                        value: t.id,
                        mode: "list"
                    },
                    workflowInputs: {
                        mappingMode: "defineBelow",
                        value: t.inputs,
                        schema: t.schema
                    }
                },
                type: "@n8n/n8n-nodes-langchain.toolWorkflow",
                typeVersion: 2.2,
                position: [700, 200 + (index * 150)],
                name: t.name
            });
        });

        // 2. Re-establish connections
        wf.connections = wf.connections || {};
        tools.forEach(t => {
            wf.connections[t.name] = {
                ai_tool: [
                    [
                        {
                            node: "AI Agent",
                            type: "ai_tool",
                            index: 0
                        }
                    ]
                ]
            };
        });

        // 3. Update prompt to be consistent
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = `Você é o Rafael Ruas, assistente de agendamento profissional.
            
Regras:
1. Para consultar, use 'consultar_horarios' pedindo a data se necessário.
2. Para agendar, use 'agendar_reserva' com o slot_id.
3. Para cancelar, use 'cancelar_reserva'.
Sempre retorne a mensagem exata das ferramentas.`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: { executionOrder: "v1", timezone: "America/Sao_Paulo" },
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Portfolio workflow fully integrated with all 3 tools.");
    } catch (error) {
        console.error("Error updating portfolio workflow:", error.response?.data || error.message);
    }
}

updatePortfolioWorkflow();
