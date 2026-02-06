
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function hardenBooking() {
    const id = "8C195OrvhCXh3biQ";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // Use Get Many with limit 1 to avoid crash on 0 results
        const checkNode = wf.nodes.find(n => n.name === 'Verificar Slot');
        if (checkNode) {
            checkNode.parameters.operation = "getAll";
            checkNode.parameters.limit = 1;
        }

        // Add a check Code node if missing
        const validateNode = {
            parameters: {
                jsCode: `
const slots = $input.all();

if (!slots.length) {
    return [{ mensagem: "ID de horário inválido ou não encontrado. Por favor, verifique e tente novamente." }];
}

const slot = slots[0].json;
if (slot.status !== "DISPONIVEL") {
    return [{ mensagem: "Lamento, mas este horário já foi reservado por outra pessoa." }];
}

return slots;
`
            },
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [600, -200],
            name: "Validar Disponibilidade"
        };

        if (!wf.nodes.find(n => n.name === validateNode.name)) {
            wf.nodes.push(validateNode);
        }

        // Reconnect logic
        // Verificar Slot -> Validar Disponibilidade -> IF (is success?)
        // To keep it simple, I'll use the Code node as the decider.
        // If Code node returns "mensagem", it's a failure.

        const ifNode = {
            parameters: {
                conditions: {
                    options: {
                        caseSensitive: true,
                        leftValue: "",
                        type: "string"
                    },
                    conditions: [
                        {
                            id: "valid-cond",
                            leftValue: "={{ $json.mensagem }}",
                            operator: {
                                type: "string",
                                operation: "isEmpty"
                            }
                        }
                    ],
                    combinator: "and"
                }
            },
            type: "n8n-nodes-base.if",
            typeVersion: 2.2,
            position: [800, -200],
            name: "Está Ok?"
        };
        if (!wf.nodes.find(n => n.name === ifNode.name)) wf.nodes.push(ifNode);

        // Wiring:
        // Verificar Slot -> Validar Disponibilidade -> Está Ok?
        // Está Ok? (TRUE) -> Reservar Slot
        // Está Ok? (FALSE) -> Resposta Direta (the message from code)

        wf.connections["Verificar Slot"].main = [[{ node: "Validar Disponibilidade", type: "main", index: 0 }]];
        wf.connections["Validar Disponibilidade"] = {
            main: [
                [
                    {
                        node: "Está Ok?",
                        type: "main",
                        index: 0
                    }
                ]
            ]
        };
        wf.connections["Está Ok?"] = {
            main: [
                [
                    {
                        node: "Reservar Slot",
                        type: "main",
                        index: 0
                    }
                ],
                [] // We'll let the "mensagem" pass through to the output
            ]
        };

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Booking workflow hardened with explicit validation.");
    } catch (error) {
        console.error("Error hardening booking:", error.response?.data || error.message);
    }
}

hardenBooking();
