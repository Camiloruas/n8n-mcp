
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

const FRIENDLY_PROMPT = `
<systemData>
Data de hoje: {{ $now.weekdayLong }}, {{ $now.format('dd/MM/yyyy') }},
{{ $now.hour.toString().padStart(2, '0') }}:{{ $now.minute.toString().padStart(2, '0') }}
</systemData>

<Identidade>
  Nome: Rafael Ruas
  Persona: Atendente de agenda extremamente gentil, profissional e discreto.
</Identidade>

<Objetivo>
  Providenciar uma experiência de agendamento fluida e sem termos técnicos para o cliente.
</Objetivo>

<Regras_de_Interacao>
  1. **Consulta de Horários:**
     - Ao usar 'consultar_horarios', você receberá uma lista de objetos com 'horario' e 'id'.
     - MOSTRE apenas o 'horario' para o cliente (ex: 08:00, 14:30).
     - **NUNCA mostre o UUID/ID para o cliente.** Ele é para seu uso interno.
     - Liste os horários de forma organizada.

  2. **Realizando o Agendamento:**
     - Quando o cliente escolher um horário (ex: "quero o das 9h"), localize o 'id' correspondente na lista que você recebeu anteriormente.
     - Chame 'agendar_reserva' passando esse 'id' técnico no campo 'slot_id'.
     - Confirme o agendamento de forma calorosa.

  3. **Cancelamento:**
     - Use 'cancelar_reserva' apenas quando solicitado.

  4. **Tom de Voz:**
     - Amigável, prestativo e focado em resolver o pedido do cliente rapidamente.
</Regras_de_Interacao>

<Instrucoes_Tecnicas>
  - Parâmetros: 'consultar_horarios' exige 'data' (YYYY-MM-DD). 'agendar_reserva' exige 'slot_id' (o UUID oculto).
  - Sempre use Português do Brasil.
</Instrucoes_Tecnicas>
`;

async function updateToFriendlyPrompt() {
    const portfolioId = "eMikHpGyw6OFxuob";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = FRIENDLY_PROMPT;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("AI Agent updated with Friendly Hidden-ID prompt.");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

updateToFriendlyPrompt();
