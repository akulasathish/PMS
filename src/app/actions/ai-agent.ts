"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { processQuickLedger } from "@/app/actions/quick-ledger";
import { getFolioSummary } from "@/app/actions/folio";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AiAgentMessage {
  role: "user" | "model";
  text: string;
}

export interface AiAgentResult {
  success: boolean;
  reply: string;
  actionsTaken: string[];
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_PROPERTY_ID = "64f41226-e209-42fe-b01c-35d16d169818";
const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3-flash-preview";

async function getEffectivePropertyId(admin: any, requestedId?: string): Promise<string> {
  if (requestedId) {
    const { count } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("property_id", requestedId)
      .eq("is_deleted", false);
    if (count && count > 0) return requestedId;
  }
  return DEFAULT_PROPERTY_ID;
}

/** Get live PG context for the system prompt */
async function getPgContext(propertyId = DEFAULT_PROPERTY_ID): Promise<string> {
  try {
    const admin = getSupabaseAdmin();
    const activeId = await getEffectivePropertyId(admin, propertyId);

    const [roomsRes, bookingsRes, settingsRes] = await Promise.all([
      admin
        .from("rooms")
        .select("id, room_number, type, sharing_capacity, status")
        .eq("property_id", activeId)
        .eq("is_deleted", false)
        .order("room_number"),
      admin
        .from("bookings")
        .select(
          "id, guest_name, room_id, status, monthly_rent, rent_due_day, check_in, notes"
        )
        .eq("property_id", activeId)
        .in("status", ["Checked In", "Confirmed", "in_house"]),
      admin
        .from("app_settings")
        .select("key, value")
        .in("key", ["business_date", "property_name"]),
    ]);

    const rooms = roomsRes.data || [];
    const bookings = bookingsRes.data || [];
    const settings: Record<string, string> = {};
    for (const s of settingsRes.data || []) settings[s.key] = s.value;

    const todayDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    const businessDate = settings["business_date"] || todayDate;
    const propertyName = settings["property_name"] || "Staysync Mens Premium PG";

    // Build room map
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    // Map room_id -> tenants
    const tenantsByRoom = new Map<string, typeof bookings>();
    for (const b of bookings) {
      if (!tenantsByRoom.has(b.room_id)) tenantsByRoom.set(b.room_id, []);
      tenantsByRoom.get(b.room_id)!.push(b);
    }

    // Pre-calculate exact occupancy summary statistics
    const totalCapacity = rooms.reduce(
      (sum, r) => sum + (Number((r as any).sharing_capacity) || 1),
      0
    );
    const totalOccupiedBeds = bookings.length;
    const totalVacantBeds = Math.max(0, totalCapacity - totalOccupiedBeds);

    const completelyEmptyRooms = rooms
      .filter((r) => (tenantsByRoom.get(r.id) || []).length === 0)
      .map((r) => r.room_number);

    const partiallyVacantRooms = rooms
      .filter((r) => {
        const occ = (tenantsByRoom.get(r.id) || []).length;
        const cap = Number((r as any).sharing_capacity) || 1;
        return occ > 0 && occ < cap;
      })
      .map((r) => {
        const occ = (tenantsByRoom.get(r.id) || []).length;
        const cap = Number((r as any).sharing_capacity) || 1;
        return `Room ${r.room_number} (${cap - occ} vacant bed${cap - occ > 1 ? "s" : ""})`;
      });

    const lines: string[] = [
      `Property Name: ${propertyName}`,
      `Current Business Date: ${businessDate}`,
      `=== LIVE OCCUPANCY METRICS ===`,
      `• Total Rooms: ${rooms.length}`,
      `• Total Bed Capacity: ${totalCapacity} beds`,
      `• Total Occupied Beds: ${totalOccupiedBeds} (${bookings.length} active tenants)`,
      `• Total Vacant Beds Available: ${totalVacantBeds} beds`,
      `• Completely Empty Rooms (${completelyEmptyRooms.length}): ${completelyEmptyRooms.length > 0 ? completelyEmptyRooms.join(", ") : "None"}`,
      `• Partially Vacant Rooms (${partiallyVacantRooms.length}): ${partiallyVacantRooms.length > 0 ? partiallyVacantRooms.join("; ") : "None"}`,
      ``,
      `=== ROOM-BY-ROOM DETAILS ===`,
    ];

    for (const room of rooms) {
      const occupants = tenantsByRoom.get(room.id) || [];
      const capacity = Number((room as any).sharing_capacity) || 1;
      const vacant = Math.max(0, capacity - occupants.length);
      const roomType = (room as any).type || "Standard";

      if (occupants.length === 0) {
        lines.push(
          `Room ${room.room_number} [${roomType}] — COMPLETELY VACANT (${capacity} beds free)`
        );
      } else {
        const tenantList = occupants
          .map(
            (o) =>
              `${o.guest_name} (Rent: ₹${(o.monthly_rent || 0).toLocaleString("en-IN")}/mo, Due: ${o.rent_due_day || 1}st, Joined: ${o.check_in || "N/A"})`
          )
          .join(", ");
        lines.push(
          `Room ${room.room_number} [${roomType}] — OCCUPIED (${occupants.length}/${capacity} beds filled): ${tenantList}${vacant > 0 ? ` | ${vacant} bed(s) vacant` : " | FULL"}`
        );
      }
    }

    return lines.join("\n");
  } catch (err: any) {
    return `[Could not load live PG context: ${err?.message || "unknown error"}]`;
  }
}

// ─── Tool Implementations ───────────────────────────────────────────────────

async function toolRecordPayment(args: {
  tenant_name: string;
  room_number: string;
  amount: number;
  payment_type?: string;
  month?: string;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number, amount, payment_type, month } = args;
  const typeStr = payment_type === "maintenance" ? "maintenance" : "room fee";
  const monthStr = month ? ` for ${month}` : "";
  const cmd = `${tenant_name} room ${room_number} paid ${amount} ${typeStr}${monthStr}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Recorded ₹${amount.toLocaleString("en-IN")} payment for ${tenant_name} (Room ${room_number}). ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolRecordAdvance(args: {
  tenant_name: string;
  room_number: string | number;
  rent: number;
  join_date: string;
  advance_amount: number;
  maintenance?: number;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number, rent, join_date, advance_amount, maintenance } = args;
  const maintStr = maintenance ? ` maintenance ${maintenance}` : "";
  const cmd = `assign ${tenant_name} to room ${room_number} joining on ${join_date} rent ${rent} adv ${advance_amount}${maintStr}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Registered ${tenant_name} for Room ${room_number} joining ${join_date} with ₹${advance_amount.toLocaleString("en-IN")} advance. ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolAssignTenant(args: {
  tenant_name: string;
  room_number: string | number;
  rent: number;
  join_date?: string;
  advance?: number;
  maintenance?: number;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number, rent, join_date, advance, maintenance } = args;
  const advStr = advance ? ` adv ${advance}` : "";
  const maintStr = maintenance ? ` maintenance ${maintenance}` : "";
  const joinStr = join_date ? ` joining on ${join_date}` : "";
  const cmd = `assign ${tenant_name} to room ${room_number}${joinStr} rent ${rent}${advStr}${maintStr}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Assigned ${tenant_name} to Room ${room_number} at ₹${rent.toLocaleString("en-IN")}/mo. ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolGetPendingDues(_args: Record<string, unknown>, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const res = await processQuickLedger("all pending dues", propId);
  return res.message;
}

async function toolGetRoomStatus(_args: Record<string, unknown>, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  return await getPgContext(propId);
}

async function toolGetTenantStatement(args: {
  tenant_name: string;
  room_number?: string;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number } = args;
  const cmd = room_number
    ? `statement ${tenant_name} room ${room_number}`
    : `statement ${tenant_name}`;
  const res = await processQuickLedger(cmd, propId);
  return res.message;
}

async function toolChangeTenantRent(args: {
  tenant_name?: string;
  room_number: string | number;
  new_rent: number;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number, new_rent } = args;
  const nameStr = tenant_name ? `${tenant_name} ` : "";
  const cmd = `change room fee of ${nameStr}room ${room_number} to ${new_rent}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Updated room fee for Room ${room_number} to ₹${new_rent.toLocaleString("en-IN")}/mo. ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolCheckoutTenant(args: {
  tenant_name: string;
  room_number: string | number;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { tenant_name, room_number } = args;
  const cmd = `checkout ${tenant_name} room ${room_number}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Checked out ${tenant_name} from Room ${room_number}. ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolRecordExpense(args: {
  description: string;
  amount: number;
  category?: string;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const { description, amount, category } = args;
  const catStr = category ? ` ${category}` : "";
  const cmd = `expense ${description}${catStr} ${amount}`;
  const res = await processQuickLedger(cmd, propId);
  return res.success
    ? `✅ Recorded expense: ${description} — ₹${amount.toLocaleString("en-IN")}. ${res.message}`
    : `❌ Failed: ${res.message}`;
}

async function toolSearchTenant(args: {
  tenant_name: string;
}, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const admin = getSupabaseAdmin();
  const search = (args.tenant_name || "").trim().toLowerCase();
  if (!search) return "Please specify a tenant name to search.";

  const activeId = await getEffectivePropertyId(admin, propId);
  const [bookingsRes, roomsRes] = await Promise.all([
    admin
      .from("bookings")
      .select("id, guest_name, room_id, status, monthly_rent, rent_due_day, check_in, notes")
      .eq("property_id", activeId)
      .in("status", ["Checked In", "Confirmed", "in_house"]),
    admin
      .from("rooms")
      .select("id, room_number")
      .eq("property_id", activeId),
  ]);

  const roomMap = new Map((roomsRes.data || []).map((r) => [r.id, r.room_number]));
  const matches = (bookingsRes.data || []).filter((b) =>
    b.guest_name && b.guest_name.toLowerCase().includes(search)
  );

  if (matches.length === 0) {
    return `No active tenant found matching "${args.tenant_name}".`;
  }

  const results = matches.map((m) => {
    const rNum = roomMap.get(m.room_id) || "Unknown";
    return `• ${m.guest_name} — Room ${rNum} (Rent: ₹${(m.monthly_rent || 0).toLocaleString("en-IN")}/mo, Due day: ${m.rent_due_day || 1}st, Joined: ${m.check_in || "N/A"})`;
  });

  return `Found ${matches.length} tenant(s):\n${results.join("\n")}`;
}

async function toolGetTodaySummary(_args: Record<string, unknown>, propId = DEFAULT_PROPERTY_ID): Promise<string> {
  const admin = getSupabaseAdmin();
  const activeId = await getEffectivePropertyId(admin, propId);
  const res = await processQuickLedger("today summary", activeId);
  return res.message;
}

// ─── Tool Definitions for Gemini ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOLS: any[] = [
  {
    name: "record_payment",
    description:
      "Record a rent or maintenance payment made by an existing tenant. Use when the owner says a tenant paid money.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Tenant's name (e.g. Sipai, Kalyan, Rahul)",
        },
        room_number: {
          type: Type.STRING,
          description: "Room number (e.g. 306, 201, 604)",
        },
        amount: {
          type: Type.NUMBER,
          description: "Amount paid in Indian Rupees",
        },
        payment_type: {
          type: Type.STRING,
          description: "Type of payment: 'rent' or 'maintenance'. Default: rent",
        },
        month: {
          type: Type.STRING,
          description:
            "Optional: month the payment is for (e.g. 'October 2026', 'November')",
        },
      },
      required: ["tenant_name", "room_number", "amount"],
    },
  },
  {
    name: "record_advance",
    description:
      "Register a new tenant who has paid an advance and will join in a few days. Records their advance payment and reserves the room.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Future tenant's name",
        },
        room_number: {
          type: Type.STRING,
          description: "Room number they will join",
        },
        rent: {
          type: Type.NUMBER,
          description: "Monthly rent amount in INR",
        },
        join_date: {
          type: Type.STRING,
          description: "Date they will join (e.g. '5th November', '2026-11-05', 'November 10')",
        },
        advance_amount: {
          type: Type.NUMBER,
          description: "Advance/token amount paid today",
        },
        maintenance: {
          type: Type.NUMBER,
          description: "Optional monthly maintenance fee",
        },
      },
      required: ["tenant_name", "room_number", "rent", "join_date", "advance_amount"],
    },
  },
  {
    name: "assign_tenant",
    description:
      "Assign/check-in a new tenant to a room who is joining today or immediately. If joining date is today or already passed, use this. If joining in future days with advance, use record_advance instead.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: { type: Type.STRING, description: "Tenant's full name" },
        room_number: {
          type: Type.STRING,
          description: "Room number to assign",
        },
        rent: {
          type: Type.NUMBER,
          description: "Monthly rent in INR",
        },
        join_date: {
          type: Type.STRING,
          description: "Joining date (optional, defaults to today)",
        },
        advance: {
          type: Type.NUMBER,
          description: "Advance payment amount if any",
        },
        maintenance: {
          type: Type.NUMBER,
          description: "Monthly maintenance fee if any",
        },
      },
      required: ["tenant_name", "room_number", "rent"],
    },
  },
  {
    name: "get_pending_dues",
    description:
      "Get list of all tenants who have pending/overdue rent. Use when owner asks 'who hasn't paid', 'pending dues', 'defaulters', etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_room_status",
    description:
      "Get current status of all rooms — who is staying, which rooms are vacant, capacity info. Use when owner asks about room occupancy, vacant rooms, who is in which room, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_tenant_statement",
    description:
      "Get detailed payment history and dues summary for a specific tenant. Use when owner asks about statement, dues, or history of one person.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Tenant's name to get statement for",
        },
        room_number: {
          type: Type.STRING,
          description: "Room number (optional but helps narrow down)",
        },
      },
      required: ["tenant_name"],
    },
  },
  {
    name: "change_tenant_rent",
    description:
      "Change the monthly rent/room fee for a tenant or room. Use when owner says 'change rent', 'update fee', 'room fee to X', etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Tenant's name (optional)",
        },
        room_number: {
          type: Type.STRING,
          description: "Room number whose fee to change",
        },
        new_rent: {
          type: Type.NUMBER,
          description: "New monthly rent amount in INR",
        },
      },
      required: ["room_number", "new_rent"],
    },
  },
  {
    name: "checkout_tenant",
    description:
      "Check out / vacate a tenant from their room. Use when owner says a tenant is leaving or to checkout someone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Tenant's name",
        },
        room_number: {
          type: Type.STRING,
          description: "Room number they are vacating",
        },
      },
      required: ["tenant_name", "room_number"],
    },
  },
  {
    name: "record_expense",
    description:
      "Record a PG expense (electricity, water, repairs, cleaning etc). Use when owner logs a cost/expense.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: {
          type: Type.STRING,
          description: "Description of the expense",
        },
        amount: {
          type: Type.NUMBER,
          description: "Expense amount in INR",
        },
        category: {
          type: Type.STRING,
          description:
            "Expense category (e.g. Electricity, Water, Repairs, Cleaning, Grocery)",
        },
      },
      required: ["description", "amount"],
    },
  },
  {
    name: "search_tenant",
    description:
      "Find a tenant by name across all rooms to get their room number, monthly rent, rent due day, and joining date. Use when owner asks where someone is staying, who someone is, or mentions a tenant without their room.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tenant_name: {
          type: Type.STRING,
          description: "Tenant's name (partial or full)",
        },
      },
      required: ["tenant_name"],
    },
  },
  {
    name: "get_today_summary",
    description:
      "Get today's total revenue collected, expenses spent, and net profit. Use when owner asks 'today collection', 'today summary', 'today history', or how much was made/spent today.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
];

// ─── Main Agent Function ─────────────────────────────────────────────────────

let cachedDbApiKey: string | null = null;

async function resolveApiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (cachedDbApiKey) {
    return cachedDbApiKey;
  }
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();
    if (data?.value) {
      cachedDbApiKey = data.value;
      return cachedDbApiKey;
    }
  } catch (err) {
    console.warn("[AI Agent] Could not retrieve gemini_api_key from DB:", err);
  }
  return null;
}

export async function askAiAgent(
  userMessage: string,
  history: AiAgentMessage[],
  propertyId?: string
): Promise<AiAgentResult> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return {
      success: false,
      reply: "⚠️ Gemini API key not configured. Please ensure GEMINI_API_KEY is set in your environment variables or in app_settings.",
      actionsTaken: [],
      error: "Missing GEMINI_API_KEY",
    };
  }

  const admin = getSupabaseAdmin();
  const activePropId = await getEffectivePropertyId(admin, propertyId);
  const actionsTaken: string[] = [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const pgContext = await getPgContext(activePropId);

    const systemPrompt = `You are a smart AI assistant for a PG (Paying Guest) accommodation called "Staysync Mens Premium PG" in India.
Your job is to help the PG owner manage their property with 100% data accuracy by understanding natural language and taking database actions.

=== LIVE PG DATA (refreshed every call) ===
${pgContext}
===========================================

STRICT ACCURACY RULES:
1. TRUTH IN METRICS: For total rooms, total bed capacity, occupied beds, vacant beds, and empty rooms, use the exact numbers from the "=== LIVE OCCUPANCY METRICS ===" section above. Never guess or contradict these pre-computed numbers.
2. FINANCIAL ACCURACY: The room list above shows base rent rates, NOT payment status. When asked if a tenant has paid, how much someone owes, pending dues, or payment history, ALWAYS call 'get_tenant_statement' or 'get_pending_dues'. NEVER guess payment status.
3. TODAY'S NUMBERS: When asked about today's collection, revenue, expenses, or income (e.g. "today summary", "today collection", "ee roju collection"), ALWAYS call 'get_today_summary'.
4. TENANT SEARCH: If the owner mentions a person's name without room number (e.g. "where is Kalyan staying?", "who is Rahul?"), check the occupant lists above or call 'search_tenant'.
5. ACTIONS (PAYMENTS & ASSIGNMENTS):
   - When owner says someone paid money, call 'record_payment'.
   - When owner registers someone joining in future days with an advance, call 'record_advance'.
   - When assigning a new tenant immediately, call 'assign_tenant'.
   - When owner asks to change rent/room fee, call 'change_tenant_rent'.
   - When owner asks to vacate/checkout, call 'checkout_tenant'.
   - When owner logs an expense, call 'record_expense'.
6. MULTILINGUAL & SLANG: The owner speaks English, Telugu, Hindi, or Hinglish (e.g. "kalyan rent pay chesada?", "kali rooms enni unnay?", "306 lo evaru unnaru?"). Understand their intent and respond clearly and politely.
7. MONEY FORMAT: Always format amounts in Indian Rupee format with commas (e.g. ₹8,000, ₹1,42,700).
8. CONCISE & ACTION-ORIENTED: Keep replies direct, friendly, and structured. PG owners are busy running operations.
Current Date: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}`;

    // Build conversation history for Gemini
    const contents: any[] = [];

    // Add prior history (last 10 turns to keep context manageable)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    // Agentic loop: keep calling Gemini until it stops requesting tool calls
    let loopContents = [...contents];
    let finalReply = "";
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      let response;
      try {
        response = await ai.models.generateContent({
          model: PRIMARY_MODEL,
          contents: loopContents,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations: TOOLS }],
            temperature: 0.3,
          },
        });
      } catch (primaryErr: any) {
        console.warn(`[AI Agent] ${PRIMARY_MODEL} error (${primaryErr?.message}), falling back to ${FALLBACK_MODEL}...`);
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: loopContents,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations: TOOLS }],
            temperature: 0.3,
          },
        });
      }

      const candidate = response.candidates?.[0];
      if (!candidate) {
        finalReply = "Sorry, I didn't get a response. Please try again.";
        break;
      }

      const parts = candidate.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall);
      const textParts = parts.filter((p: any) => p.text);

      if (functionCalls.length === 0) {
        // No more tool calls — this is the final text response
        finalReply = textParts.map((p: any) => p.text).join("").trim();
        break;
      }

      // Execute all tool calls in parallel
      const toolResults: any[] = await Promise.all(
        functionCalls.map(async (part: any) => {
          const fc = part.functionCall;
          const args = fc.args || {};
          let result = "";

          try {
            switch (fc.name) {
              case "record_payment":
                result = await toolRecordPayment(args as any, activePropId);
                break;
              case "record_advance":
                result = await toolRecordAdvance(args as any, activePropId);
                break;
              case "assign_tenant":
                result = await toolAssignTenant(args as any, activePropId);
                break;
              case "get_pending_dues":
                result = await toolGetPendingDues(args, activePropId);
                break;
              case "get_room_status":
                result = await toolGetRoomStatus(args, activePropId);
                break;
              case "get_tenant_statement":
                result = await toolGetTenantStatement(args as any, activePropId);
                break;
              case "change_tenant_rent":
                result = await toolChangeTenantRent(args as any, activePropId);
                break;
              case "checkout_tenant":
                result = await toolCheckoutTenant(args as any, activePropId);
                break;
              case "record_expense":
                result = await toolRecordExpense(args as any, activePropId);
                break;
              case "search_tenant":
                result = await toolSearchTenant(args as any, activePropId);
                break;
              case "get_today_summary":
                result = await toolGetTodaySummary(args as any, activePropId);
                break;
              default:
                result = `Unknown tool: ${fc.name}`;
            }
          } catch (err: any) {
            result = `Tool error: ${err?.message || "unknown"}`;
          }

          if (result.startsWith("✅")) {
            actionsTaken.push(result.replace(/^✅\s*/, "").split(".")[0]);
          }

          return {
            functionResponse: {
              name: fc.name,
              response: { result },
              ...(fc.id ? { id: fc.id } : {}),
            },
          };
        })
      );

      // Append model response + tool results to conversation
      loopContents = [
        ...loopContents,
        { role: "model", parts },
        { role: "user", parts: toolResults },
      ];
    }

    if (!finalReply && actionsTaken.length > 0) {
      finalReply = actionsTaken.join("\n");
    } else if (!finalReply) {
      finalReply = "Done! Let me know if you need anything else.";
    }

    return {
      success: true,
      reply: finalReply,
      actionsTaken,
    };
  } catch (err: any) {
    console.error("[AI Agent] Error:", err);
    return {
      success: false,
      reply: `⚠️ AI error: ${err?.message || "Something went wrong. Please try again."}`,
      actionsTaken,
      error: err?.message,
    };
  }
}
