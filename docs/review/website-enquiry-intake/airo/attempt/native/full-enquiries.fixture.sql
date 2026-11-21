-- Local synthetic fixture translated from supplied Drizzle schema.
-- Source SHA256 4b2a8bc7208fc95665378fddcf8fb63db3b6299240c4125c90e61aa7987bd88c
-- InnoDB/utf8mb4 are explicit fixture choices; live engine/collation remains unverified.
CREATE TABLE enquiries (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `submission_id` VARCHAR(36) NOT NULL UNIQUE,
  `submitted_at` VARCHAR(30) NOT NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `contact_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40),
  `meter_numbers` VARCHAR(255),
  `current_supplier` VARCHAR(255),
  `message` VARCHAR(2000),
  `sms_consent` VARCHAR(3),
  `utm_source` VARCHAR(255),
  `utm_medium` VARCHAR(255),
  `utm_campaign` VARCHAR(255),
  `utm_content` VARCHAR(255),
  `utm_term` VARCHAR(255),
  `gclid` VARCHAR(255),
  `fbclid` VARCHAR(255),
  `source_page` VARCHAR(255),
  `owner_email_status` VARCHAR(10) NOT NULL DEFAULT 'pending',
  `visitor_email_status` VARCHAR(10) NOT NULL DEFAULT 'pending',
  `crm_status` VARCHAR(10) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_enq_submission_id (submission_id),
  KEY idx_enq_crm_status (crm_status),
  KEY idx_enq_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
