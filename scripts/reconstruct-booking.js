
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function reconstructBooking() {
    const id = "8C195OrvhCXh3biQ";
    const credId = "cuLPizV1tj78XzSn";

    try {
        const wf = {
            name: "agenda_agendar_reserva",
            nodes: [
                {
                    parameters: { inputSource: "passthrough" },
                    type: "n8n-nodes-base.executeWorkflowTrigger",
                    typeVersion: 1.1,
                    position: [0, 0],
                    name: "trigger"
                },
                {
                    parameters: {
                        jsCode: `
const input = $input.first().json;
const slot_id = input.slot_id;
const data = input.data || new Date().toISOString().split('T')[0];
const horario = input.horario || (!slot_id || !slot_id.includes('-') ? slot_id : null);

// Very basic UUID check
const isUuid = slot_id && slot_id.length > 20 && slot_id.includes('-');

return {
    isUuid,
    slot_id: isUuid ? slot_id : null,
    horario: !isUuid ? (horario || slot_id) : null,
    data: data,
    telefone: input.telefone
};
`
                    },
                    type: "n8n-nodes-base.code",
                    typeVersion: 2,
                    position: [200, 0],
                    name: "Resolver Dados"
                },
                {
                    parameters: {
                        conditions: {
                            options: {
                                caseSensitive: true,
                                leftValue: "",
                                type: "string"
                            },
                            conditions: [
                                {
                                    id: "uuid-cond",
                                    leftValue: "={{ $json.isUuid }}",
                                    operator: {
                                        type: "boolean",
                                        operation: "true"
                                    }
                                }
                            ],
                            combinator: "and"
                        }
                    },
                    type: "n8n-nodes-base.if",
                    typeVersion: 2.2,
                    position: [400, 0],
                    name: "É UUID?"
                },
                {
                    parameters: {
                        operation: "getAll",
                        tableId: "agenda_slots",
                        filters: {
                            conditions: [
                                { keyName: "id", condition: "eq", keyValue: "={{ $json.slot_id }}" },
                                { keyName: "status", condition: "eq", keyValue: "DISPONIVEL" }
                            ]
                        },
                        limit: 1
                    },
                    type: "n8n-nodes-base.supabase",
                    typeVersion: 1,
                    position: [600, -100],
                    name: "Buscar por ID",
                    credentials: { supabaseApi: { id: credId, name: "Supabase (Agente IA)" } }
                },
                {
                    parameters: {
                        operation: "getAll",
                        tableId: "agenda_slots",
                        filters: {
                            conditions: [
                                { keyName: "data", condition: "eq", keyValue: "={{ $json.data }}" },
                                { keyName: "hora_inicio", condition: "like", keyValue: "={{ $json.horario + '%' }}" },
                                { keyName: "status", condition: "eq", keyValue: "DISPONIVEL" }
                            ]
                        },
                        limit: 1
                    },
                    type: "n8n-nodes-base.supabase",
                    typeVersion: 1,
                    position: [600, 100],
                    name: "Buscar por Tempo",
                    credentials: { supabaseApi: { id: credId, name: "Supabase (Agente IA)" } }
                },
                {
                    parameters: {
                        jsCode: `
const slots = $input.all();
if (!slots.length) {
    return { error: true, mensagem: "Horário não encontrado ou já reservado." };
}
return slots[0].json;
`
                    },
                    type: "n8n-nodes-base.code",
                    typeVersion: 2,
                    position: [850, 0],
                    name: "Validar Slot"
                },
                {
                    parameters: {
                        conditions: {
                            options: {
                                caseSensitive: true,
                                leftValue: "",
                                type: "string"
                            },
                            conditions: [
                                {
                                    id: "error-cond",
                                    leftValue: "={{ $json.error }}",
                                    operator: {
                                        type: "boolean",
                                        operation: "notTrue"
                                    }
                                }
                            ],
                            combinator: "and"
                        }
                    },
                    type: "n8n-nodes-base.if",
                    typeVersion: 2.2,
                    position: [1050, 0],
                    name: "Tudo Certo?"
                },
                {
                    parameters: {
                        operation: "update",
                        tableId: "agenda_slots",
                        filters: {
                            conditions: [{ keyName: "id", condition: "eq", keyValue: "={{ $json.id }}" }]
                        },
                        fieldsUi: {
                            fieldValues: [
                                { fieldId: "status", fieldValue: "RESERVADO" },
                                { fieldId: "cliente_telefone", fieldValue: "={{ $('Resolver Dados').item.json.telefone }}" }
                            ]
                        }
                    },
                    type: "n8n-nodes-base.supabase",
                    typeVersion: 1,
                    position: [1250, -100],
                    name: "Reservar no Banco",
                    credentials: { supabaseApi: { id: credId, name: "Supabase (Agente IA)" } }
                },
                {
                    parameters: {
                        tableId: "agenda_reservas",
                        dataToSend: "defineBelow",
                        fieldsUi: {
                            fieldValues: [
                                { fieldId: "slot_id", fieldValue: "={{ $node[\"Validar Slot\"].json.id }}" },
                                { fieldId: "cliente_telefone", fieldValue: "={{ $('Resolver Dados').item.json.telefone }}" },
                                { fieldId: "status", fieldValue: "RESERVADO" }
                            ]
                        }
                    },
                    type: "n8n-nodes-base.supabase",
                    typeVersion: 1,
                    position: [1450, -100],
                    name: "Registrar Reserva",
                    credentials: { supabaseApi: { id: credId, name: "Supabase (Agente IA)" } }
                },
                {
                    parameters: {
                        assignments: {
                            assignments: [
                                { id: "a1", name: "mensagem", value: "Perfeito! Seu agendamento foi realizado com sucesso.", type: "string" }
                            ]
                        }
                    },
                    type: "n8n-nodes-base.set",
                    typeVersion: 3.4,
                    position: [1650, -100],
                    name: "Fim Sucesso"
                },
                {
                    parameters: {
                        assignments: {
                            assignments: [
                                { id: "a2", name: "mensagem", value: "={{ $json.mensagem }}", type: "string" }
                            ]
                        }
                    },
                    type: "n8n-nodes-base.set",
                    typeVersion: 3.4,
                    position: [1250, 100],
                    name: "Fim Erro"
                }
            ],
            connections: {
                "trigger": { main: [[{ node: "Resolver Dados", type: "main", index: 0 }]] },
                "Resolver Dados": { main: [[{ node: "É UUID?", type: "main", index: 0 }]] },
                "É UUID?": { main: [[{ node: "Buscar por ID", type: "main", index: 0 }], [{ node: "Buscar por Tempo", type: "main", index: 0 }]] },
                "Buscar por ID": { main: [[{ node: "Validar Slot", type: "main", index: 0 }]] },
                "Buscar por Tempo": { main: [[{ node: "Validar Slot", type: "main", index: 0 }]] },
                "Validar Slot": { main: [[{ node: "Tudo Certo?", type: "main", index: 0 }]] },
                "Tudo Certo?": { main: [[{ node: "Reservar no Banco", type: "main", index: 0 }], [{ node: "Fim Erro", type: "main", index: 0 }]] },
                "Reservar no Banco": { main: [[{ node: "Registrar Reserva", type: "main", index: 0 }]] },
                "Registrar Reserva": { main: [[{ node: "Fim Sucesso", type: "main", index: 0 }]] }
            },
            settings: { executionOrder: "v1" }
        };

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, wf, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        console.log("Booking workflow reconstructed successfully and it's UI-friendly!");
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

reconstructBooking();
