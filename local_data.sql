SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict xS1Rq1rGMV5TDlcXe6g4BKqft9IVUDjLHmVlUF9lu2YbUd9JGY3WNYHgRbeDx25

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '1a98149b-0031-4ef9-b0b5-7090abac5de8', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"kundhana@gmail.com","user_id":"cdfe60e4-cfd1-4aac-b004-c18e897c9054","user_phone":""}}', '2026-06-21 08:12:48.687512+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b8af42de-2895-4c7d-9090-d21e3045d3c8', '{"action":"login","actor_id":"cdfe60e4-cfd1-4aac-b004-c18e897c9054","actor_username":"kundhana@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-06-21 08:12:49.562229+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cc531b41-d3b7-4e29-87cf-445cce950d6c', '{"action":"token_refreshed","actor_id":"cdfe60e4-cfd1-4aac-b004-c18e897c9054","actor_username":"kundhana@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-06-21 09:11:16.470375+00', ''),
	('00000000-0000-0000-0000-000000000000', '822641c7-4017-46d5-9bfb-825187f86d64', '{"action":"token_revoked","actor_id":"cdfe60e4-cfd1-4aac-b004-c18e897c9054","actor_username":"kundhana@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-06-21 09:11:16.471169+00', '');


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'authenticated', 'authenticated', 'kundhana@gmail.com', '$2a$10$aJO3eP5RHfqppFb4fCe45ewiMFWi5BhxOA5.E5cjCmDdfcB2dXJNG', '2026-06-21 08:12:48.688754+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-21 08:12:49.563669+00', '{"provider": "email", "providers": ["email"]}', '{"role": "user", "email_verified": true}', NULL, '2026-06-21 08:12:48.683792+00', '2026-06-21 09:11:16.477522+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', '{"sub": "cdfe60e4-cfd1-4aac-b004-c18e897c9054", "email": "kundhana@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-21 08:12:48.685886+00', '2026-06-21 08:12:48.685944+00', '2026-06-21 08:12:48.685944+00', '59caa4e4-0e16-482f-8e67-3ce05e771475');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('81c0ce9b-3da5-4fe7-b01b-4b7fb5d5581b', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', '2026-06-21 08:12:49.563782+00', '2026-06-21 09:11:16.479182+00', NULL, 'aal1', NULL, '2026-06-21 09:11:16.47909', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('81c0ce9b-3da5-4fe7-b01b-4b7fb5d5581b', '2026-06-21 08:12:49.567895+00', '2026-06-21 08:12:49.567895+00', 'password', '4384a25f-f847-4491-bdb9-ec35321cb3e3');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 't7xffd6zem47', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', true, '2026-06-21 08:12:49.565897+00', '2026-06-21 09:11:16.471587+00', NULL, '81c0ce9b-3da5-4fe7-b01b-4b7fb5d5581b'),
	('00000000-0000-0000-0000-000000000000', 2, 'klwwmveab6s5', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', false, '2026-06-21 09:11:16.476269+00', '2026-06-21 09:11:16.476269+00', 't7xffd6zem47', '81c0ce9b-3da5-4fe7-b01b-4b7fb5d5581b');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_settings" ("key", "value", "description", "updated_at") VALUES
	('business_date', '2026-06-21', 'The active operational business date of the property management system', '2026-06-21 08:07:11.130205+00'),
	('n8n_webhook_url', 'http://n8n:5678/webhook/booking-notification', 'The URL for n8n to process booking welcome emails', '2026-06-21 08:07:10.672744+00');


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."properties" ("id", "name", "created_at", "status", "wifi_network", "wifi_password", "address", "phone", "gst_number", "state_code", "owner_user_id", "city", "country", "standard_checkin_time", "standard_checkout_time", "early_checkin_rules", "late_checkout_rules") VALUES
	('f160f631-d774-43de-b84a-e0a1b56fe16c', 'kk kundhana grand', '2026-06-21 08:13:16.180507+00', 'Active', 'Guest_WiFi', 'welcome123', '100 feet road madhapur', NULL, NULL, NULL, 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'HYD', 'India', '14:00:00', '11:00:00', '[]', '[]');


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."audit_logs" ("id", "created_at", "property_id", "user_id", "action", "details", "severity") VALUES
	('efeafac8-c9c3-4ccb-ab81-2aacf1b00b2d', '2026-06-21 08:13:26.191133+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "404"}', 'info'),
	('41a080e5-0451-4b09-bd3d-1ceab8b9dde0', '2026-06-21 08:13:39.196381+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'BOOKING_CREATED', '{"amount": 1500, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "guestName": "Bhupati"}', 'info'),
	('b9bce9d9-2840-4362-a8cf-ddf78f7cf775', '2026-06-21 08:25:37.079952+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'GUEST_CHECK_IN', '{"bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "guestName": "Bhupati", "paymentRecorded": false}', 'info'),
	('db5516f9-c80e-4838-b1ac-7eb00da2ba29', '2026-06-21 08:26:37.201796+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'PAYMENT_RECEIVED', '{"amount": 1000, "method": "Cash", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "paymentId": "6d0f94e8-0172-4e85-808e-9525607ab4a0", "transactionId": "3555252"}', 'info'),
	('224cd9ab-127b-40c0-bed1-d412586e9a2e', '2026-06-21 08:26:53.222887+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'PAYMENT_RECEIVED', '{"amount": 500, "method": "UPI", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "paymentId": "e8a677e0-df62-4b13-9f98-6ec2cd356984", "transactionId": "3555252"}', 'info'),
	('739b6f10-891d-457d-abb7-75126e482da5', '2026-06-21 08:32:45.651639+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "108"}', 'info'),
	('72549e58-0cf0-442a-8708-0b27032c690c', '2026-06-21 08:34:05.355953+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'BOOKING_CREATED', '{"amount": 1300, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "acc85f60-2a55-4f2f-a7ba-40bfb8691e67", "guestName": "Mallikarjun"}', 'info'),
	('38660c5a-38d6-4ffe-948c-cf1c3c123a01', '2026-06-21 08:34:33.917688+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'GUEST_CHECK_IN', '{"bookingId": "acc85f60-2a55-4f2f-a7ba-40bfb8691e67", "guestName": "Mallikarjun", "paymentAmount": 1300, "paymentMethod": "Cash", "paymentRecorded": true}', 'info'),
	('f1f87a80-141f-40b8-b0d7-7103fcaa6ca3', '2026-06-21 08:35:43.126822+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "402"}', 'info'),
	('c0b96618-db83-4d03-9a65-aa24f668809a', '2026-06-21 08:38:05.643445+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'BOOKING_CREATED', '{"amount": 2000, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "03448dc7-7825-4763-bf65-cd77fca4712c", "guestName": "P nagalathi"}', 'info'),
	('b6e41b20-1f71-423e-a2bf-3e10dc0008ec', '2026-06-21 08:38:34.351444+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'GUEST_CHECK_IN', '{"bookingId": "03448dc7-7825-4763-bf65-cd77fca4712c", "guestName": "P nagalathi", "paymentAmount": 2000, "paymentMethod": "Cash", "paymentRecorded": true}', 'info'),
	('1a80e1fa-bfe2-429c-874a-b2f59cd0d990', '2026-06-21 08:39:12.003281+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "405"}', 'info'),
	('87dee862-06cb-4cf6-9bcb-496b4c57eed0', '2026-06-21 08:42:39.603339+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'BOOKING_CREATED', '{"amount": 1700, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "0492540f-3215-4db6-93c5-6fc5c3df4d38", "guestName": "Vijay mohan"}', 'info'),
	('fdbbc3e7-65b9-46fc-aead-4f76c238fac4', '2026-06-21 08:43:16.33161+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'GUEST_CHECK_IN', '{"bookingId": "0492540f-3215-4db6-93c5-6fc5c3df4d38", "guestName": "Vijay mohan", "paymentAmount": 1700, "paymentMethod": "UPI", "paymentRecorded": true}', 'info'),
	('ca22e464-bf80-4f50-96cc-1aa2078fb62a', '2026-06-21 09:08:20.502723+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "408"}', 'info'),
	('dff11a22-1758-4952-a1cd-26cb9ad5c571', '2026-06-21 09:08:41.028877+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "502"}', 'info'),
	('7cb51537-f98e-425a-96a3-c557a2ff4ce2', '2026-06-21 09:09:07.225502+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "507"}', 'info'),
	('623d7dd3-9eb1-4488-8c70-0cf06fdbd8a2', '2026-06-21 09:09:39.538585+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "303"}', 'info'),
	('35ac3bdf-26ff-4bb8-9c0b-38ab3c9ab8cd', '2026-06-21 09:09:44.129555+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "505"}', 'info'),
	('16db136d-b2eb-45f9-918e-97c949db9162', '2026-06-21 09:10:44.351415+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'BOOKING_CREATED', '{"amount": 1500, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "bf47c233-06ae-4bfb-8471-e14aeed70bd4", "guestName": "Rajkumar"}', 'info'),
	('9fff65b3-187e-48d2-b9a2-95ba0fcc4df6', '2026-06-21 09:11:43.262274+00', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'GUEST_CHECK_IN', '{"bookingId": "bf47c233-06ae-4bfb-8471-e14aeed70bd4", "guestName": "Rajkumar", "paymentAmount": 1500, "paymentMethod": "UPI", "paymentRecorded": true}', 'info');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "role", "property_id", "created_at", "email", "permissions") VALUES
	('cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'Property User', NULL, 'f160f631-d774-43de-b84a-e0a1b56fe16c', '2026-06-21 08:12:49.074507+00', 'kundhana@gmail.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}');


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rooms" ("id", "property_id", "room_number", "type", "status", "created_at", "is_deleted", "assigned_staff_id", "cleaning_started_at", "last_cleaned_at") VALUES
	('9ab8de17-8810-42d0-ac4d-b15ead6fb84e', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '404', 'Standard', 'Occupied', '2026-06-21 08:13:26.083049+00', false, NULL, NULL, NULL),
	('a3865c3d-2eae-4d98-9946-1bbc4dca6f1e', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '108', 'Standard', 'Occupied', '2026-06-21 08:32:45.574602+00', false, NULL, NULL, NULL),
	('0812de98-30e5-49bd-a5d6-3562b39e4566', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '402', 'Standard', 'Occupied', '2026-06-21 08:35:42.994622+00', false, NULL, NULL, NULL),
	('244199a2-e1e3-4852-94a5-f3e42b33f3e9', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '405', 'Standard', 'Occupied', '2026-06-21 08:39:11.856071+00', false, NULL, NULL, NULL),
	('2720a9b3-681b-4118-ba7d-c345d0f11035', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '502', 'Standard', 'Available', '2026-06-21 09:08:40.902979+00', false, NULL, NULL, NULL),
	('bca7ba6b-3611-40ff-8f43-ba9cf364a8d6', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '507', 'Standard', 'Available', '2026-06-21 09:09:07.063455+00', false, NULL, NULL, NULL),
	('e25749c0-05bb-45e0-b31d-d46a385dbf90', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '303', 'Standard', 'Available', '2026-06-21 09:09:39.419419+00', false, NULL, NULL, NULL),
	('1f8c6033-f752-4a85-9497-ce5f1b9a1eb7', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '505', 'Standard', 'Available', '2026-06-21 09:09:44.010473+00', false, NULL, NULL, NULL),
	('2b5a4549-5fe7-4dbf-985b-68efd8484798', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '408', 'Standard', 'Occupied', '2026-06-21 09:08:20.386199+00', false, NULL, NULL, NULL);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bookings" ("id", "property_id", "room_id", "guest_name", "check_in", "check_out", "amount", "status", "created_at", "guest_email", "notes", "original_room_id", "id_verified", "id_photo_url", "signature_url", "guest_phone", "check_in_time", "check_out_time") VALUES
	('45963290-c87e-4d0f-868e-cc3ec180f1c9', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '9ab8de17-8810-42d0-ac4d-b15ead6fb84e', 'Bhupati', '2026-06-21', '2026-06-22', 1500.00, 'Checked In', '2026-06-21 08:13:39.158956+00', NULL, 'split paymnet ', NULL, false, NULL, NULL, '9553301224', '2026-06-21 08:25:37.01+00', NULL),
	('acc85f60-2a55-4f2f-a7ba-40bfb8691e67', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 'a3865c3d-2eae-4d98-9946-1bbc4dca6f1e', 'Mallikarjun', '2026-06-21', '2026-06-22', 1300.00, 'Checked In', '2026-06-21 08:34:05.315815+00', NULL, 'NON AC ROOM ', NULL, false, NULL, NULL, '7386822734', '2026-06-21 08:34:33.866+00', NULL),
	('03448dc7-7825-4763-bf65-cd77fca4712c', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '0812de98-30e5-49bd-a5d6-3562b39e4566', 'P nagalathi', '2026-06-21', '2026-06-22', 2000.00, 'Checked In', '2026-06-21 08:38:05.573324+00', NULL, 'EARLY  CHECKIN ', NULL, false, NULL, NULL, '9346783186', '2026-06-21 08:38:34.311+00', NULL),
	('0492540f-3215-4db6-93c5-6fc5c3df4d38', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '244199a2-e1e3-4852-94a5-f3e42b33f3e9', 'Vijay mohan', '2026-06-21', '2026-06-22', 1700.00, 'Checked In', '2026-06-21 08:42:39.567897+00', NULL, NULL, NULL, false, NULL, NULL, '8686113435', '2026-06-21 08:43:16.291+00', NULL),
	('bf47c233-06ae-4bfb-8471-e14aeed70bd4', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '2b5a4549-5fe7-4dbf-985b-68efd8484798', 'Rajkumar', '2026-06-21', '2026-06-22', 1500.00, 'Checked In', '2026-06-21 09:10:44.290869+00', NULL, NULL, NULL, false, NULL, NULL, '8686113435', '2026-06-21 09:11:43.238+00', NULL);


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: incidental_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."payments" ("id", "booking_id", "property_id", "amount", "method", "transaction_id", "created_at", "created_by") VALUES
	('6d0f94e8-0172-4e85-808e-9525607ab4a0', '45963290-c87e-4d0f-868e-cc3ec180f1c9', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 1000.00, 'Cash', '3555252', '2026-06-21 08:26:37.148695+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054'),
	('e8a677e0-df62-4b13-9f98-6ec2cd356984', '45963290-c87e-4d0f-868e-cc3ec180f1c9', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 500.00, 'UPI', '3555252', '2026-06-21 08:26:53.190414+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054'),
	('6ce1b22e-0206-405c-8d66-d630894c1bc7', 'acc85f60-2a55-4f2f-a7ba-40bfb8691e67', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 1300.00, 'Cash', NULL, '2026-06-21 08:34:33.854585+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054'),
	('386b777a-30ca-4d62-a740-ebfa4be9c405', '03448dc7-7825-4763-bf65-cd77fca4712c', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 2000.00, 'Cash', NULL, '2026-06-21 08:38:34.263353+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054'),
	('ed170534-48be-406e-b997-605ec3c0520b', '0492540f-3215-4db6-93c5-6fc5c3df4d38', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 1700.00, 'UPI', NULL, '2026-06-21 08:43:16.252135+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054'),
	('c1ebd2c8-89aa-4caf-afb7-0b9418d9ab83', 'bf47c233-06ae-4bfb-8471-e14aeed70bd4', 'f160f631-d774-43de-b84a-e0a1b56fe16c', 1500.00, 'UPI', NULL, '2026-06-21 09:11:43.22622+00', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054');


--
-- Data for Name: property_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."property_access" ("id", "user_id", "property_id", "created_at") VALUES
	('4f096c6f-dcd5-4def-89d5-2c8e0b41e37d', 'cdfe60e4-cfd1-4aac-b004-c18e897c9054', 'f160f631-d774-43de-b84a-e0a1b56fe16c', '2026-06-21 08:13:16.209335+00');


--
-- Data for Name: role_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."role_templates" ("id", "property_id", "name", "permissions", "created_at") VALUES
	('b526392d-9b39-47b3-bfd5-aed48f135101', NULL, 'Guest Journey (FO)', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "write", "refund_folio": "deny", "upgrade_room": "read", "create_booking": "write", "modify_booking": "write", "view_guest_pii": "read", "view_tape_chart": "read", "perform_check_in": "write", "perform_check_out": "write"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "read", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}', '2026-06-21 08:07:10.793408+00'),
	('a77be659-042c-48cb-9566-75933b9f15b1', NULL, 'Room Attendant (HK)', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "deny", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "deny", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "deny", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "write", "view_cleaning_list": "write", "post_minibar_charges": "write", "start_finish_cleaning": "write", "manage_cleaning_boards": "deny"}}', '2026-06-21 08:07:10.793408+00'),
	('48edbfb7-126a-40f2-b209-1afdded7fb79', NULL, 'Night Auditor', '{"finance": {"manage_rates": "read", "view_analytics": "write", "run_night_audit": "write", "view_audit_logs": "write"}, "inventory": {"view_inventory": "deny", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "write", "refund_folio": "write", "upgrade_room": "read", "create_booking": "write", "modify_booking": "write", "view_guest_pii": "read", "view_tape_chart": "read", "perform_check_in": "write", "perform_check_out": "write"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "deny", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}', '2026-06-21 08:07:10.793408+00');


--
-- Data for Name: room_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('guest-ids', 'guest-ids', NULL, '2026-06-21 08:07:10.812184+00', '2026-06-21 08:07:10.812184+00', false, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 2, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict xS1Rq1rGMV5TDlcXe6g4BKqft9IVUDjLHmVlUF9lu2YbUd9JGY3WNYHgRbeDx25

RESET ALL;
