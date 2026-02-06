
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function definitiveStabilization() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const subWorkflows = {
        cancel: "nj8BbsVlFjHFYWDoE-qA9",
        consult: "20Rq4ar-aW-W3s3CvO_px",
        book: "8C195OrvhCXh3biQ"
    };

    try {
        // 1. Activate all sub-workflows first
        for (const [key, id] of Object.entries(subWorkflows)) {
            await axios.post(`${API_URL}/api/v1/workflows/${id}/activate`, {}, {
                headers: { 'X-N8N-API-KEY': API_KEY }
            }).catch(() => { });
        }

        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 2. Fix Input nodes
        const prepNode = wf.nodes.find(n => n.name === 'Preparar Dados');
        if (prepNode) {
            prepNode.parameters.assignments.assignments = [
                { id: "1", name: "telefone", value: "={{ $json.body.data.key.remoteJid }}", type: "string" },
                { id: "2", name: "nome", value: "={{ $json.body.data.pushName }}", type: "string" },
                { id: "3", name: "input", value: "={{ $json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text || $json.body.data.instance }}", type: "string" }
            ];
        }

        const cleanNode = wf.nodes.find(n => n.name === 'Limpar Input para IA');
        if (cleanNode) {
            cleanNode.parameters.assignments.assignments = [
                { id: "input-key", name: "input", value: "={{ $json.input || $json.entrada || $json.mensagem || '' }}", type: "string" }
            ];
        }

        // 3. Fix Agent
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.text = "={{ $json.input.toString() }}"; // Force string
        }

        // 4. Standardize Tool Schemas (The most important part)
        const tools = [
            {
                name: "consultar_horarios",
                desc: "Consulta os horários disponíveis para uma data específica (Formato YYYY-MM-DD).",
                schema: [{ id: "data", displayName: "Data", required: true, type: "string" }],
                mapping: { data: "={{ $json.data }}" }
            },
            {
                name: "agendar_reserva",
                desc: "Agenda um horário. Informe o 'slot_id' (Identificador_Tecnico) OU o 'horario' (ex: 08:00) e a 'data' (AAAA-MM-DD).",
                schema: [
                    { id: "slot_id", displayName: "slot_id", required: false, type: "string" },
                    { id: "horario", displayName: "horario", required: false, type: "string" },
                    { id: "data", displayName: "data", required: false, type: "string" }
                ],
                mapping: {
                    slot_id: "={{ $json.slot_id }}",
                    horario: "={{ $json.horario }}",
                    data: "={{ $json.data }}",
                    telefone: "={{ $('Preparar Dados').item.json.telefone }}"
                }
            },
            {
                name: "cancelar_reserva",
                desc: "Cancela a reserva ativa do cliente.",
                schema: [{ id: "confirmacao", displayName: "confirmacao", required: false, type: "string" }],
                mapping: { telefone: "={{ $('Preparar Dados').item.json.telefone }}" }
            }
        ];

        tools.forEach(t => {
            const node = wf.nodes.find(n => n.name === t.name);
            if (node) {
                node.parameters.description = t.desc;
                node.parameters.workflowInputs = {
                    mappingMode: "defineBelow",
                    value: t.mapping,
                    schema: t.schema
                };
            }
        });

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Portfolio STABILIZED definitively.");

    } catch (error) {
        console.error("Definitive Stabilization Error:", error.response?.data || error.message);
    }
}
definitiveStabilization();
