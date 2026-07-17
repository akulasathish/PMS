      SELECT auth.admin.update_user_by_id(
             'adc50cf6-d22a-4cbe-8ddd-306b2d1cfe46',  -- The UID of adminuser@pms.com
             '8686113435',                          -- The new password
            'adminuser@pms.com',                   -- The email
             NULL,                                  -- Phone (NULL as not used)
             NULL,                                  -- email_change_token_new
             NULL,                                  -- email_change_sent_at
            NULL,                                  -- app_metadata (NULL as not modifying)
             '{"role": "admin", "email_verified": true}'::jsonb, -- raw_user_meta_data
            TRUE                                   -- email_confirm (ensure confirmed)
       );
  