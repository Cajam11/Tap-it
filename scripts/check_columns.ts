import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role to bypass rls

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from("transactions").select("booking_id").limit(1);
  if (error) {
    console.error("Error confirming booking_id column:", error.message);
  } else {
    console.log("Success, column exists. We got:", data);
  }
}
check();
