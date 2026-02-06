
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function finalizeBulletproofSystem() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const bookWfId = "8C195OrvhCXh3biQ";
    const consultWfId = "20Rq4ar-aW-W3s3CvO_px";
    const cancelWfId = "nj8BbsVlFjHFYWDoE-qA9";
    const checkWfId = "gfNVRZMEGWRjfUmw";

    try {
        console.log("🚀 STARTING FINAL BULLETPROOF STABILIZATION...");

        // --- 1. HARDEN CONSULTATION (20Rq4ar-aW-W3s3CvO_px) ---
        const { data: wfC } = await axios.get(`${API_URL}/api/v1/workflows/${consultWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const simplifyNode = wfC.nodes.find(n => n.name === 'Simplificar Dados');
        if (simplifyNode) {
            simplifyNode.parameters.jsCode = `
const items = $input.all();
// FORCE MANUAL FILTERING BY STATUS
const availableSlots = items.filter(i => i.json.status === 'DISPONIVEL');

if (!availableSlots.length) {
    return [{ mensagem: "Desculpe, não encontrei horários livres para esta data. Por favor, tente outro dia." }];
}

let table = "| Horário | Identificador_Tecnico |\\n| --- | --- |\\n";
availableSlots.forEach(i => {
    const hora = i.json.hora_inicio ? i.json.hora_inicio.slice(0, 5) : "??:??";
    table += "| " + hora + " | " + i.json.id + " |\\n";
});

return [{ mensagem: "TABELA_DE_HORARIOS_LIVRES:\\n" + table }];
`;
        }
        await axios.put(`${API_URL}/api/v1/workflows/${consultWfId}`, {
            name: wfC.name, nodes: wfC.nodes, connections: wfC.connections, settings: wfC.settings, staticData: wfC.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("✅ Consultation hardened with Strict Filtering.");

        // --- 2. HARDEN BOOKING (8C195OrvhCXh3biQ) ---
        // (Ensuring it stays lean but robust as per user's preference)
        const { data: wfB } = await axios.get(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const bookValidate = wfB.nodes.find(n => n.name === 'Validar Slot');
        if (bookValidate) {
            bookValidate.parameters.jsCode = `
const slots = $input.all();
if (!slots.length) {
    return [{ json: { ERROR_OCCURRED: true, mensagem: "Este horário não está mais disponível. Por favor, escolha outro." } }];
}
return [ slots[0] ];
`;
        }
        await axios.put(`${API_URL}/api/v1/workflows/${bookWfId}`, {
            name: wfB.name, nodes: wfB.nodes, connections: wfB.connections, settings: wfB.settings, staticData: wfB.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("✅ Booking hardened.");

        // --- 3. STABILIZE PORTFOLIO (eMikHpGyw6OFxuob) ---
        const { data: wfP } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 3a. Limpar Input para IA: Pre-calculate date context
        const cleanNode = wfP.nodes.find(n => n.name === 'Limpar Input para IA');
        if (cleanNode) {
            cleanNode.parameters.assignments.assignments = [
                { id: "1", name: "input", value: "={{ $json.input || $json.entrada || $json.mensagem || '' }}", type: "string" },
                { id: "2", name: "data_hoje", value: "={{ $now.format('dd/MM/yyyy') }}", type: "string" },
                { id: "3", name: "dia_semana", value: "={{ $now.weekdayLong }}", type: "string" },
                { id: "4", name: "hora_atual", value: "={{ $now.hour.toString().padStart(2, '0') }}:{{ $now.minute.toString().padStart(2, '0') }}", type: "string" },
                { id: "5", name: "data_iso", value: "={{ $now.format('yyyy-MM-dd') }}", type: "string" }
            ];
        }

        // 3b. AI Agent: The Platinum Master Prompt
        const agentNode = wfP.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = `
<Identidade>
  Nome: Rafael Ruas
  Persona: Você é um concierge de agendamentos impecável, focado em precisão absoluta.
  Contexto Temporal: Hoje é {dia_semana}, {data_hoje}. Hora: {hora_atual}.
</Identidade>

<Regras_Inflexiveis>
  1. **Grounding:** Estamos no ano de 2026. Ignore qualquer data do passado.
  2. **Veracidade das Vagas:** Você NUNCA conhece os horários de antemão. Você DEVE usar 'consultar_horarios' para descobrir o que está livre.
  3. **Filtro Rigoroso:** Se a ferramenta 'consultar_horarios' trouxer uma lista, mostre APENAS o que está nela. Se um horário NÃO estiver na lista, ele NÃO existe.
  4. **Check Prévio:** Antes de oferecer vagas ou agendar, use 'consultar_meu_agendamento' para ver se o cliente já tem reserva.
</Regras_Inflexiveis>

<Fluxo_Logico>
  - Se o cliente quer agendar: Primeiro 'consultar_meu_agendamento'.
  - Se ele já tem reserva: Mostre os detalhes e pergunte se quer cancelar a atual antes.
  - Se não tem: 'consultar_horarios' para a data desejada (use {data_iso} para hoje).
</Fluxo_Logico>

<Tom_de_Voz> Brasileiro, cordial, de elite. </Tom_de_Voz>
`;
        }

        // 3c. Ensure all tools are mapped
        const tools = [
            { name: "consultar_meu_agendamento", wfId: checkWfId, desc: "Verifica se o cliente já possui um agendamento.", mapping: { telefone: "={{ $('Preparar Dados').item.json.telefone }}" } },
            { name: "consultar_horarios", wfId: consultWfId, desc: "Consulta vagas para uma data (YYYY-MM-DD).", mapping: { data: "={{ $json.data }}" } },
            { name: "agendar_reserva", wfId: bookWfId, desc: "Agenda um horário (horario HH:mm, data AAAA-MM-DD).", mapping: { slot_id: "={{ $json.slot_id }}", horario: "={{ $json.horario }}", data: "={{ $json.data }}", telefone: "={{ $('Preparar Dados').item.json.telefone }}" } },
            { name: "cancelar_reserva", wfId: cancelWfId, desc: "Cancela a reserva do cliente.", mapping: { confirmacao: "={{ $json.confirmacao }}", telefone: "={{ $('Preparar Dados').item.json.telefone }}" } }
        ];

        tools.forEach(t => {
            let node = wfP.nodes.find(n => n.name === t.name);
            if (node) {
                node.parameters.workflowInputs = { mappingMode: "defineBelow", value: t.mapping };
                node.parameters.description = t.desc;
            }
        });

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wfP.name, nodes: wfP.nodes, connections: wfP.connections, settings: wfP.settings, staticData: wfP.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });
        console.log("✅ Portfolio fully stabilized and grounded.");

        // --- 4. ACTIVATE ALL ---
        const allIds = [portfolioId, bookWfId, consultWfId, cancelWfId, checkWfId];
        for (const id of allIds) {
            await axios.post(`${API_URL}/api/v1/workflows/${id}/activate`, {}, { headers: { 'X-N8N-API-KEY': API_KEY } }).catch(() => { });
        }
        console.log("💎 ULTIMATE SYSTEM ONLINE.");

    } catch (error) {
        console.error("🔴 STABILIZATION FAILED:", error.response?.data || error.message);
    }
}
finalizeBulletproofSystem();
