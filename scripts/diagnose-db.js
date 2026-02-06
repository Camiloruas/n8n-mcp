
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    try {
        console.log("Checking agenda_slots table...");
        const { data: slots, error: err1 } = await supabase
            .from('agenda_slots')
            .select('*')
            .limit(1);

        if (err1) {
            console.error("Error fetching slots:", err1.message);
        } else {
            console.log("Sample slot:", JSON.stringify(slots[0], null, 2));
        }

        console.log("\nChecking agenda_reservas table...");
        const { data: res, error: err2 } = await supabase
            .from('agenda_reservas')
            .select('*')
            .limit(1);

        if (err2) {
            console.error("Error fetching reservas:", err2.message);
        } else {
            console.log("Sample reserva:", JSON.stringify(res[0], null, 2));
        }

    } catch (error) {
        console.error("Unexpected error:", error.message);
    }
}
diagnose();
