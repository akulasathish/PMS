SET session_replication_role = replica;

-- Clear old remote business data for this property to avoid duplicate key errors
DELETE FROM public.payments WHERE property_id = '1cca1a14-c967-4ab0-91e0-548ae7fa7e81';
DELETE FROM public.bookings WHERE property_id = '1cca1a14-c967-4ab0-91e0-548ae7fa7e81';
DELETE FROM public.rooms WHERE property_id = '1cca1a14-c967-4ab0-91e0-548ae7fa7e81';
DELETE FROM public.audit_logs WHERE property_id = '1cca1a14-c967-4ab0-91e0-548ae7fa7e81';

-- Insert rooms (Property ID mapped from f160f631-d774-43de-b84a-e0a1b56fe16c to 1cca1a14-c967-4ab0-91e0-548ae7fa7e81)
INSERT INTO "public"."rooms" ("id", "property_id", "room_number", "type", "status", "created_at", "is_deleted", "assigned_staff_id", "cleaning_started_at", "last_cleaned_at") VALUES
	('9ab8de17-8810-42d0-ac4d-b15ead6fb84e', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '404', 'Standard', 'Occupied', '2026-06-21 08:13:26.083049+00', false, NULL, NULL, NULL),
	('a3865c3d-2eae-4d98-9946-1bbc4dca6f1e', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '108', 'Standard', 'Occupied', '2026-06-21 08:32:45.574602+00', false, NULL, NULL, NULL),
	('0812de98-30e5-49bd-a5d6-3562b39e4566', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '402', 'Standard', 'Occupied', '2026-06-21 08:35:42.994622+00', false, NULL, NULL, NULL),
	('244199a2-e1e3-4852-94a5-f3e42b33f3e9', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '405', 'Standard', 'Occupied', '2026-06-21 08:39:11.856071+00', false, NULL, NULL, NULL),
	('2720a9b3-681b-4118-ba7d-c345d0f11035', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '502', 'Standard', 'Available', '2026-06-21 09:08:40.902979+00', false, NULL, NULL, NULL),
	('bca7ba6b-3611-40ff-8f43-ba9cf364a8d6', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '507', 'Standard', 'Available', '2026-06-21 09:09:07.063455+00', false, NULL, NULL, NULL),
	('e25749c0-05bb-45e0-b31d-d46a385dbf90', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '303', 'Standard', 'Available', '2026-06-21 09:09:39.419419+00', false, NULL, NULL, NULL),
	('1f8c6033-f752-4a85-9497-ce5f1b9a1eb7', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '505', 'Standard', 'Available', '2026-06-21 09:09:44.010473+00', false, NULL, NULL, NULL),
	('2b5a4549-5fe7-4dbf-985b-68efd8484798', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '408', 'Standard', 'Occupied', '2026-06-21 09:08:20.386199+00', false, NULL, NULL, NULL);

-- Insert bookings (Property ID mapped)
INSERT INTO "public"."bookings" ("id", "property_id", "room_id", "guest_name", "check_in", "check_out", "amount", "status", "created_at", "guest_email", "notes", "original_room_id", "id_verified", "id_photo_url", "signature_url", "guest_phone", "check_in_time", "check_out_time") VALUES
	('45963290-c87e-4d0f-868e-cc3ec180f1c9', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '9ab8de17-8810-42d0-ac4d-b15ead6fb84e', 'Bhupati', '2026-06-21', '2026-06-22', 1500.00, 'Checked In', '2026-06-21 08:13:39.158956+00', NULL, 'split paymnet ', NULL, false, NULL, NULL, '9553301224', '2026-06-21 08:25:37.01+00', NULL),
	('acc85f60-2a55-4f2f-a7ba-40bfb8691e67', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'a3865c3d-2eae-4d98-9946-1bbc4dca6f1e', 'Mallikarjun', '2026-06-21', '2026-06-22', 1300.00, 'Checked In', '2026-06-21 08:34:05.315815+00', NULL, 'NON AC ROOM ', NULL, false, NULL, NULL, '7386822734', '2026-06-21 08:34:33.866+00', NULL),
	('03448dc7-7825-4763-bf65-cd77fca4712c', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '0812de98-30e5-49bd-a5d6-3562b39e4566', 'P nagalathi', '2026-06-21', '2026-06-22', 2000.00, 'Checked In', '2026-06-21 08:38:05.573324+00', NULL, 'EARLY  CHECKIN ', NULL, false, NULL, NULL, '9346783186', '2026-06-21 08:38:34.311+00', NULL),
	('0492540f-3215-4db6-93c5-6fc5c3df4d38', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '244199a2-e1e3-4852-94a5-f3e42b33f3e9', 'Vijay mohan', '2026-06-21', '2026-06-22', 1700.00, 'Checked In', '2026-06-21 08:42:39.567897+00', NULL, NULL, NULL, false, NULL, NULL, '8686113435', '2026-06-21 08:43:16.291+00', NULL),
	('bf47c233-06ae-4bfb-8471-e14aeed70bd4', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', '2b5a4549-5fe7-4dbf-985b-68efd8484798', 'Rajkumar', '2026-06-21', '2026-06-22', 1500.00, 'Checked In', '2026-06-21 09:10:44.290869+00', NULL, NULL, NULL, false, NULL, NULL, '8686113435', '2026-06-21 09:11:43.238+00', NULL);

-- Insert payments (Property ID mapped, created_by mapped from cdfe60e4-cfd1-4aac-b004-c18e897c9054 to d1d14f75-73d1-4432-8639-0d5a472e9e2c)
INSERT INTO "public"."payments" ("id", "booking_id", "property_id", "amount", "method", "transaction_id", "created_at", "created_by") VALUES
	('6d0f94e8-0172-4e85-808e-9525607ab4a0', '45963290-c87e-4d0f-868e-cc3ec180f1c9', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 1000.00, 'Cash', '3555252', '2026-06-21 08:26:37.148695+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c'),
	('e8a677e0-df62-4b13-9f98-6ec2cd356984', '45963290-c87e-4d0f-868e-cc3ec180f1c9', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 500.00, 'UPI', '3555252', '2026-06-21 08:26:53.190414+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c'),
	('6ce1b22e-0206-405c-8d66-d630894c1bc7', 'acc85f60-2a55-4f2f-a7ba-40bfb8691e67', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 1300.00, 'Cash', NULL, '2026-06-21 08:34:33.854585+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c'),
	('386b777a-30ca-4d62-a740-ebfa4be9c405', '03448dc7-7825-4763-bf65-cd77fca4712c', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 2000.00, 'Cash', NULL, '2026-06-21 08:38:34.263353+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c'),
	('ed170534-48be-406e-b997-605ec3c0520b', '0492540f-3215-4db6-93c5-6fc5c3df4d38', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 1700.00, 'UPI', NULL, '2026-06-21 08:43:16.252135+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c'),
	('c1ebd2c8-89aa-4caf-afb7-0b9418d9ab83', 'bf47c233-06ae-4bfb-8471-e14aeed70bd4', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 1500.00, 'UPI', NULL, '2026-06-21 09:11:43.22622+00', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c');

-- Insert audit logs (Property ID and User ID mapped)
INSERT INTO "public"."audit_logs" ("id", "created_at", "property_id", "user_id", "action", "details", "severity") VALUES
	('efeafac8-c9c3-4ccb-ab81-2aacf1b00b2d', '2026-06-21 08:13:26.191133+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "404"}', 'info'),
	('41a080e5-0451-4b09-bd3d-1ceab8b9dde0', '2026-06-21 08:13:39.196381+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'BOOKING_CREATED', '{"amount": 1500, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "guestName": "Bhupati"}', 'info'),
	('b9bce9d9-2840-4362-a8cf-ddf78f7cf775', '2026-06-21 08:25:37.079952+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'GUEST_CHECK_IN', '{"bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "guestName": "Bhupati", "paymentRecorded": false}', 'info'),
	('db5516f9-c80e-4838-b1ac-7eb00da2ba29', '2026-06-21 08:26:37.201796+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'PAYMENT_RECEIVED', '{"amount": 1000, "method": "Cash", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "paymentId": "6d0f94e8-0172-4e85-808e-9525607ab4a0", "transactionId": "3555252"}', 'info'),
	('224cd9ab-127b-40c0-bed1-d412586e9a2e', '2026-06-21 08:26:53.222887+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'PAYMENT_RECEIVED', '{"amount": 500, "method": "UPI", "bookingId": "45963290-c87e-4d0f-868e-cc3ec180f1c9", "paymentId": "e8a677e0-df62-4b13-9f98-6ec2cd356984", "transactionId": "3555252"}', 'info'),
	('739b6f10-891d-457d-abb7-75126e482da5', '2026-06-21 08:32:45.651639+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "108"}', 'info'),
	('72549e58-0cf0-442a-8708-0b27032c690c', '2026-06-21 08:34:05.355953+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'BOOKING_CREATED', '{"amount": 1300, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "acc85f60-2a55-4f2f-a7ba-40bfb8691e67", "guestName": "Mallikarjun"}', 'info'),
	('38660c5a-38d6-4ffe-948c-cf1c3c123a01', '2026-06-21 08:34:33.917688+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'GUEST_CHECK_IN', '{"bookingId": "acc85f60-2a55-4f2f-a7ba-40bfb8691e67", "guestName": "Mallikarjun", "paymentAmount": 1300, "paymentMethod": "Cash", "paymentRecorded": true}', 'info'),
	('f1f87a80-141f-40b8-b0d7-7103fcaa6ca3', '2026-06-21 08:35:43.126822+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "402"}', 'info'),
	('c0b96618-db83-4d03-9a65-aa24f668809a', '2026-06-21 08:38:05.643445+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'BOOKING_CREATED', '{"amount": 2000, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "03448dc7-7825-4763-bf65-cd77fca4712c", "guestName": "P nagalathi"}', 'info'),
	('b6e41b20-1f71-423e-a2bf-3e10dc0008ec', '2026-06-21 08:38:34.351444+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'GUEST_CHECK_IN', '{"bookingId": "03448dc7-7825-4763-bf65-cd77fca4712c", "guestName": "P nagalathi", "paymentAmount": 2000, "paymentMethod": "Cash", "paymentRecorded": true}', 'info'),
	('1a80e1fa-bfe2-429c-874a-b2f59cd0d990', '2026-06-21 08:39:12.003281+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "405"}', 'info'),
	('87dee862-06cb-4cf6-9bcb-496b4c57eed0', '2026-06-21 08:42:39.603339+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'BOOKING_CREATED', '{"amount": 1700, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "0492540f-3215-4db6-93c5-6fc5c3df4d38", "guestName": "Vijay mohan"}', 'info'),
	('fdbbc3e7-65b9-46fc-aead-4f76c238fac4', '2026-06-21 08:43:16.33161+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'GUEST_CHECK_IN', '{"bookingId": "0492540f-3215-4db6-93c5-6fc5c3df4d38", "guestName": "Vijay mohan", "paymentAmount": 1700, "paymentMethod": "UPI", "paymentRecorded": true}', 'info'),
	('ca22e464-bf80-4f50-96cc-1aa2078fb62a', '2026-06-21 09:08:20.502723+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "408"}', 'info'),
	('dff11a22-1758-4952-a1cd-26cb9ad5c571', '2026-06-21 09:08:41.028877+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "502"}', 'info'),
	('7cb51537-f98e-425a-96a3-c557a2ff4ce2', '2026-06-21 09:09:07.225502+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "507"}', 'info'),
	('623d7dd3-9eb1-4488-8c70-0cf06fdbd8a2', '2026-06-21 09:09:39.538585+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "303"}', 'info'),
	('35ac3bdf-26ff-4bb8-9c0b-38ab3c9ab8cd', '2026-06-21 09:09:44.129555+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'ROOM_CREATED', '{"roomType": "Standard", "roomNumber": "505"}', 'info'),
	('16db136d-b2eb-45f9-918e-97c949db9162', '2026-06-21 09:10:44.351415+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'BOOKING_CREATED', '{"amount": 1500, "checkIn": "2026-06-21", "checkOut": "2026-06-22", "bookingId": "bf47c233-06ae-4bfb-8471-e14aeed70bd4", "guestName": "Rajkumar"}', 'info'),
	('9fff65b3-187e-48d2-b9a2-95ba0fcc4df6', '2026-06-21 09:11:43.262274+00', '1cca1a14-c967-4ab0-91e0-548ae7fa7e81', 'd1d14f75-73d1-4432-8639-0d5a472e9e2c', 'GUEST_CHECK_IN', '{"bookingId": "bf47c233-06ae-4bfb-8471-e14aeed70bd4", "guestName": "Rajkumar", "paymentAmount": 1500, "paymentMethod": "UPI", "paymentRecorded": true}', 'info');

-- Force a schema reload on PostgREST so the frontend/API picks it up instantly
NOTIFY pgrst, 'reload schema';
