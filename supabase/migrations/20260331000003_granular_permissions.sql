-- Migration: Granular Action-Level Permissions
-- Upgrades the permissions schema from module-level strings to nested action-level objects

-- 1. Update the default value for new profiles to use the nested structure
ALTER TABLE public.profiles 
ALTER COLUMN permissions SET DEFAULT '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "read",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "read",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "read",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb;

-- 2. Update existing Admin & Owner profiles to have FULL nested access
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
WHERE role IN ('admin', 'owner');

-- 3. Wipe old simple templates and insert the advanced nested templates
DELETE FROM public.role_templates WHERE property_id IS NULL;

INSERT INTO public.role_templates (name, permissions) VALUES 
('Guest Journey', '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "full",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "none",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Night Auditor', '{
    "front_office": {
        "tape_chart": "read",
        "check_in_out": "full",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "none",
        "room_inspection": "none",
        "minibar_posting": "none",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "full",
        "reports": "full"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Room Attendant', '{
    "front_office": {
        "tape_chart": "none",
        "check_in_out": "none",
        "room_upgrades": "none",
        "refund_folios": "none",
        "guest_notes": "none",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "none",
        "minibar_posting": "full",
        "ops_management": "none"
    },
    "finance": {
        "night_audit": "none",
        "reports": "none"
    },
    "inventory": {
        "manage_rooms": "none"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb),

('Supervisor', '{
    "front_office": {
        "tape_chart": "full",
        "check_in_out": "full",
        "room_upgrades": "full",
        "refund_folios": "none",
        "guest_notes": "full",
        "block_rooms": "none"
    },
    "housekeeping": {
        "task_list": "full",
        "room_inspection": "full",
        "minibar_posting": "full",
        "ops_management": "full"
    },
    "finance": {
        "night_audit": "none",
        "reports": "read"
    },
    "inventory": {
        "manage_rooms": "read"
    },
    "staff_management": {
        "manage_staff": "none"
    }
}'::jsonb);
