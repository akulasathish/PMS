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

/** Get live PG context for the system prompt */
async function getPgContext(propertyId = DEFAULT_PROPERTY_ID): Promise<string> {
  try {
    const admin = getSupabaseAdmin();

    const [roomsRes, bookingsRes, settingsRes] = await Promise.all([
      admin
        .from("rooms")
        .select("id, room_number, room_type, capacity, base_rate, status")
        .eq("property_id", propertyId)
        .order("room_number"),
      admin
        .from("bookings")
        .select(
          "id, guest_name, room_id, status, monthly_rent, rent_due_day, check_in, notes"
        )
        .eq("property_id", propertyId)
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

    const lines: string[] = [
      `Property: ${propertyName}`,
      `Today's Business Date: ${businessDate}`,
      `Total rooms: ${rooms.length}`,
      `Active tenants: ${bookings.length}`,
      ``,
      `=== ROOM STATUS ===`,
    ];

    for (const room of rooms) {
      const occupants = tenantsByRoom.get(room.id) || [];
      const vacant =
        (Number(room.capacity) || 1) - occupants.length;
      if (occupants.length === 0) {
        lines.push(
          `Room ${room.room_number} [${room.room_type || "Standard"}] — VACANT (capacity: ${room.capacity || 1}, base rate: ₹${room.base_rate || 0}/mo)`
        );
      } else {
        const tenantList = occupants
          .map(
            (o) =>
              `${o.guest_name} (rent: ₹${o.monthly_rent || 0}/mo, due: ${o.rent_due_day || 1}st, joined: ${o.check_in || "?"})`
          )
          .join(", ");
        lines.push(
          `Room ${room.room_number} [${room.room_type || "Standard"}] — OCCUPIED by ${tenantList}${vacant > 0 ? ` | ${vacant} bed(s) vacant` : ""}`
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

  const activePropId = propertyId || DEFAULT_PROPERTY_ID;
  const actionsTaken: string[] = [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const pgContext = await getPgContext(activePropId);

    const systemPrompt = `You are a smart AI assistant for a PG (Paying Guest) accommodation called "Staysync Mens Premium PG" in India.
Your job is to help the PG owner manage their property by understanding natural language and performing actions.

=== LIVE PG DATA (refreshed every call) ===
${pgContext}
===========================================

IMPORTANT RULES:
1. Always respond in the same language the owner uses (English, Telugu, Hindi mix is fine).
2. For all money amounts, use Indian Rupee (₹) format with commas (e.g. ₹8,000).
3. When you take an action, briefly confirm what you did.
4. If unsure which tenant/room the owner means, ASK before acting — don't guess.
5. For advance payments from future tenants (joining in 5+ days), use record_advance tool.
6. For tenants joining today or already checked in, use assign_tenant or record_payment.
7. Keep replies SHORT and friendly — the owner is busy running a PG.
8. Current date: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}`;

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
