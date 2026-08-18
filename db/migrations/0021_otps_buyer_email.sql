-- Issue #13 (notifications): "seller responds to your offer" needs a
-- buyer email to send to. otps didn't store one before this -- buyer_contact
-- (issue #7) is a phone number ("Contact Number" in the OTP Builder form),
-- and docusign.js's envelope route (issue #10) worked around the gap by
-- requiring buyerEmail in its own request body instead of the database.
-- This is the real fix: store it once at OTP submission time so every
-- later step (notifications, e-signature) can read it from one place.
ALTER TABLE otps ADD COLUMN buyer_email text NOT NULL DEFAULT '';
ALTER TABLE otps ALTER COLUMN buyer_email DROP DEFAULT;
