SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 2ukX7OVHZ0CHMIk3MuZcZl63GVwq1RflvIYgWwqMhMgoUFIKZUcy0GkVWD6a9Uy

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
	('00000000-0000-0000-0000-000000000000', '1aec3ab7-51eb-4094-bafd-582d40c4de78', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"admin2@pms.com","user_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","user_phone":""}}', '2026-04-10 06:45:12.945195+00', ''),
	('00000000-0000-0000-0000-000000000000', '5dfe84cc-0462-454f-be6c-303d7841e82a', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"owner2@example.com","user_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","user_phone":""}}', '2026-04-10 06:45:13.210102+00', ''),
	('00000000-0000-0000-0000-000000000000', '938790e1-075c-40e4-b43d-5c91e72504c6', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 06:47:12.859079+00', ''),
	('00000000-0000-0000-0000-000000000000', '962d6c21-5cb5-4e67-9493-7d9b60003aed', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"hotel1@gmail.com","user_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","user_phone":""}}', '2026-04-10 06:48:41.00721+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bd37db0d-56d7-481d-9640-e11dac71ec9d', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 06:49:16.52192+00', ''),
	('00000000-0000-0000-0000-000000000000', '29d98f77-8bac-4898-a695-405887818d39', '{"action":"user_updated_password","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-10 06:49:25.768298+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ac69277f-021c-4832-91ec-7cb6ab58c0c6', '{"action":"user_modified","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-10 06:49:25.769419+00', ''),
	('00000000-0000-0000-0000-000000000000', '0020a143-a918-4821-85ff-55930346704b', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 07:15:34.883755+00', ''),
	('00000000-0000-0000-0000-000000000000', '27857a3c-7d83-4656-9c20-8c219d61d211', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 07:15:47.012105+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ecb6bae1-524c-4a12-9286-af848eeea7c3', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 07:16:16.344437+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd36df174-a182-4a09-ae9c-0e6f02465f3f', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 07:18:13.158612+00', ''),
	('00000000-0000-0000-0000-000000000000', '2eb96d34-392d-44b8-aa92-97b4b9ba00d9', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 07:47:24.163006+00', ''),
	('00000000-0000-0000-0000-000000000000', '56167f6b-da17-4369-8fe3-747914c5b7bb', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 07:47:24.164453+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dd0742c7-b179-4540-8e70-e0f5fcdf55c6', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 07:59:18.515121+00', ''),
	('00000000-0000-0000-0000-000000000000', 'de857370-60f2-4c26-8a7b-12837c5c0abb', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 08:15:51.995243+00', ''),
	('00000000-0000-0000-0000-000000000000', '7605ee10-9ac7-4351-9734-b41d8101858f', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 08:46:30.402519+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f54b2a46-489f-484e-b992-28b5bce38473', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 08:46:30.404235+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b6515d0-eb05-413c-bb79-6d57e44c95c1', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 09:44:48.111549+00', ''),
	('00000000-0000-0000-0000-000000000000', '5327656a-90fa-46ae-92a0-c82f19f020b6', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 09:44:48.531775+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b6ca29eb-92d2-4b04-8cc6-2d0232785d56', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 09:44:48.532616+00', ''),
	('00000000-0000-0000-0000-000000000000', '1a10bd63-fb97-49ab-911e-111bad184175', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 10:43:56.476174+00', ''),
	('00000000-0000-0000-0000-000000000000', '7c9199ce-c552-46f9-b5d8-8823dec33eb8', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 10:43:56.479761+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc796c11-3790-49f5-8b33-9c13070dd017', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 10:43:57.135181+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ba1fac6d-8046-4d5b-b5e9-5ada7dad9d6c', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 10:43:57.432696+00', ''),
	('00000000-0000-0000-0000-000000000000', '244d2cde-3b82-4b8e-b87a-7472202948a6', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 11:09:29.618581+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dded6791-8d5e-4585-a6d0-e8317ead63e7', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 11:44:58.868303+00', ''),
	('00000000-0000-0000-0000-000000000000', '85678fc2-2b9c-4bc2-b319-e4e15d239bfe', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 11:44:58.869858+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bcf35391-2825-433a-8bbc-d56313273333', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 11:56:29.154094+00', ''),
	('00000000-0000-0000-0000-000000000000', '8bc38c65-11bf-42e5-a7dc-8505864d27b3', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:01:08.099627+00', ''),
	('00000000-0000-0000-0000-000000000000', 'faeb49be-b7f8-46a0-9d6c-cc1d5868b556', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:02:01.449101+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c2f3f95f-dd98-410c-b688-65785bb9428e', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:17:03.014955+00', ''),
	('00000000-0000-0000-0000-000000000000', '22ea5caa-1ae8-4bca-94c1-ef32a723c831', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:23:05.962898+00', ''),
	('00000000-0000-0000-0000-000000000000', '0a4cfdaf-4097-4adb-b6bf-249ca143461d', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:41:57.911571+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b2a2bc08-ad74-4584-90ee-8d268a5a3f2e', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:43:51.897438+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd9dfd84b-cce0-4bfd-9abb-17f964283782', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 12:55:31.087935+00', ''),
	('00000000-0000-0000-0000-000000000000', '0088714f-395d-46f9-b4fc-85d57dcb0aa4', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 13:00:46.239223+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed746fa8-b3d7-49cf-9c6c-3f653ce2caab', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 13:00:46.240056+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c7974fd-7e8f-4856-866a-2faab6c30a8b', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 13:02:12.554664+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd3ed66cc-5a2a-4572-aada-6c65aa64ca6b', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 13:14:54.178982+00', ''),
	('00000000-0000-0000-0000-000000000000', '4b56411a-b917-404c-883a-44e86c0ebe51', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 13:24:48.134791+00', ''),
	('00000000-0000-0000-0000-000000000000', 'efd7558d-e5ae-4559-9c42-9a554cf7e246', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-10 13:41:25.860899+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a01e630b-650c-45cf-913a-3592738f57a1', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 14:01:19.279769+00', ''),
	('00000000-0000-0000-0000-000000000000', '634eddbf-79fd-4501-9468-91ec98b7bca5', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-10 14:01:19.280673+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f63772e0-76c0-4b7c-8d73-9f330dbc3847', '{"action":"token_refreshed","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 05:05:55.612983+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd4f1cc06-2091-4a0b-8ea2-0b7302cc769e', '{"action":"token_revoked","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 05:05:55.614606+00', ''),
	('00000000-0000-0000-0000-000000000000', '893ab29d-9105-4c37-bc75-0fa55cb3e040', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 05:06:15.006072+00', ''),
	('00000000-0000-0000-0000-000000000000', '1916bb9f-3fb9-4340-92b4-6bbd32521973', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"mango@gmail.com","user_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","user_phone":""}}', '2026-04-11 05:07:05.831478+00', ''),
	('00000000-0000-0000-0000-000000000000', '7d80d3fb-c9ba-45b1-928a-a9734d705c3b', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 05:07:46.543291+00', ''),
	('00000000-0000-0000-0000-000000000000', '7541a2b2-a4db-4335-8ab5-6d4256fc1009', '{"action":"user_updated_password","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-11 05:07:55.961429+00', ''),
	('00000000-0000-0000-0000-000000000000', '0403ce91-a1b9-40ae-ace6-162ba31c272a', '{"action":"user_modified","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-11 05:07:55.962673+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fdd69db2-a68f-4655-8f55-2d225f68010b', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 05:09:06.830762+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e6c98dc6-4935-4a2d-b936-b7c0df0e3488', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 05:09:45.961565+00', ''),
	('00000000-0000-0000-0000-000000000000', '9b8da20e-0a3f-4b7a-8618-ac3efadd60be', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 09:08:46.179553+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f8ad8d0-d699-4b6e-92cd-5e42b6c51cce', '{"action":"token_revoked","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 09:08:46.183401+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ef244c52-4602-4b3f-a56f-617e015447b7', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:17:00.016907+00', ''),
	('00000000-0000-0000-0000-000000000000', '60050bef-b012-42d4-b3ed-f421841f6081', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:34:59.562336+00', ''),
	('00000000-0000-0000-0000-000000000000', '91233431-e3f9-45c8-a7ee-0be3398e24b8', '{"action":"logout","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 09:34:59.651719+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b61ed9b-13f1-4dd2-8672-7f9faed05849', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:35:04.68974+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd85416f4-1425-450d-92cc-0b392258ce86', '{"action":"logout","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 09:35:04.754897+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ca33cb68-a96a-4fde-9ade-4395b451aab0', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:35:12.205328+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f228b7fc-9978-428a-8352-48588d6688ee', '{"action":"logout","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 09:35:12.272662+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f825366e-f1f2-4260-8a8f-bd7d9194a412', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:35:31.934648+00', ''),
	('00000000-0000-0000-0000-000000000000', '9ad7a2d6-abe1-4da0-af7f-11821deb3291', '{"action":"logout","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 09:35:42.025226+00', ''),
	('00000000-0000-0000-0000-000000000000', '07ee1b7a-1a80-40d0-a29a-976e02d8e68e', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 09:35:54.886349+00', ''),
	('00000000-0000-0000-0000-000000000000', '596bc7a4-ee93-4243-ba50-7be055b61307', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 10:02:28.938754+00', ''),
	('00000000-0000-0000-0000-000000000000', '17b32856-bfc6-4f4c-a5b1-6a7928aa8495', '{"action":"logout","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 10:02:29.008777+00', ''),
	('00000000-0000-0000-0000-000000000000', '128ad92d-5d00-4745-b43d-ff6997603bd9', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 10:02:41.980288+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e8222c21-e682-4295-9fce-896c0836d9e4', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 10:03:46.656432+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f33ed79d-b72b-4d5a-b17a-d9204084a634', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 12:42:56.834061+00', ''),
	('00000000-0000-0000-0000-000000000000', '5daa8eb0-e210-4075-b185-fed1db1b0a19', '{"action":"token_revoked","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 12:42:56.834635+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b9630ee8-2e7c-4634-a759-2e32fdade167', '{"action":"login","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 12:44:11.054924+00', ''),
	('00000000-0000-0000-0000-000000000000', '7a9e092a-c86b-492b-b08c-31dc785208a7', '{"action":"logout","actor_id":"11005f89-a3d2-43d0-97fe-dbf1c135675c","actor_username":"hotel1@gmail.com","actor_via_sso":false,"log_type":"account"}', '2026-04-11 12:44:29.729818+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be02bfb9-1bf4-4bc6-b169-bc2b94a6c7a8', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 12:44:45.186635+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ce402e9-1859-4be7-83f9-39b59c8b47d3', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 13:33:21.360808+00', ''),
	('00000000-0000-0000-0000-000000000000', 'defaa7b9-cbed-4848-a394-891e03e0c8ca', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 13:33:21.523649+00', ''),
	('00000000-0000-0000-0000-000000000000', '4081b209-027e-481e-a105-c5558c0a3c8b', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 13:35:13.497532+00', ''),
	('00000000-0000-0000-0000-000000000000', '02cf3e27-e387-4008-8625-ca88af0cb050', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 13:37:13.032486+00', ''),
	('00000000-0000-0000-0000-000000000000', '74c0b32a-1c40-4d7c-9c58-1bf2e8be4f0a', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 13:38:33.503766+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b09ae6d9-7103-4764-876a-363d2929cd64', '{"action":"login","actor_id":"89ec58b1-14c9-47c4-a32a-f6a06a94ff7a","actor_username":"owner2@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 13:57:52.056345+00', ''),
	('00000000-0000-0000-0000-000000000000', '013248ca-a318-4493-90cb-10288d4a996f', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 14:01:44.905155+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b1989cf1-1ac9-4e55-894d-7f62c5b5ec23', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 14:31:55.916609+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f1f61092-c9c6-4de3-943b-270d3b9e26e4', '{"action":"token_revoked","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-11 14:31:55.917291+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ad3479a4-0186-4512-8939-9d8d217e930d', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 14:33:26.732178+00', ''),
	('00000000-0000-0000-0000-000000000000', '89d4122e-5451-4447-8163-ddf0f7f8f4ce', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"mangogroup@gmail.com","user_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","user_phone":""}}', '2026-04-11 14:34:28.448318+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b8b5e1f-2572-4115-94d8-c052e4a60db5', '{"action":"login","actor_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","actor_username":"mangogroup@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-11 14:35:13.22587+00', ''),
	('00000000-0000-0000-0000-000000000000', '66001dac-2eca-42c6-9436-27a85e93b184', '{"action":"user_updated_password","actor_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","actor_username":"mangogroup@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-11 14:35:24.24715+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc6d0b87-6eea-4147-99dd-bbdfd1a4d07c', '{"action":"user_modified","actor_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","actor_username":"mangogroup@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-04-11 14:35:24.248353+00', ''),
	('00000000-0000-0000-0000-000000000000', '28dc563d-2849-43e0-ac18-0fc2bcb3352a', '{"action":"token_refreshed","actor_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","actor_username":"mangogroup@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 07:24:06.368807+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f075f407-d658-42e1-8185-10205a889438', '{"action":"token_revoked","actor_id":"bb5cb645-32cb-4222-a10a-24068b0216c8","actor_username":"mangogroup@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 07:24:06.371672+00', ''),
	('00000000-0000-0000-0000-000000000000', '6f02ecb6-3ac4-4c21-acb2-b9f0468d2e5f', '{"action":"login","actor_id":"31b634a2-7676-4c90-8c77-c5ab66013d72","actor_username":"admin2@pms.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-12 07:25:32.74961+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a30e67a3-aabc-44c5-bd9a-c547725482ae', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-12 07:26:16.241941+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aa6040cb-40b5-4846-b360-ac549b6beced', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:34.357698+00', ''),
	('00000000-0000-0000-0000-000000000000', '72c8a4d0-a041-4ca6-bf3d-fff85350cfcc', '{"action":"token_revoked","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:34.363067+00', ''),
	('00000000-0000-0000-0000-000000000000', '23dfffce-a9d0-4a45-b625-6a57177bc0bd', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:34.456399+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fafe90ab-ab39-4045-afec-ff816a142c33', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:34.801941+00', ''),
	('00000000-0000-0000-0000-000000000000', '6117a1d7-8ff8-4e99-984a-3d83e65143bc', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:34.869746+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fd5fb93f-2de2-47ed-ab66-5bd87fcba192', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:35.056771+00', ''),
	('00000000-0000-0000-0000-000000000000', '682af9b0-7876-4889-a0a0-176da403a731', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 08:57:35.104008+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b635f1fe-c36a-424f-b83a-e7a1cd182dbc', '{"action":"login","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-12 09:39:29.674841+00', ''),
	('00000000-0000-0000-0000-000000000000', '87f77fe8-1532-474b-8293-58b56435f718', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.105556+00', ''),
	('00000000-0000-0000-0000-000000000000', '273655de-7082-473f-82ae-f9ee94cb828c', '{"action":"token_revoked","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.106459+00', ''),
	('00000000-0000-0000-0000-000000000000', '63d436ea-158c-4908-bc81-4543ab72f170', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.150086+00', ''),
	('00000000-0000-0000-0000-000000000000', '50f92c71-350b-4837-b855-eb82919d4fb1', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.481312+00', ''),
	('00000000-0000-0000-0000-000000000000', '41d3f96c-46c4-4f33-955e-eb704e9cbce6', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.687077+00', ''),
	('00000000-0000-0000-0000-000000000000', '05ceea26-1cd6-4b10-8d8b-69ea22fbba88', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.76559+00', ''),
	('00000000-0000-0000-0000-000000000000', '784f42fc-6088-400e-a3d8-7050923ba04b', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.937761+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f7bedaf0-00f5-4232-8ab9-8cc7fc5417df', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:31.989078+00', ''),
	('00000000-0000-0000-0000-000000000000', '8a849849-c04c-495f-9f6a-bd666777dcbd', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.12855+00', ''),
	('00000000-0000-0000-0000-000000000000', '218ec6cb-e567-473e-9029-eda680fe2bd1', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.163769+00', ''),
	('00000000-0000-0000-0000-000000000000', '2c90351f-c51e-4d49-9acc-760bd1614eb1', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.356695+00', ''),
	('00000000-0000-0000-0000-000000000000', '69efd0c7-55b7-422f-871b-830d4bdc7e5b', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.389949+00', ''),
	('00000000-0000-0000-0000-000000000000', '54370a09-34f6-4415-aa9d-8e38455efd4b', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.581345+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a44eea74-a8dd-4ca1-b328-688fd4b98d5f', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.628091+00', ''),
	('00000000-0000-0000-0000-000000000000', '82c358f8-69cc-42d8-89a8-09fa8e7e3eec', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.743994+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f5a8a6f0-6f6d-4886-a3d2-878809252217', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.853009+00', ''),
	('00000000-0000-0000-0000-000000000000', '9eeb5c6f-c60a-4a3b-83ca-4bcabcbed6de', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:32.940371+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ef68ceb-a894-44f4-b5ff-82766ab7821e', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:33.089337+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc748564-8e61-45e7-8024-46b388d7768f', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:33.172049+00', ''),
	('00000000-0000-0000-0000-000000000000', '42164b05-2a7b-4911-b4ba-a8c2e2480a34', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:33.321402+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f8e1adfe-ac8c-41e5-953a-bef59171a04a', '{"action":"token_refreshed","actor_id":"57ad2dc0-2a1b-43d5-a654-61290ac36d5a","actor_username":"mango@gmail.com","actor_via_sso":false,"log_type":"token"}', '2026-04-12 09:57:33.618137+00', '');


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
	('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, NULL, 'owner@demo.com', '$2a$06$HFQab73SddaL1ZUQhAG3TORfk7oiJDK5HQR9VviUG/YiE7rR4W4xu', '2026-04-10 06:22:17.069473+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"role": "owner"}', NULL, '2026-04-10 06:22:17.069473+00', '2026-04-10 06:22:17.069473+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, NULL, 'staff@demo.com', '$2a$06$I2IS/EG9TVlki5SvOwnSBe1NRe33DDH/AZ86Xy.6VNMpacDsgY8My', '2026-04-10 06:22:17.069473+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"role": "staff"}', NULL, '2026-04-10 06:22:17.069473+00', '2026-04-10 06:22:17.069473+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, NULL, 'admin@pms.com', '$2a$06$eSOP/p4/hjVN0BW1Tf8K2OtteeF7tRo/REUVNZJtwMO4CYyvYGDmK', '2026-04-10 06:22:17.069473+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"role": "admin"}', NULL, '2026-04-10 06:22:17.069473+00', '2026-04-10 06:22:17.069473+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'provider@pms.com', '$2a$06$/lXUgGNU.9OaQHQgSuyikO1RRNTNctoDnVuIbPkdfpF8MuNp7BCAu', '2026-04-10 06:40:16.062443+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"role": "admin"}', NULL, NULL, NULL, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '11005f89-a3d2-43d0-97fe-dbf1c135675c', 'authenticated', 'authenticated', 'hotel1@gmail.com', '$2a$10$i04lF6QdjlNoIhcZa85KVembHgFPJ/ERZQ7Oc3oKgEQxj0.XMUTae', '2026-04-10 06:48:41.009391+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-11 12:44:11.056059+00', '{"provider": "email", "providers": ["email"]}', '{"role": "owner", "email_verified": true, "requires_password_change": false}', NULL, '2026-04-10 06:48:41.002504+00', '2026-04-11 12:44:11.058546+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'bb5cb645-32cb-4222-a10a-24068b0216c8', 'authenticated', 'authenticated', 'mangogroup@gmail.com', '$2a$10$nyJ3pq7Xox28OaGXQ3Xew.wkL.o0M471L6DwCNlgthGRTQme/NfZu', '2026-04-11 14:34:28.44929+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-11 14:35:13.226768+00', '{"provider": "email", "providers": ["email"]}', '{"role": "owner", "email_verified": true, "requires_password_change": false}', NULL, '2026-04-11 14:34:28.435854+00', '2026-04-12 07:24:06.375677+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '31b634a2-7676-4c90-8c77-c5ab66013d72', 'authenticated', 'authenticated', 'admin2@pms.com', '$2a$10$m9daXqzi3aLe9LC/.bnMXe/Xu5VZD56biGoy6HsLwj0iLpYglsKzK', '2026-04-10 06:45:12.946977+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-12 07:25:32.750897+00', '{"provider": "email", "providers": ["email"]}', '{"role": "admin", "email_verified": true}', NULL, '2026-04-10 06:45:12.937338+00', '2026-04-12 07:25:32.785786+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', 'authenticated', 'authenticated', 'owner2@example.com', '$2a$10$UH40.k6ITEGNtrokJEEVPuTbh4YYD8Un2HHGdqD/t9ARd..EQN8uO', '2026-04-10 06:45:13.212355+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-11 13:57:52.057275+00', '{"provider": "email", "providers": ["email"]}', '{"role": "owner", "email_verified": true}', NULL, '2026-04-10 06:45:13.204171+00', '2026-04-11 13:57:52.059362+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', 'authenticated', 'authenticated', 'mango@gmail.com', '$2a$10$K/o0dRMTcqrxfSesZMd3Eek2ZoEKO6z9dfT2CBY/Z3/WdBK/RbrHe', '2026-04-11 05:07:05.83307+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-12 09:39:29.675963+00', '{"provider": "email", "providers": ["email"]}', '{"role": "owner", "email_verified": true, "requires_password_change": false}', NULL, '2026-04-11 05:07:05.828643+00', '2026-04-12 09:57:31.108467+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('31b634a2-7676-4c90-8c77-c5ab66013d72', '31b634a2-7676-4c90-8c77-c5ab66013d72', '{"sub": "31b634a2-7676-4c90-8c77-c5ab66013d72", "email": "admin2@pms.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-10 06:45:12.941954+00', '2026-04-10 06:45:12.942008+00', '2026-04-10 06:45:12.942008+00', '32cdb788-29b5-479b-9b72-8100ae279168'),
	('89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '{"sub": "89ec58b1-14c9-47c4-a32a-f6a06a94ff7a", "email": "owner2@example.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-10 06:45:13.206891+00', '2026-04-10 06:45:13.20699+00', '2026-04-10 06:45:13.20699+00', '28ed8df1-b12c-4883-9511-575423200111'),
	('11005f89-a3d2-43d0-97fe-dbf1c135675c', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{"sub": "11005f89-a3d2-43d0-97fe-dbf1c135675c", "email": "hotel1@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-10 06:48:41.00489+00', '2026-04-10 06:48:41.004957+00', '2026-04-10 06:48:41.004957+00', 'f4580265-e4d5-46c7-b495-9313277d7988'),
	('57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '{"sub": "57ad2dc0-2a1b-43d5-a654-61290ac36d5a", "email": "mango@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-11 05:07:05.830379+00', '2026-04-11 05:07:05.830411+00', '2026-04-11 05:07:05.830411+00', 'a89379a4-280e-4e69-9f12-9ca99675c309'),
	('bb5cb645-32cb-4222-a10a-24068b0216c8', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '{"sub": "bb5cb645-32cb-4222-a10a-24068b0216c8", "email": "mangogroup@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-11 14:34:28.446663+00', '2026-04-11 14:34:28.4467+00', '2026-04-11 14:34:28.4467+00', 'd9e559a6-64ec-4166-94b9-cd84bb577df0');


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
	('a1a5fcab-5121-4041-b728-fefffe8d0129', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 07:15:34.884925+00', '2026-04-10 07:15:34.884925+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('2c44abad-6339-40f4-ba37-94edba1841a8', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 07:15:47.013493+00', '2026-04-10 07:15:47.013493+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('9d5ddc10-b2b8-4020-b98c-0f67f76ed44c', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 07:16:16.345596+00', '2026-04-10 07:16:16.345596+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('2f1f0dc1-2c3f-4880-a37b-0152d9143ce3', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 07:18:13.159935+00', '2026-04-10 07:18:13.159935+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('1ad84079-8391-4caf-830e-4314dbf427c5', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-11 10:03:46.657798+00', '2026-04-11 10:03:46.657798+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('87cc2d34-4ab1-4765-81ee-5f82f9a7b962', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-11 12:44:45.188369+00', '2026-04-11 12:44:45.188369+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('8d2df2d9-0acb-4b70-b9e3-c934a3e9aa74', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 11:09:29.626204+00', '2026-04-10 11:09:29.626204+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('a3fadcc8-f0aa-4ef9-9fcb-a71bf276cbca', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 11:56:29.155014+00', '2026-04-10 11:56:29.155014+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('67a7a998-3127-4de3-bf7c-cb804762e667', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 12:01:08.101262+00', '2026-04-10 12:01:08.101262+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('48fe9519-e6e4-4d14-98ea-188022e8c6eb', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-10 12:02:01.451784+00', '2026-04-10 12:02:01.451784+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('9ab9f0b9-27e0-4160-843b-57cf705e5072', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-11 13:35:13.500325+00', '2026-04-11 13:35:13.500325+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('e9a5977f-54c1-4fda-a349-987c9fd4ff8c', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-11 13:37:13.033756+00', '2026-04-11 13:37:13.033756+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('3342da7c-3ab0-450a-b5aa-9e84eff94c20', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-11 13:38:33.504747+00', '2026-04-11 13:38:33.504747+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('101e0be1-b74d-4d89-83c4-121e0a19a8ab', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-11 13:57:52.057328+00', '2026-04-11 13:57:52.057328+00', NULL, 'aal1', NULL, NULL, 'node', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('b0ac1bf8-3c5d-428c-bbb3-ad924c96188c', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-11 14:01:44.906288+00', '2026-04-11 14:01:44.906288+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('ed630513-aa4b-4fae-8761-ad8992af2684', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-11 10:02:41.981181+00', '2026-04-11 14:31:55.923838+00', NULL, 'aal1', NULL, '2026-04-11 14:31:55.92371', 'Next.js Middleware', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('77f7ff13-6e2e-45b1-80f8-ccb3b1c97e1f', '31b634a2-7676-4c90-8c77-c5ab66013d72', '2026-04-11 14:33:26.733043+00', '2026-04-11 14:33:26.733043+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('f4efe996-946e-4bb5-a2dd-36e84be5d87a', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '2026-04-11 14:35:13.22684+00', '2026-04-12 07:24:06.377923+00', NULL, 'aal1', NULL, '2026-04-12 07:24:06.377796', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('3ac3c054-35d9-4870-a2f2-43658c8174ed', '31b634a2-7676-4c90-8c77-c5ab66013d72', '2026-04-12 07:25:32.751005+00', '2026-04-12 07:25:32.751005+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('c7865b96-355f-4752-94d9-04d67f0b8e24', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-12 07:26:16.243325+00', '2026-04-12 09:57:33.620341+00', NULL, 'aal1', NULL, '2026-04-12 09:57:33.620229', 'Next.js Middleware', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('7b8423a4-0c3e-4fdd-a4db-cf1e2c113170', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-12 09:39:29.676026+00', '2026-04-12 09:39:29.676026+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('a1a5fcab-5121-4041-b728-fefffe8d0129', '2026-04-10 07:15:34.888575+00', '2026-04-10 07:15:34.888575+00', 'password', 'b605ecda-edc5-411e-a192-7e579ca51ef2'),
	('2c44abad-6339-40f4-ba37-94edba1841a8', '2026-04-10 07:15:47.020318+00', '2026-04-10 07:15:47.020318+00', 'password', '3f5f2411-361a-46a9-9af6-a24f8dd720cc'),
	('9d5ddc10-b2b8-4020-b98c-0f67f76ed44c', '2026-04-10 07:16:16.348545+00', '2026-04-10 07:16:16.348545+00', 'password', '19a09f0b-b3bb-4bf4-9cbb-253994965fb1'),
	('2f1f0dc1-2c3f-4880-a37b-0152d9143ce3', '2026-04-10 07:18:13.164662+00', '2026-04-10 07:18:13.164662+00', 'password', '06b5dff9-22c1-44f1-b809-26f4db595b1d'),
	('8d2df2d9-0acb-4b70-b9e3-c934a3e9aa74', '2026-04-10 11:09:29.635879+00', '2026-04-10 11:09:29.635879+00', 'password', '43fdf06d-0750-4436-a8a5-eddc16f4329b'),
	('a3fadcc8-f0aa-4ef9-9fcb-a71bf276cbca', '2026-04-10 11:56:29.163845+00', '2026-04-10 11:56:29.163845+00', 'password', 'fa299ceb-f16d-4a8a-ac24-9ba98801005c'),
	('67a7a998-3127-4de3-bf7c-cb804762e667', '2026-04-10 12:01:08.106415+00', '2026-04-10 12:01:08.106415+00', 'password', 'c5b4959c-cb01-4d29-a444-987467b7cb20'),
	('48fe9519-e6e4-4d14-98ea-188022e8c6eb', '2026-04-10 12:02:01.455252+00', '2026-04-10 12:02:01.455252+00', 'password', '02b53136-4600-4da3-ad0d-11e5aa8b033d'),
	('ed630513-aa4b-4fae-8761-ad8992af2684', '2026-04-11 10:02:41.984992+00', '2026-04-11 10:02:41.984992+00', 'password', 'cc6c933a-295c-4e39-9f5d-7db7bdebd7f7'),
	('1ad84079-8391-4caf-830e-4314dbf427c5', '2026-04-11 10:03:46.672565+00', '2026-04-11 10:03:46.672565+00', 'password', 'dfa668ff-ab05-4c68-9390-60e616d3f783'),
	('87cc2d34-4ab1-4765-81ee-5f82f9a7b962', '2026-04-11 12:44:45.192705+00', '2026-04-11 12:44:45.192705+00', 'password', 'ef5f0236-03bf-4553-b12b-bed7b7a439d5'),
	('9ab9f0b9-27e0-4160-843b-57cf705e5072', '2026-04-11 13:35:13.504215+00', '2026-04-11 13:35:13.504215+00', 'password', '4a636dbd-7882-4430-87e0-f4141ec3ff64'),
	('e9a5977f-54c1-4fda-a349-987c9fd4ff8c', '2026-04-11 13:37:13.038032+00', '2026-04-11 13:37:13.038032+00', 'password', '170057bc-89d9-416f-b030-72d535044093'),
	('3342da7c-3ab0-450a-b5aa-9e84eff94c20', '2026-04-11 13:38:33.507805+00', '2026-04-11 13:38:33.507805+00', 'password', '7d62ee52-a588-4f18-ace7-7518090ce888'),
	('101e0be1-b74d-4d89-83c4-121e0a19a8ab', '2026-04-11 13:57:52.059767+00', '2026-04-11 13:57:52.059767+00', 'password', '0343a4d3-4aaa-409d-88e8-45f07273f461'),
	('b0ac1bf8-3c5d-428c-bbb3-ad924c96188c', '2026-04-11 14:01:44.912486+00', '2026-04-11 14:01:44.912486+00', 'password', '5386328c-d6e1-49b3-a186-dda65c28bed9'),
	('77f7ff13-6e2e-45b1-80f8-ccb3b1c97e1f', '2026-04-11 14:33:26.737182+00', '2026-04-11 14:33:26.737182+00', 'password', '9c700f15-feb2-40ef-b0ef-18cde73088ee'),
	('f4efe996-946e-4bb5-a2dd-36e84be5d87a', '2026-04-11 14:35:13.230061+00', '2026-04-11 14:35:13.230061+00', 'password', '900d883f-2148-4d9e-84f5-48b1c0a8928e'),
	('3ac3c054-35d9-4870-a2f2-43658c8174ed', '2026-04-12 07:25:32.786419+00', '2026-04-12 07:25:32.786419+00', 'password', 'ffd00a84-cd66-4a9e-ac1a-386ce0523a46'),
	('c7865b96-355f-4752-94d9-04d67f0b8e24', '2026-04-12 07:26:16.247061+00', '2026-04-12 07:26:16.247061+00', 'password', 'cc41d70d-eb89-4d6a-99c0-787c2936b355'),
	('7b8423a4-0c3e-4fdd-a4db-cf1e2c113170', '2026-04-12 09:39:29.680965+00', '2026-04-12 09:39:29.680965+00', 'password', '716e0df9-9824-4a4a-832b-3aad5b2019e5');


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
	('00000000-0000-0000-0000-000000000000', 3, 'uy7elpdkcmzf', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 07:15:34.887198+00', '2026-04-10 07:15:34.887198+00', NULL, 'a1a5fcab-5121-4041-b728-fefffe8d0129'),
	('00000000-0000-0000-0000-000000000000', 4, 'py3cljhi6yh6', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 07:15:47.016692+00', '2026-04-10 07:15:47.016692+00', NULL, '2c44abad-6339-40f4-ba37-94edba1841a8'),
	('00000000-0000-0000-0000-000000000000', 5, 'x6sa2xlr24gg', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 07:16:16.346994+00', '2026-04-10 07:16:16.346994+00', NULL, '9d5ddc10-b2b8-4020-b98c-0f67f76ed44c'),
	('00000000-0000-0000-0000-000000000000', 6, 'fj3gxp5duaue', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 07:18:13.161608+00', '2026-04-10 07:18:13.161608+00', NULL, '2f1f0dc1-2c3f-4880-a37b-0152d9143ce3'),
	('00000000-0000-0000-0000-000000000000', 14, 'zawxu32iqz2h', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 11:09:29.632082+00', '2026-04-10 11:09:29.632082+00', NULL, '8d2df2d9-0acb-4b70-b9e3-c934a3e9aa74'),
	('00000000-0000-0000-0000-000000000000', 16, 'h5gmubrmzjkg', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 11:56:29.160637+00', '2026-04-10 11:56:29.160637+00', NULL, 'a3fadcc8-f0aa-4ef9-9fcb-a71bf276cbca'),
	('00000000-0000-0000-0000-000000000000', 17, 'paadrly6uqqv', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 12:01:08.103598+00', '2026-04-10 12:01:08.103598+00', NULL, '67a7a998-3127-4de3-bf7c-cb804762e667'),
	('00000000-0000-0000-0000-000000000000', 18, 'hfj5vmhhe54n', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-10 12:02:01.453688+00', '2026-04-10 12:02:01.453688+00', NULL, '48fe9519-e6e4-4d14-98ea-188022e8c6eb'),
	('00000000-0000-0000-0000-000000000000', 44, 'lnhvmisdmq6b', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-11 10:03:46.670867+00', '2026-04-11 10:03:46.670867+00', NULL, '1ad84079-8391-4caf-830e-4314dbf427c5'),
	('00000000-0000-0000-0000-000000000000', 43, 'jqtusxhiflu6', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', true, '2026-04-11 10:02:41.982625+00', '2026-04-11 12:42:56.834933+00', NULL, 'ed630513-aa4b-4fae-8761-ad8992af2684'),
	('00000000-0000-0000-0000-000000000000', 47, 'ckcyymmymgyg', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-11 12:44:45.190998+00', '2026-04-11 12:44:45.190998+00', NULL, '87cc2d34-4ab1-4765-81ee-5f82f9a7b962'),
	('00000000-0000-0000-0000-000000000000', 48, 'm6ofo3mvphy6', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-11 13:35:13.502683+00', '2026-04-11 13:35:13.502683+00', NULL, '9ab9f0b9-27e0-4160-843b-57cf705e5072'),
	('00000000-0000-0000-0000-000000000000', 49, 'aedrypz4taug', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-11 13:37:13.035527+00', '2026-04-11 13:37:13.035527+00', NULL, 'e9a5977f-54c1-4fda-a349-987c9fd4ff8c'),
	('00000000-0000-0000-0000-000000000000', 50, 'ybyskqvmt65g', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-11 13:38:33.506199+00', '2026-04-11 13:38:33.506199+00', NULL, '3342da7c-3ab0-450a-b5aa-9e84eff94c20'),
	('00000000-0000-0000-0000-000000000000', 51, 'tlbe4q26tms6', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', false, '2026-04-11 13:57:52.058566+00', '2026-04-11 13:57:52.058566+00', NULL, '101e0be1-b74d-4d89-83c4-121e0a19a8ab'),
	('00000000-0000-0000-0000-000000000000', 52, 'k5l3q7xmewcw', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-11 14:01:44.909248+00', '2026-04-11 14:01:44.909248+00', NULL, 'b0ac1bf8-3c5d-428c-bbb3-ad924c96188c'),
	('00000000-0000-0000-0000-000000000000', 45, '55kbjgj6mboc', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', true, '2026-04-11 12:42:56.835356+00', '2026-04-11 14:31:55.917675+00', 'jqtusxhiflu6', 'ed630513-aa4b-4fae-8761-ad8992af2684'),
	('00000000-0000-0000-0000-000000000000', 53, 'eseb7vnuefkt', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-11 14:31:55.918221+00', '2026-04-11 14:31:55.918221+00', '55kbjgj6mboc', 'ed630513-aa4b-4fae-8761-ad8992af2684'),
	('00000000-0000-0000-0000-000000000000', 54, 'crpqbyclbvar', '31b634a2-7676-4c90-8c77-c5ab66013d72', false, '2026-04-11 14:33:26.734472+00', '2026-04-11 14:33:26.734472+00', NULL, '77f7ff13-6e2e-45b1-80f8-ccb3b1c97e1f'),
	('00000000-0000-0000-0000-000000000000', 55, 'eglqwczbs5by', 'bb5cb645-32cb-4222-a10a-24068b0216c8', true, '2026-04-11 14:35:13.228457+00', '2026-04-12 07:24:06.372571+00', NULL, 'f4efe996-946e-4bb5-a2dd-36e84be5d87a'),
	('00000000-0000-0000-0000-000000000000', 56, 'jfyrtf2hjeey', 'bb5cb645-32cb-4222-a10a-24068b0216c8', false, '2026-04-12 07:24:06.373559+00', '2026-04-12 07:24:06.373559+00', 'eglqwczbs5by', 'f4efe996-946e-4bb5-a2dd-36e84be5d87a'),
	('00000000-0000-0000-0000-000000000000', 57, 'zxr67chamenq', '31b634a2-7676-4c90-8c77-c5ab66013d72', false, '2026-04-12 07:25:32.78475+00', '2026-04-12 07:25:32.78475+00', NULL, '3ac3c054-35d9-4870-a2f2-43658c8174ed'),
	('00000000-0000-0000-0000-000000000000', 58, 'hv55spzrvr6t', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', true, '2026-04-12 07:26:16.24546+00', '2026-04-12 08:57:34.36385+00', NULL, 'c7865b96-355f-4752-94d9-04d67f0b8e24'),
	('00000000-0000-0000-0000-000000000000', 60, 'hkem3wn6x5q3', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-12 09:39:29.677794+00', '2026-04-12 09:39:29.677794+00', NULL, '7b8423a4-0c3e-4fdd-a4db-cf1e2c113170'),
	('00000000-0000-0000-0000-000000000000', 59, 'hnogv7r7owah', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', true, '2026-04-12 08:57:34.364605+00', '2026-04-12 09:57:31.106949+00', 'hv55spzrvr6t', 'c7865b96-355f-4752-94d9-04d67f0b8e24'),
	('00000000-0000-0000-0000-000000000000', 61, 'vvoruc6aocq5', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', false, '2026-04-12 09:57:31.107538+00', '2026-04-12 09:57:31.107538+00', 'hnogv7r7owah', 'c7865b96-355f-4752-94d9-04d67f0b8e24');


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
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_settings" ("key", "value", "description", "updated_at") VALUES
	('n8n_webhook_url', 'http://18.206.46.206:5678/webhook/booking-notification', 'The URL for n8n to process booking welcome emails', '2026-04-10 06:22:16.987814+00');


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."properties" ("id", "name", "tier", "created_at", "status", "wifi_network", "wifi_password") VALUES
	('11111111-1111-1111-1111-111111111111', 'The Grand Demo Hotel', 'Enterprise', '2026-04-10 06:22:17.069473+00', 'Active', 'Guest_WiFi', 'welcome123'),
	('63dad7aa-c5f9-4f0e-b21e-b0175397a42c', 'hotel1', 'Starter', '2026-04-10 06:48:40.886955+00', 'Active', 'Guest_WiFi', 'welcome123'),
	('1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'mango hotels', 'Starter', '2026-04-11 05:07:05.711729+00', 'Active', 'Guest_WiFi', 'welcome123');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "role", "property_id", "created_at", "email", "permissions") VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'System Admin', 'admin', NULL, '2026-04-10 06:22:17.069473+00', 'admin@pms.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Demo Owner', 'owner', '11111111-1111-1111-1111-111111111111', '2026-04-10 06:22:17.069473+00', 'owner@demo.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo Staff', 'staff', '11111111-1111-1111-1111-111111111111', '2026-04-10 06:22:17.069473+00', 'staff@demo.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('11111111-1111-1111-1111-111111111111', 'System Provider', 'admin', NULL, '2026-04-10 06:40:16.07521+00', 'provider@pms.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('31b634a2-7676-4c90-8c77-c5ab66013d72', 'System Administrator', 'admin', NULL, '2026-04-10 06:45:13.063425+00', 'admin2@pms.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('11005f89-a3d2-43d0-97fe-dbf1c135675c', 'Property Owner', 'owner', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '2026-04-10 06:48:41.045553+00', 'hotel1@gmail.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', 'Hotel Owner', 'owner', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '2026-04-10 06:45:13.349124+00', 'owner2@example.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('57ad2dc0-2a1b-43d5-a654-61290ac36d5a', 'Property Owner', 'owner', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '2026-04-11 05:07:05.874736+00', 'mango@gmail.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}'),
	('bb5cb645-32cb-4222-a10a-24068b0216c8', 'mango group', 'owner', NULL, '2026-04-11 14:34:28.470134+00', 'mangogroup@gmail.com', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "read", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "read", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}');


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rooms" ("id", "property_id", "room_number", "type", "status", "created_at", "assigned_staff_id", "cleaning_started_at", "last_cleaned_at", "is_deleted") VALUES
	('0f197e0f-b6a2-4b6b-9b82-d693bf1ed132', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '107', 'Standard', 'Available', '2026-04-10 13:50:45.398919+00', NULL, NULL, NULL, false),
	('9c5e0f9c-1734-4117-b6b8-026e345f98d5', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '103', 'Deluxe', 'Available', '2026-04-11 14:30:57.203982+00', NULL, NULL, NULL, false),
	('8eba1494-0f33-4d8a-9de3-8091b8c77cb6', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '101', 'Standard', 'Dirty', '2026-04-10 07:19:26.193322+00', NULL, NULL, '2026-04-10 13:25:24.1+00', false),
	('5ec42f9a-b854-4770-98b2-063eec440eb3', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '102', 'Standard', 'Occupied', '2026-04-10 07:19:34.354407+00', NULL, NULL, '2026-04-10 12:23:42.879+00', false),
	('cad0d56e-8387-4908-9dc8-82faced837ef', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '101', 'Standard', 'Available', '2026-04-11 12:45:17.445673+00', NULL, NULL, '2026-04-11 14:32:11.392+00', false),
	('f194ee53-8537-4d63-bea2-65ac49d19b96', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '102', 'Standard', 'Maintenance', '2026-04-11 12:45:23.486952+00', NULL, NULL, NULL, false),
	('8c45b775-f564-4ddf-918e-8412c96ab868', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '103', 'Standard', 'Available', '2026-04-10 07:26:12.834629+00', NULL, NULL, '2026-04-10 12:23:44.101+00', false),
	('06ee059c-e2c1-4419-84fe-081fca7aff27', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '104', 'Standard', 'Available', '2026-04-10 10:38:38.347011+00', NULL, NULL, '2026-04-10 12:24:31.039+00', false),
	('39e376ac-18a9-41ab-96c3-24679eca0119', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '105', 'Standard', 'Available', '2026-04-10 12:39:25.590714+00', NULL, NULL, NULL, false),
	('33dccadb-7feb-47fd-8788-989b555880e9', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '106', 'Standard', 'Available', '2026-04-10 12:42:24.513537+00', NULL, NULL, NULL, false);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bookings" ("id", "property_id", "room_id", "guest_name", "check_in", "check_out", "amount", "status", "created_at", "guest_email", "notes", "original_room_id", "id_verified", "id_photo_url", "signature_url") VALUES
	('becb7732-2dc4-421c-bc93-38516771b0a0', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'f194ee53-8537-4d63-bea2-65ac49d19b96', 'guest1', '2026-04-12', '2026-04-13', 12.00, 'Checked Out', '2026-04-12 07:26:54.002222+00', 'sathish.a@ishitham.com', 'wwwwwwwwwwwwwww', NULL, false, NULL, NULL),
	('1906c87e-da43-4662-95b5-4f7c8a47c724', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'cad0d56e-8387-4908-9dc8-82faced837ef', 'guest5', '2026-04-12', '2026-04-13', 15.00, 'Checked In', '2026-04-12 08:03:36.974487+00', 'sathish.a@ishitham.com', 'wwwwwwwwwwwwwwwww', NULL, false, NULL, NULL),
	('5ac60367-0643-43d8-b502-b97e8463e4e2', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '8c45b775-f564-4ddf-918e-8412c96ab868', 'guest3', '2026-04-10', '2026-04-11', 12.00, 'Checked Out', '2026-04-10 09:49:48.334831+00', 'test@gmail.com', 'sssssssssssssssssss', NULL, false, NULL, NULL),
	('676d55b5-8695-40f9-ba34-36c558fde99c', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '06ee059c-e2c1-4419-84fe-081fca7aff27', 'guest4', '2026-04-10', '2026-04-11', 15.00, 'Checked Out', '2026-04-10 10:38:57.740014+00', 'test@gmail.com', 'qqqqqqqqqqqqqqqqqqqq', NULL, false, NULL, NULL),
	('fc3940a7-0f41-4f83-a864-130382eff74e', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '8eba1494-0f33-4d8a-9de3-8091b8c77cb6', 'guest1', '2026-04-10', '2026-04-10', 10.00, 'Checked Out', '2026-04-10 13:03:10.442907+00', 'test@gmail.com', NULL, NULL, false, NULL, NULL),
	('c7555142-4f16-4d16-aab8-6c9030bcff16', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '8eba1494-0f33-4d8a-9de3-8091b8c77cb6', 'guest1', '2026-04-10', '2026-04-11', 150.00, 'Confirmed', '2026-04-10 07:25:09.936826+00', 'sathish.a@ishitham.com', 'aaaaaaaaaaaaaaaaaaaaaaaaaa', NULL, true, NULL, NULL),
	('e353180f-5f1c-488e-aee5-9341438ac21d', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '5ec42f9a-b854-4770-98b2-063eec440eb3', 'guest1', '2026-04-10', '2026-04-11', 10.00, 'Confirmed', '2026-04-10 08:05:42.109738+00', 'sathish.a@ishitham.com', 'sssssssssssssssssssssss', NULL, true, NULL, NULL),
	('2840765c-d519-4eee-a62e-e794763d42e7', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'cad0d56e-8387-4908-9dc8-82faced837ef', 'prasad', '2026-04-11', '2026-04-12', 10.00, 'Checked Out', '2026-04-11 12:45:59.895689+00', 'mango@gmail.com', 'zzzzzzzzzzzzzzzzzzzzz', NULL, true, '2840765c-d519-4eee-a62e-e794763d42e7_id.png', 'data:image/png;base64,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'),
	('f5186500-0a15-4c28-be8a-6ea1fefa7e38', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '5ec42f9a-b854-4770-98b2-063eec440eb3', 'prasad', '2026-04-11', '2026-04-12', 150.00, 'Checked In', '2026-04-11 05:11:18.838399+00', 'sathish.a@ishitham.com', 'ssssssssssssss', NULL, true, 'f5186500-0a15-4c28-be8a-6ea1fefa7e38_id.png', 'http://127.0.0.1:54321/storage/v1/object/public/guest-ids/f5186500-0a15-4c28-be8a-6ea1fefa7e38_sig.png'),
	('e8086e77-de10-4b3e-8643-8669d7f1d6b4', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '8eba1494-0f33-4d8a-9de3-8091b8c77cb6', 'prasad', '2026-04-11', '2026-04-12', 150.00, 'Checked Out', '2026-04-11 05:10:47.459947+00', 'sathish.a@ishitham.com', 'hhhhhhhhhhhhhhhhhhh', NULL, true, 'e8086e77-de10-4b3e-8643-8669d7f1d6b4_id.png', 'http://127.0.0.1:54321/storage/v1/object/public/guest-ids/e8086e77-de10-4b3e-8643-8669d7f1d6b4_sig.png');


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."guests" ("id", "booking_id", "property_id", "full_name", "email", "id_type", "id_number", "id_photo_url", "signature_url", "address", "created_at") VALUES
	('715a53a4-be94-44d3-83a5-4add55479f17', 'c7555142-4f16-4d16-aab8-6c9030bcff16', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', 'Test RLS User', 'test@example.com', NULL, NULL, 'test.jpg', 'test_sig', NULL, '2026-04-11 13:37:13.097807+00'),
	('1b5f05e8-b347-4506-a3fb-2be2903ade20', 'e353180f-5f1c-488e-aee5-9341438ac21d', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', 'guest1', 'sathish.a@ishitham.com', NULL, NULL, 'test.jpg', 'test_sig', NULL, '2026-04-11 13:57:52.216527+00'),
	('fde7cf80-1d72-468f-96f5-45dc6bae2f12', '2840765c-d519-4eee-a62e-e794763d42e7', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'prasad', 'mango@gmail.com', NULL, NULL, '2840765c-d519-4eee-a62e-e794763d42e7_id.png', 'data:image/png;base64,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', NULL, '2026-04-11 14:29:54.035422+00'),
	('3565ac8f-4b71-45c4-a334-26121164a0e1', '2840765c-d519-4eee-a62e-e794763d42e7', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', 'prasad', 'mango@gmail.com', NULL, NULL, 'server_action_test.jpg', 'server_action_test_sig', NULL, '2026-04-11 14:30:24.531697+00'),
	('81d735c3-9a7f-4221-82d8-b9725ba3b838', 'e8086e77-de10-4b3e-8643-8669d7f1d6b4', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', 'prasad', 'sathish.a@ishitham.com', NULL, NULL, 'e8086e77-de10-4b3e-8643-8669d7f1d6b4_id.png', 'http://127.0.0.1:54321/storage/v1/object/public/guest-ids/e8086e77-de10-4b3e-8643-8669d7f1d6b4_sig.png', NULL, '2026-04-11 14:45:27.098718+00'),
	('460caae9-35c9-47ee-9c84-ce5c9be5453c', 'f5186500-0a15-4c28-be8a-6ea1fefa7e38', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', 'prasad', 'sathish.a@ishitham.com', NULL, NULL, 'f5186500-0a15-4c28-be8a-6ea1fefa7e38_id.png', 'http://127.0.0.1:54321/storage/v1/object/public/guest-ids/f5186500-0a15-4c28-be8a-6ea1fefa7e38_sig.png', NULL, '2026-04-11 14:54:27.25979+00');


--
-- Data for Name: property_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."property_access" ("id", "user_id", "property_id", "created_at") VALUES
	('ce636dae-f360-4fed-9dd5-4014ad81cdaf', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '2026-04-10 06:50:44.627953+00'),
	('30d8f48e-186d-4c6f-815c-5d3d4683e4c3', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '2026-04-11 10:27:29.110177+00'),
	('dde02498-7e1e-4c86-aea8-c2aeaecb2b14', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '63dad7aa-c5f9-4f0e-b21e-b0175397a42c', '2026-04-11 14:34:28.491057+00'),
	('08aaad91-7e40-4836-9c6f-b26f2a97c3b9', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '1ae37320-d72b-4600-9ec3-cf69f28e8c89', '2026-04-11 14:34:28.491057+00');


--
-- Data for Name: role_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."role_templates" ("id", "property_id", "name", "permissions", "created_at") VALUES
	('18445e0d-24be-48fa-a1f0-c64c4424707c', NULL, 'Guest Journey (FO)', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "read", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "write", "refund_folio": "deny", "upgrade_room": "read", "create_booking": "write", "modify_booking": "write", "view_guest_pii": "read", "view_tape_chart": "read", "perform_check_in": "write", "perform_check_out": "write"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "read", "post_minibar_charges": "read", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}', '2026-04-10 06:22:17.043798+00'),
	('1dcf3aa5-2ec6-4cc9-9380-885f2a6f0686', NULL, 'Room Attendant (HK)', '{"finance": {"manage_rates": "deny", "view_analytics": "deny", "run_night_audit": "deny", "view_audit_logs": "deny"}, "inventory": {"view_inventory": "deny", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "deny", "refund_folio": "deny", "upgrade_room": "deny", "create_booking": "deny", "modify_booking": "deny", "view_guest_pii": "deny", "view_tape_chart": "deny", "perform_check_in": "deny", "perform_check_out": "deny"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "write", "view_cleaning_list": "write", "post_minibar_charges": "write", "start_finish_cleaning": "write", "manage_cleaning_boards": "deny"}}', '2026-04-10 06:22:17.043798+00'),
	('c017dfa5-b3ea-4fcb-879e-ea8396cbdb26', NULL, 'Night Auditor', '{"finance": {"manage_rates": "read", "view_analytics": "write", "run_night_audit": "write", "view_audit_logs": "write"}, "inventory": {"view_inventory": "deny", "maintenance_log": "deny", "add_delete_rooms": "deny", "manage_room_types": "deny"}, "management": {"property_settings": "deny", "manage_staff_accounts": "deny"}, "front_office": {"block_rooms": "deny", "guest_notes": "write", "refund_folio": "write", "upgrade_room": "read", "create_booking": "write", "modify_booking": "write", "view_guest_pii": "read", "view_tape_chart": "read", "perform_check_in": "write", "perform_check_out": "write"}, "housekeeping": {"inspect_room": "deny", "mark_room_ready": "deny", "view_cleaning_list": "deny", "post_minibar_charges": "deny", "start_finish_cleaning": "deny", "manage_cleaning_boards": "deny"}}', '2026-04-10 06:22:17.043798+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('guest-ids', 'guest-ids', NULL, '2026-04-10 06:22:17.05461+00', '2026-04-10 06:22:17.05461+00', true, false, NULL, NULL, NULL, 'STANDARD');


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

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('ce5c27c2-679f-452d-9d3b-d9ad34e88e88', 'guest-ids', 'c7555142-4f16-4d16-aab8-6c9030bcff16_id.png', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '2026-04-10 07:25:43.631655+00', '2026-04-10 07:25:43.631655+00', '2026-04-10 07:25:43.631655+00', '{"eTag": "\"54eeca73fda50fde26c04be1451271ad\"", "size": 89386, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-10T07:25:43.626Z", "contentLength": 89386, "httpStatusCode": 200}', '8d8f687b-c6de-4e85-b4ab-9ed1a7f4853c', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{}'),
	('1dc45599-c8e9-43af-a049-42350ee4cfe4', 'guest-ids', 'e353180f-5f1c-488e-aee5-9341438ac21d_id.png', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '2026-04-10 08:50:21.794423+00', '2026-04-10 08:50:21.794423+00', '2026-04-10 08:50:21.794423+00', '{"eTag": "\"54eeca73fda50fde26c04be1451271ad\"", "size": 89386, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-10T08:50:21.788Z", "contentLength": 89386, "httpStatusCode": 200}', 'a52832dd-ccd0-4480-a319-b075101a41c5', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{}'),
	('9818cc3c-ca77-489e-be01-3717ec481470', 'guest-ids', '5ac60367-0643-43d8-b502-b97e8463e4e2_id.png', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '2026-04-10 09:50:24.82715+00', '2026-04-10 09:50:24.82715+00', '2026-04-10 09:50:24.82715+00', '{"eTag": "\"46253c7bda5b2da4cb2bb05a24e08505\"", "size": 61580, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-10T09:50:24.822Z", "contentLength": 61580, "httpStatusCode": 200}', '13cd724a-1c2c-4547-ba03-94d796bb1651', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{}'),
	('961ce1e3-9e4e-49a5-af8a-ab48f29a1018', 'guest-ids', '676d55b5-8695-40f9-ba34-36c558fde99c_id.png', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '2026-04-10 10:39:31.458888+00', '2026-04-10 10:39:31.458888+00', '2026-04-10 10:39:31.458888+00', '{"eTag": "\"46253c7bda5b2da4cb2bb05a24e08505\"", "size": 61580, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-10T10:39:31.453Z", "contentLength": 61580, "httpStatusCode": 200}', 'f0bda659-d0be-4804-a736-da9c270ee09c', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{}'),
	('cc975afc-775b-492f-b8a4-74717e4cb681', 'guest-ids', 'fc3940a7-0f41-4f83-a864-130382eff74e_id.png', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '2026-04-10 13:04:15.439056+00', '2026-04-10 13:04:15.439056+00', '2026-04-10 13:04:15.439056+00', '{"eTag": "\"e12e27cca9ff7262f6d508981d90abc0\"", "size": 61966, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-10T13:04:15.427Z", "contentLength": 61966, "httpStatusCode": 200}', 'a7b92141-c757-4c81-a104-5b38d448e9e2', '11005f89-a3d2-43d0-97fe-dbf1c135675c', '{}'),
	('af871f5a-1d8f-43e4-9ef9-2e5ca3120401', 'guest-ids', 'test_1775915872151.txt', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '2026-04-11 13:57:52.176126+00', '2026-04-11 13:57:52.176126+00', '2026-04-11 13:57:52.176126+00', '{"eTag": "\"6dfee637c11bf2981cfad0a5ffb38bf7\"", "size": 27, "mimetype": "text/plain;charset=UTF-8", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T13:57:52.173Z", "contentLength": 27, "httpStatusCode": 200}', 'f058fac9-9c86-4c06-a45c-c7aeb3fbf172', '89ec58b1-14c9-47c4-a32a-f6a06a94ff7a', '{}'),
	('757e27f2-32bb-4b11-a518-40d3e67fbe0f', 'guest-ids', 'e8086e77-de10-4b3e-8643-8669d7f1d6b4_sig.png', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '2026-04-11 14:45:25.510838+00', '2026-04-11 14:45:25.510838+00', '2026-04-11 14:45:25.510838+00', '{"eTag": "\"dcf94d29acdbbe6b4e64cb77ee6b6a0e\"", "size": 9339, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T14:45:25.509Z", "contentLength": 9339, "httpStatusCode": 200}', '73a2e174-abf7-47b5-9657-f08b43f74f4b', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '{}'),
	('7b41da31-9369-4dde-8ed4-c8a795063af1', 'guest-ids', '2840765c-d519-4eee-a62e-e794763d42e7_id.png', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '2026-04-11 12:46:51.468895+00', '2026-04-11 14:29:36.876492+00', '2026-04-11 12:46:51.468895+00', '{"eTag": "\"e12e27cca9ff7262f6d508981d90abc0\"", "size": 61966, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T14:29:36.868Z", "contentLength": 61966, "httpStatusCode": 200}', 'a469c7b1-3ebc-4b6f-ae91-c905be68b4d1', '57ad2dc0-2a1b-43d5-a654-61290ac36d5a', '{}'),
	('6fdc7a79-559d-4c05-a8b2-e7eb67a2d969', 'guest-ids', 'e8086e77-de10-4b3e-8643-8669d7f1d6b4_id.png', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '2026-04-11 14:45:25.463176+00', '2026-04-11 14:45:25.463176+00', '2026-04-11 14:45:25.463176+00', '{"eTag": "\"e12e27cca9ff7262f6d508981d90abc0\"", "size": 61966, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T14:45:25.459Z", "contentLength": 61966, "httpStatusCode": 200}', '888a86ca-5163-46b3-b360-3309dd4b364d', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '{}'),
	('80737075-237f-437b-bc5b-0b24b6cfa191', 'guest-ids', 'f5186500-0a15-4c28-be8a-6ea1fefa7e38_id.png', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '2026-04-11 14:54:25.382065+00', '2026-04-11 14:54:25.382065+00', '2026-04-11 14:54:25.382065+00', '{"eTag": "\"e12e27cca9ff7262f6d508981d90abc0\"", "size": 61966, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T14:54:25.379Z", "contentLength": 61966, "httpStatusCode": 200}', '7887f33c-d688-48cc-906f-358698e378a3', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '{}'),
	('b0408724-226a-4173-b38a-d2da8436493e', 'guest-ids', 'f5186500-0a15-4c28-be8a-6ea1fefa7e38_sig.png', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '2026-04-11 14:54:25.438409+00', '2026-04-11 14:54:25.438409+00', '2026-04-11 14:54:25.438409+00', '{"eTag": "\"6322ca33ae97cb5b95d7825b2f1e71a4\"", "size": 6452, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-04-11T14:54:25.436Z", "contentLength": 6452, "httpStatusCode": 200}', '4686e87e-6b8d-4263-b63f-5af30f4fc97a', 'bb5cb645-32cb-4222-a10a-24068b0216c8', '{}');


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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 61, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 2ukX7OVHZ0CHMIk3MuZcZl63GVwq1RflvIYgWwqMhMgoUFIKZUcy0GkVWD6a9Uy

RESET ALL;
