-- Migration: Surgical IAM Action Registry
-- Expands the permission schema to 25+ granular action keys with [Write, Read, Deny] levels

-- 1. Update the default JSON for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN permissions SET DEFAULT '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "deny",
        "perform_check_in": "deny",
        "perform_check_out": "deny",
        "modify_booking": "deny",
        "upgrade_room": "deny",
        "refund_folio": "deny",
        "guest_notes": "read",
        "block_rooms": "deny",
        "view_guest_pii": "deny"
    },
    "housekeeping": {
        "view_cleaning_list": "read",
        "start_finish_cleaning": "deny",
        "mark_room_ready": "deny",
        "inspect_room": "deny",
        "post_minibar_charges": "deny",
        "manage_cleaning_boards": "deny"
    },
    "inventory": {
        "view_inventory": "read",
        "manage_room_types": "deny",
        "add_delete_rooms": "deny",
        "maintenance_log": "deny"
    },
    "finance": {
        "view_analytics": "deny",
        "run_night_audit": "deny",
        "manage_rates": "deny",
        "view_audit_logs": "deny"
    },
    "management": {
        "manage_staff_accounts": "deny",
        "property_settings": "deny"
    }
}'::jsonb;

-- 2. Update System Templates to the new 25-key structure
DELETE FROM public.role_templates WHERE property_id IS NULL;

INSERT INTO public.role_templates (name, permissions) VALUES 
('Guest Journey (FO)', '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "write",
        "perform_check_in": "write",
        "perform_check_out": "write",
        "modify_booking": "write",
        "upgrade_room": "read",
        "refund_folio": "deny",
        "guest_notes": "write",
        "block_rooms": "deny",
        "view_guest_pii": "read"
    },
    "housekeeping": {
        "view_cleaning_list": "read",
        "start_finish_cleaning": "deny",
        "mark_room_ready": "deny",
        "inspect_room": "deny",
        "post_minibar_charges": "read",
        "manage_cleaning_boards": "deny"
    },
    "inventory": { "view_inventory": "read", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": { "view_analytics": "deny", "run_night_audit": "deny", "manage_rates": "deny", "view_audit_logs": "deny" },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb),

('Room Attendant (HK)', '{
    "front_office": {
        "view_tape_chart": "deny",
        "create_booking": "deny",
        "perform_check_in": "deny",
        "perform_check_out": "deny",
        "modify_booking": "deny",
        "upgrade_room": "deny",
        "refund_folio": "deny",
        "guest_notes": "deny",
        "block_rooms": "deny",
        "view_guest_pii": "deny"
    },
    "housekeeping": {
        "view_cleaning_list": "write",
        "start_finish_cleaning": "write",
        "mark_room_ready": "write",
        "inspect_room": "deny",
        "post_minibar_charges": "write",
        "manage_cleaning_boards": "deny"
    },
    "inventory": { "view_inventory": "deny", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": { "view_analytics": "deny", "run_night_audit": "deny", "manage_rates": "deny", "view_audit_logs": "deny" },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb),

('Night Auditor', '{
    "front_office": {
        "view_tape_chart": "read",
        "create_booking": "write",
        "perform_check_in": "write",
        "perform_check_out": "write",
        "modify_booking": "write",
        "upgrade_room": "read",
        "refund_folio": "write",
        "guest_notes": "write",
        "block_rooms": "deny",
        "view_guest_pii": "read"
    },
    "housekeeping": { "view_cleaning_list": "deny", "start_finish_cleaning": "deny", "mark_room_ready": "deny", "inspect_room": "deny", "post_minibar_charges": "deny", "manage_cleaning_boards": "deny" },
    "inventory": { "view_inventory": "deny", "manage_room_types": "deny", "add_delete_rooms": "deny", "maintenance_log": "deny" },
    "finance": {
        "view_analytics": "write",
        "run_night_audit": "write",
        "manage_rates": "read",
        "view_audit_logs": "write"
    },
    "management": { "manage_staff_accounts": "deny", "property_settings": "deny" }
}'::jsonb);
