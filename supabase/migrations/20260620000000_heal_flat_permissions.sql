-- Migration: Heal flat permissions for existing owner/admin profiles
-- Converts any legacy flat JSON permissions to the modern nested action-level permissions format.

UPDATE public.profiles
SET permissions = '{
    "front_office": {
        "tape_chart": "full",
        "check_in_out": "full",
        "room_upgrades": "full",
        "refund_folios": "full",
        "guest_notes": "full",
        "block_rooms": "full"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "full",
        "minibar_posting": "full",
        "ops_management": "full"
    },
    "finance": {
        "night_audit": "full",
        "reports": "full"
    },
    "inventory": {
        "manage_rooms": "full"
    },
    "staff_management": {
        "manage_staff": "full"
    }
}'::jsonb
WHERE role IN ('admin', 'owner')
  AND (
    permissions IS NULL 
    OR jsonb_typeof(permissions -> 'front_office') = 'string'
  );
