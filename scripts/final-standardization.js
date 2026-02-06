
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function deployBookingTool() {
    try {
        const wf = JSON.parse(fs.readFileSync('workflow_booking.json', 'utf8'));
        const response = await axios.post(`${API_URL}/api/v1/workflows`, wf, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log(`Booking tool deployed. ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error("Error deploying booking tool:", error.response?.data || error.message);
    }
}

async function updateMainAgent(bookingId) {
    const mainId = "Wn8FfWkBfgt56QPm";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${mainId}`, { headers: { 'X-N8N-API-KEY': API_KEY } });

        // 1. Update Tools Configuration in main workflow
        // Ensure agendar_reserva is added or updated
        let bookingNode = wf.nodes.find(n => n.name === 'agendar_reserva');
        if (!bookingNode) {
            bookingNode = {
                parameters: {
                    workflowId: {
                        __rl: true,
                        value: bookingId,
                        mode: "list"
                    },
                    workflowInputs: {
                        mappingMode: "defineBelow",
                        value: {
                            slot_id: "={{ $json.slot_id }}",
                            telefone: "={{ $('global1').item.json.telefone }}"
                        },
                        schema: [
                            { id: "slot_id", displayName: "ID do Horário", required: true, type: "string" },
                            { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                        ]
                    }
                },
                type: "@n8n/n8n-nodes-langchain.toolWorkflow",
                typeVersion: 2.2,
                position: [5264, 2704],
                name: "agendar_reserva"
            };
            wf.nodes.push(bookingNode);

            // Connect to Agent
            const agentNode = wf.nodes.find(n => n.name === 'AI Agent1');
            if (agentNode) {
                if (!wf.connections["agendar_reserva"]) wf.connections["agendar_reserva"] = { ai_tool: [[]] };
                wf.connections["agendar_reserva"].ai_tool[0].push({ node: "AI Agent1", type: "ai_tool", index: 0 });
            }
        }

        // 2. Standardize Prompt
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent1');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = `=<systemData>
Data de hoje: {{ $now.weekdayLong }}, {{ $now.format('dd/MM/yyyy') }},
{{ $now.hour.toString().padStart(2, '0') }}:{{ $now.minute.toString().padStart(2, '0') }}
</systemData>

<Identidade>
  Nome: Rafael Ruas
  Papel: Assistente de Agendamento Profissional
</Identidade>

<Objetivo>
  Ajudar o cliente a gerenciar seus horários de forma cordial e rápida.
</Objetivo>

<Regras>
  - Para consultar disponibilidade: SEMPRE converta datas relativas (ex: "amanhã") para YYYY-MM-DD e use 'consultar_horarios'.
  - Para agendar: Use 'agendar_reserva' passando o slot_id escolhido e o telefone do cliente.
  - Para cancelar: Use 'cancelar_reserva' passando o telefone do cliente.
  - RETORNO: As ferramentas retornam um JSON { mensagem: "..." }. Use EXATAMENTE essa mensagem no seu retorno final quando possível.
</Regras>
`;
        }

        // 3. Clean settings
        const standardSettings = {
            executionOrder: "v1",
            timezone: "America/Sao_Paulo"
        };

        await axios.put(`${API_URL}/api/v1/workflows/${mainId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: standardSettings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Main Agent updated and standardized.");
    } catch (error) {
        console.error("Error updating main agent:", error.response?.data || error.message);
    }
}

async function main() {
    const bookingId = await deployBookingTool();
    if (bookingId) {
        await updateMainAgent(bookingId);
    }
}

main();
