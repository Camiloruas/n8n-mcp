
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function implementBulletproofBooking() {
    const id = "8C195OrvhCXh3biQ";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Add/Update the Resolver Node
        const resolverNode = {
            parameters: {
                jsCode: `
const input = $input.first().json;
const slot_id = input.slot_id;
const data = input.data || new Date().toISOString().split('T')[0];
const horario = input.horario;

// Check if slot_id is a UUID
const isUuid = slot_id && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(slot_id);

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
            name: "Resolver Parâmetros"
        };

        let existingNode = wf.nodes.find(n => n.name === "Resolver Parâmetros");
        if (!existingNode) wf.nodes.push(resolverNode);
        else existingNode.parameters.jsCode = resolverNode.parameters.jsCode;

        // 2. Clear previous "Receber Dados" (it's redundant now) or keep it as start
        const receiveNode = wf.nodes.find(n => n.name === 'Receber Dados');

        // 3. Update "Verificar Slot" (Supabase Search)
        // We will make it search by ID if isUuid, else by data+hora
        const supabaseSearch = wf.nodes.find(n => n.name === 'Verificar Slot');
        if (supabaseSearch) {
            supabaseSearch.parameters.operation = "getAll";
            supabaseSearch.parameters.limit = 1;
            supabaseSearch.parameters.filters = {
                mustMatch: "all",
                conditions: [
                    {
                        keyName: "status",
                        condition: "eq",
                        keyValue: "DISPONIVEL"
                    }
                ]
            };

            // This is the magic: we use an expression that switches the filter field
            supabaseSearch.parameters.filters.conditions.push({
                keyName: "={{ $node[\"Resolver Parâmetros\"].json.isUuid ? 'id' : 'hora_inicio' }}",
                condition: "={{ $node[\"Resolver Parâmetros\"].json.isUuid ? 'eq' : 'like' }}",
                keyValue: "={{ $node[\"Resolver Parâmetros\"].json.isUuid ? $node[\"Resolver Parâmetros\"].json.slot_id : $node[\"Resolver Parâmetros\"].json.horario + '%' }}"
            });

            // If not UUID, we ALSO need to filter by data
            // We'll add it unconditionally but make it match "ALL"
            // If it's a UUID, the data filter won't hurt if we set it to something broad, 
            // OR we can use the Code node to provide the filter.

            // Actually, let's add the data filter.
            supabaseSearch.parameters.filters.conditions.push({
                keyName: "data",
                condition: "eq",
                keyValue: "={{ $node[\"Resolver Parâmetros\"].json.data }}"
            });
        }

        // Connections: Trigger -> Resolver Parâmetros -> Verificar Slot
        wf.connections["When Executed by Another Workflow"].main = [[{ node: "Resolver Parâmetros", type: "main", index: 0 }]];
        wf.connections["Resolver Parâmetros"] = { main: [[{ node: "Verificar Slot", type: "main", index: 0 }]] };

        await axios.put(`${API_URL}/api/v1/workflows/${id}`, {
            name: wf.name,
            nodes: wf.nodes,
            connections: wf.connections,
            settings: wf.settings,
            staticData: wf.staticData
        }, { headers: { 'X-N8N-API-KEY': API_KEY } });

        console.log("Booking sub-workflow upgraded to Bulletproof Resolver.");
    } catch (error) {
        console.error("Error:", error.message);
    }
}
implementBulletproofBooking();
