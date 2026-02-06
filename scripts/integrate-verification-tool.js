
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function integrateVerificationTool() {
    const portfolioId = "eMikHpGyw6OFxuob";
    const newToolWfId = "gfNVRZMEGWRjfUmw";

    try {
        console.log("Activating new verification sub-workflow...");
        await axios.post(`${API_URL}/api/v1/workflows/${newToolWfId}/activate`, {}, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        }).catch(() => { });

        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. ADD NEW TOOL NODE to Portfolio
        const checkToolNode = {
            "parameters": {
                "workflowId": {
                    "__rl": true,
                    "value": newToolWfId,
                    "mode": "list"
                },
                "workflowInputs": {
                    "mappingMode": "defineBelow",
                    "value": {
                        "telefone": "={{ $('Preparar Dados').item.json.telefone }}"
                    },
                    "schema": [
                        {
                            "id": "telefone",
                            "displayName": "Telefone",
                            "required": true,
                            "type": "string"
                        }
                    ]
                },
                "description": "Verifica se o cliente já possui um agendamento ativo."
            },
            "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
            "typeVersion": 2.2,
            "position": [704, 672],
            "name": "consultar_meu_agendamento",
            "id": "new-check-tool-id"
        };

        // Add to nodes if not already there
        if (!wf.nodes.find(n => n.name === 'consultar_meu_agendamento')) {
            wf.nodes.push(checkToolNode);
        }

        // 2. CONNECT TO AGENT
        if (wf.connections["consultar_meu_agendamento"]) {
            // already connected
        } else {
            wf.connections["consultar_meu_agendamento"] = {
                "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
            };
        }

        // 3. UPDATE PROMPT
        const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
        if (agentNode) {
            agentNode.parameters.options.systemMessage = `
<Identidade>
  Nome: Rafael Ruas
  Persona: Você é um assistente de agendamentos de alto nível.
</Identidade>

<Processo_Prioritario>
  **IMPORTANTE:** Antes de mostrar horários disponíveis ou tentar agendar, SEMPRE utilize a ferramenta **'consultar_meu_agendamento'** para verificar se o cliente já possui uma reserva ativa.
  
  - Se ele JÁ POSSUI reserva: Informe os detalhes e pergunte se ele deseja CANCELAR a atual antes de marcar uma nova. 
  - Regra de Ouro: O sistema NÃO permite dois agendamentos para o mesmo número.
</Processo_Prioritario>

<Operacao_das_Ferramentas>
  1. **Verificar agendamento (consultar_meu_agendamento):** Verifique se o cliente já tem algo marcado.
  2. **Consultar Horários (consultar_horarios):** Apenas se ele não tiver reserva ou quiser remarcar.
  3. **Agendar Reserva (agendar_reserva):** Siga as regras de data (AAAA-MM-DD) e horário (HH:mm).
  4. **Cancelar Reserva (cancelar_reserva):** Use para liberar o horário atual.
</Operacao_das_Ferramentas>

<Tom_de_Voz> Cordial, Brasileiro. </Tom_de_Voz>
`;
        }

        await axios.put(`${API_URL}/api/v1/workflows/${portfolioId}`, {
            name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Portfolio updated with 'Consultar Meu Agendamento' tool and new prompt logic.");

    } catch (error) {
        console.error("Integration Error:", error.response?.data || error.message);
    }
}
integrateVerificationTool();
