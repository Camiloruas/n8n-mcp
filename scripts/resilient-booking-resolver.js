
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.N8N_API_URL;
const API_KEY = process.env.N8N_API_KEY;

async function implementResilientBooking() {
    const id = "8C195OrvhCXh3biQ";
    try {
        const { data: wf } = await axios.get(`${API_URL}/api/v1/workflows/${id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        // 1. Update "Verificar Slot" node to handle both UUID and Time/Date search
        const checkNode = wf.nodes.find(n => n.name === 'Verificar Slot');
        if (checkNode) {
            // We'll change Verifier logic:
            // It will check if slot_id has ":" (time) or "-" (uuid)
            // But n8n Supabase node is better with single filters.
            // Let's replace "Verificar Slot" with a more complex filter or a Code node resolver.
        }

        // --- RE-ARCHITECTURE OF BOOKING ---
        // New Receiver -> Resolver (Code) -> Supabase (Check) -> ...

        const resolverNode = {
            parameters: {
                jsCode: `
const input = items[0].json;
const slotId = input.slot_id;
const horario = input.horario;
const data = input.data;

// If slotId is a UUID (starts with letter/number and has dashes)
const isUuid = slotId && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(slotId);

return {
    isUuid,
    slot_id: slotId,
    horario: horario || (slotId && slotId.includes(':') ? slotId : null),
    data: data || new Date().toISOString().split('T')[0] // Default to today if missing
};
`
            },
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [280, 0],
            name: "Resolver Identidade"
        };

        if (!wf.nodes.find(n => n.name === resolverNode.name)) wf.nodes.push(resolverNode);

        // Update the Supabase Search (Verificar Slot)
        const supabaseSearch = wf.nodes.find(n => n.name === 'Verificar Slot');
        if (supabaseSearch) {
            // We'll use a dynamic filter: 
            // If isUuid: match id
            // Else: match data AND hora_inicio
            supabaseSearch.parameters.filters = {
                mustMatch: "any",
                conditions: [
                    {
                        keyName: "id",
                        condition: "eq",
                        keyValue: "={{ $json.isUuid ? $json.slot_id : '00000000-0000-0000-0000-000000000000' }}"
                    },
                    {
                        keyName: "hora_inicio",
                        condition: "like",
                        keyValue: "={{ !$json.isUuid && $json.horario ? $json.horario + '%' : 'NONE' }}"
                    }
                ]
            };
            // We need to add "data" filter too if not UUID
            // But Supabase "any" with "all" sub-logic is hard in n8n UI nodes.
            // Let's use a simpler approach: Just search by both and let Supabase find it.
            // Actually, if we search by (id = X OR (data = Y AND hora_inicio = Z))

            supabaseSearch.parameters.filters = {
                mustMatch: "any",
                conditions: [
                    {
                        keyName: "id",
                        condition: "eq",
                        keyValue: "={{ $json.isUuid ? $json.slot_id : 'null' }}"
                    }
                ]
            };

            // Wait, let's just make it VERY simple:
            // Two Supabase nodes if needed? No, let's use a single one with a smart expression.
            // If it's a UUID, search by ID. If not, search by data/time.
        }

        // Actually, let's keep it simple for the user.
        // I will fix the Agent's brain and use the "ID Oculto" logic properly.
        // THE REAL PROBLEM is that the Agent node doesn't have the previous tool output in its context
        // when it's calling the next tool, UNLESS the memory is working.

        // I'll update the Portfolio workflow to add "slot_id" as a proper tool parameter.
    } catch (error) {
        console.error("Error:", error.message);
    }
}
implementResilientBooking();
