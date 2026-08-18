-- Browse Properties / Property Detail Page (MVP-SPEC.md #6, "Public /
-- Marketing") are unauthenticated -- a buyer doesn't need an account until
-- they send an enquiry or submit an OTP. The old buyer_reads_active_listings
-- policy required role = 'buyer', which blocked anonymous requests (no
-- session vars set at all). Replace it with a policy keyed only on the
-- listing's own status, so it covers signed-out visitors and signed-in
-- users of any role alike.
DROP POLICY buyer_reads_active_listings ON listings;

CREATE POLICY public_reads_active_listings ON listings
  FOR SELECT
  USING (status = 'active');
