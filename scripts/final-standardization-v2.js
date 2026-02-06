
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function finalStandardization() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const consultId = "20Rq4ar-aW-W3s3CvO_px";

    try {
        // 1. Update Consultation Output to Markdown Table
        const { data: wfC } = await axios.get(`${API_URL}/api/v1/workflows/${consultId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const codeNode = wfC.nodes.find(n => n.name === 'Simplificar Dados');
        if (codeNode) {
            codeNode.parameters.jsCode = `
const items = $input.all();
if (!items.length) return [{ mensagem: "Não encontrei horários disponíveis." }];

let table = "| Horário | Identificador_Tecnico |\\n| --- | --- |\\n";
items.forEach(i => {
    table += \`| \${i.json.horario} | \${i.json.id} |\\n\`;
});

return [{ mensagem: "TABELA_HORARIOS:\\n" + table }];
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${consultId}`, {
            name: wfC.name,
            nodes: wfC.nodes,
            connections: wfC.connections,
            settings: wfC.settings,
            staticData: wfC.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("Consultation updated to Markdown Table format.");

        // 2. Update AI Agent Prompt and Tool Mapping
        const { data: wfP } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const agentNode = wfP.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = `
# Identidade
Você é o Rafael Ruas, assistente virtual de agendamentos. Seu tom é profissional, extremamente educado e prestativo.

# Processo de Consulta
- Sempre use 'consultar_horarios' para ver a disponibilidade.
- Você receberá uma tabela 'TABELA_HORARIOS'. 
- **REGRA DE OURO:** Mostre apenas o horário (ex: "temos às 09:00 e 10:00") para o cliente. 
- **JAMAIS** mostre o 'Identificador_Tecnico' no chat. Ele é secreto e apenas para seu uso interno.

# Processo de Agendamento
- Quando o usuário escolher um horário, localize o 'Identificador_Tecnico' correspondente na tabela que você recebeu.
- Chame 'agendar_reserva' passando esse Identificador no campo 'slot_id'.
- Se por algum motivo o identificador for perdido, passe o horário desejado (ex: "09:00") no campo 'slot_id' como fallback.

# Instruções Finais
- Responda sempre em Português do Brasil.
- Confirme o agendamento de forma gentil.
`;
        }

        const bookNode = wfP.nodes.find(n => n.name === 'agendar_reserva');
        if (bookNode) {
            bookNode.parameters.workflowInputs = {
                mappingMode: "defineBelow",
                value: {
                    slot_id: "={{ $json.slot_id }}",
                    telefone: "={{ $('Preparar Dados').item.json.telefone }}"
                },
                schema: [
                    { id: "slot_id", displayName: "Slot ID", required: true, type: "string" },
                    { id: "telefone", displayName: "Telefone", required: true, type: "string" }
                ]
            };
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wfP.name,
            nodes: wfP.nodes,
            connections: wfP.connections,
            settings: wfP.settings,
            staticData: wfP.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("AI Agent prompt and tool mapping finalized.");

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

finalStandardization();
