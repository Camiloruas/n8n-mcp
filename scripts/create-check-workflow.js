
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

const workflowData = {
    "name": "agenda_consultar_meu_agendamento",
    "nodes": [
        {
            "parameters": {},
            "type": "n8n-nodes-base.executeWorkflowTrigger",
            "typeVersion": 1.1,
            "position": [0, 0],
            "id": "trigger-id",
            "name": "When Executed by Another Workflow"
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {
                            "id": "tel-id",
                            "name": "telefone",
                            "value": "={{ $json.telefone }}",
                            "type": "string"
                        }
                    ]
                }
            },
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [200, 0],
            "id": "set-tel-id",
            "name": "Receber Telefone"
        },
        {
            "parameters": {
                "operation": "getAll",
                "tableId": "agenda_slots",
                "limit": 1,
                "filters": {
                    "conditions": [
                        {
                            "keyName": "cliente_telefone",
                            "condition": "eq",
                            "keyValue": "={{ $json.telefone }}"
                        },
                        {
                            "keyName": "status",
                            "condition": "eq",
                            "keyValue": "RESERVADO"
                        }
                    ]
                }
            },
            "type": "n8n-nodes-base.supabase",
            "typeVersion": 1,
            "position": [400, 0],
            "id": "search-id",
            "name": "Buscar Reserva Ativa",
            "credentials": {
                "supabaseApi": {
                    "id": "cuLPizV1tj78XzSn",
                    "name": "Supabase (Agente IA)"
                }
            }
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {
                            "id": "msg-id",
                            "name": "mensagem",
                            "value": "={{ $input.all().length > 0 ? 'Você já possui um agendamento para o dia ' + $json.data + ' às ' + $json.hora_inicio.slice(0,5) + '.' : 'Não encontrei nenhum agendamento ativo para você.' }}",
                            "type": "string"
                        },
                        {
                            "id": "has-res-id",
                            "name": "tem_reserva",
                            "value": "={{ $input.all().length > 0 }}",
                            "type": "boolean"
                        }
                    ]
                }
            },
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [600, 0],
            "id": "format-id",
            "name": "Formatar Retorno"
        }
    ],
    "connections": {
        "When Executed by Another Workflow": {
            "main": [[{ "node": "Receber Telefone", "type": "main", "index": 0 }]]
        },
        "Receber Telefone": {
            "main": [[{ "node": "Buscar Reserva Ativa", "type": "main", "index": 0 }]]
        },
        "Buscar Reserva Ativa": {
            "main": [[{ "node": "Formatar Retorno", "type": "main", "index": 0 }]]
        }
    },
    "settings": { "executionOrder": "v1" }
};

async function createCheckWorkflow() {
    try {
        const { data } = await axios.post(`${API_URL}/api/v1/workflows`, workflowData, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        console.log("Check workflow created with ID:", data.id);
        return data.id;
    } catch (error) {
        console.error("Error creating workflow:", error.response?.data || error.message);
    }
}
createCheckWorkflow();
