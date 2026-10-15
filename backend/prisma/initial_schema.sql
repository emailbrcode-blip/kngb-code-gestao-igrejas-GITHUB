-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ChurchStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('active', 'inactive', 'visitor', 'transferred', 'away');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "EcclesiasticalRoleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'unavailable', 'partial');

-- CreateEnum
CREATE TYPE "ScheduleAssignmentStatus" AS ENUM ('pending', 'called', 'confirmed', 'declined', 'substituted');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('scheduled', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('normal', 'important', 'urgent');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('all', 'members', 'workers', 'leadership');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('schedule_new', 'schedule_updated', 'event', 'announcement', 'system', 'donation', 'campaign', 'worship', 'ministry', 'volunteer', 'meeting', 'birthday', 'visitor', 'prayer_request', 'other');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('pending', 'paid');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('registered', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "churches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ChurchStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "public_site_enabled" BOOLEAN NOT NULL DEFAULT false,
    "public_description" TEXT,
    "public_address" TEXT,
    "public_phone" TEXT,
    "public_email" TEXT,
    "public_service_times" TEXT,
    "public_history" TEXT,
    "public_mission" TEXT,
    "public_vision" TEXT,
    "public_values" TEXT,
    "public_whatsapp" TEXT,
    "public_instagram" TEXT,
    "public_facebook" TEXT,
    "public_youtube" TEXT,
    "public_pix_key" TEXT,
    "public_pix_instructions" TEXT,
    "public_extras" JSONB,

    CONSTRAINT "churches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "church_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "church_id" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "user_id" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "birth_date" TIMESTAMP(3),
    "address" TEXT,
    "join_date" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "ministry" TEXT,
    "group_name" TEXT,
    "notes" TEXT,
    "photo_url" TEXT,
    "exit_date" TIMESTAMP(3),
    "rma_number" INTEGER NOT NULL DEFAULT nextval('rma_number_seq'::regclass),
    "responsible_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecclesiastical_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "EcclesiasticalRoleStatus" NOT NULL DEFAULT 'active',
    "church_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecclesiastical_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_ecclesiastical_roles" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "ecclesiastical_role_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_ecclesiastical_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_functions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "church_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "photo_url" TEXT,
    "ministry" TEXT,
    "function_id" TEXT,
    "join_date" TIMESTAMP(3),
    "status" "WorkerStatus" NOT NULL DEFAULT 'active',
    "rma_number" INTEGER NOT NULL DEFAULT nextval('rma_number_seq'::regclass),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "start_time" TEXT,
    "end_time" TEXT,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "notes" TEXT,
    "changed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "function_id" TEXT,
    "status" "ScheduleAssignmentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "location" TEXT,
    "responsible" TEXT,
    "capacity" INTEGER,
    "image_url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'scheduled',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'normal',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'all',
    "author_id" TEXT,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "church_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "category_id" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'paid',
    "payment_method" TEXT,
    "notes" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_type" TEXT,
    "related_id" TEXT,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worships" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "type" TEXT NOT NULL,
    "theme" TEXT,
    "attendance_count" INTEGER,
    "notes" TEXT,
    "schedule_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sermons" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "worship_id" TEXT NOT NULL,
    "preacher_worker_id" TEXT,
    "preacher_name" TEXT,
    "title" TEXT,
    "scripture" TEXT,
    "theme" TEXT,
    "summary" TEXT,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worship_songs" (
    "id" TEXT NOT NULL,
    "worship_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worship_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_campaigns" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'campanha',
    "goal_amount" DECIMAL(12,2),
    "goal_quantity" DECIMAL(12,3),
    "quantity_unit" TEXT,
    "image_url" TEXT,
    "responsible_name" TEXT,
    "responsible_id" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "item_id" TEXT,
    "donor_member_id" TEXT,
    "donor_name" TEXT,
    "donor_user_id" TEXT,
    "amount" DECIMAL(12,2),
    "kind" TEXT NOT NULL DEFAULT 'money',
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "estimated_amount" DECIMAL(12,2),
    "service_description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "payment_method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_items" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_amount" DECIMAL(12,2),
    "target_quantity" DECIMAL(12,3),
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_status_history" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "from_status" "DonationStatus",
    "to_status" "DonationStatus" NOT NULL,
    "amount" DECIMAL(12,2),
    "quantity" DECIMAL(12,3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_expenses" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_finance_transfers" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "financial_entry_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_finance_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "automatic" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministries" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leader_id" TEXT,
    "image_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ministries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_streams" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "live" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "worship_id" TEXT,
    "schedule_id" TEXT,
    "event_id" TEXT,
    "how_found" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "companions" TEXT,
    "may_contact" BOOLEAN NOT NULL DEFAULT false,
    "interest" TEXT,
    "follow_up_needed" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_requests" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "small_groups" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leader_id" TEXT,
    "location" TEXT,
    "meeting_schedule" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "small_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletins" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulletins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_cards" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "member_id" TEXT,
    "worker_id" TEXT,
    "code" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue_count" INTEGER NOT NULL DEFAULT 1,
    "issued_by_id" TEXT,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "id_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "churches_slug_key" ON "churches"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_church_id_idx" ON "users"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "roles_church_id_idx" ON "roles"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "audit_logs_church_id_idx" ON "audit_logs"("church_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_church_created_idx" ON "audit_logs"("church_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_rma_number_key" ON "members"("rma_number");

-- CreateIndex
CREATE INDEX "members_church_id_idx" ON "members"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "ecclesiastical_roles_slug_key" ON "ecclesiastical_roles"("slug");

-- CreateIndex
CREATE INDEX "ecclesiastical_roles_church_id_idx" ON "ecclesiastical_roles"("church_id");

-- CreateIndex
CREATE INDEX "member_ecclesiastical_roles_member_id_idx" ON "member_ecclesiastical_roles"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_functions_slug_key" ON "worker_functions"("slug");

-- CreateIndex
CREATE INDEX "worker_functions_church_id_idx" ON "worker_functions"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workers_rma_number_key" ON "workers"("rma_number");

-- CreateIndex
CREATE INDEX "workers_church_id_idx" ON "workers"("church_id");

-- CreateIndex
CREATE INDEX "availability_worker_id_day_of_week_idx" ON "availability"("worker_id", "day_of_week");

-- CreateIndex
CREATE INDEX "availability_exceptions_church_id_worker_id_date_idx" ON "availability_exceptions"("church_id", "worker_id", "date");

-- CreateIndex
CREATE INDEX "schedules_church_id_idx" ON "schedules"("church_id");

-- CreateIndex
CREATE INDEX "schedules_date_idx" ON "schedules"("date");

-- CreateIndex
CREATE INDEX "schedule_assignments_worker_id_idx" ON "schedule_assignments"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_assignments_schedule_id_worker_id_key" ON "schedule_assignments"("schedule_id", "worker_id");

-- CreateIndex
CREATE INDEX "events_church_id_idx" ON "events"("church_id");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "announcements_church_id_idx" ON "announcements"("church_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_slug_key" ON "financial_categories"("slug");

-- CreateIndex
CREATE INDEX "financial_categories_church_id_idx" ON "financial_categories"("church_id");

-- CreateIndex
CREATE INDEX "financial_entries_church_id_idx" ON "financial_entries"("church_id");

-- CreateIndex
CREATE INDEX "financial_entries_date_idx" ON "financial_entries"("date");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_church_id_idx" ON "notifications"("church_id");

-- CreateIndex
CREATE INDEX "notifications_user_created_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "worships_schedule_id_key" ON "worships"("schedule_id");

-- CreateIndex
CREATE INDEX "worships_church_id_idx" ON "worships"("church_id");

-- CreateIndex
CREATE INDEX "worships_date_idx" ON "worships"("date");

-- CreateIndex
CREATE UNIQUE INDEX "sermons_worship_id_key" ON "sermons"("worship_id");

-- CreateIndex
CREATE INDEX "sermons_church_id_idx" ON "sermons"("church_id");

-- CreateIndex
CREATE INDEX "worship_songs_worship_id_idx" ON "worship_songs"("worship_id");

-- CreateIndex
CREATE INDEX "donation_campaigns_church_id_idx" ON "donation_campaigns"("church_id");

-- CreateIndex
CREATE INDEX "donations_church_id_idx" ON "donations"("church_id");

-- CreateIndex
CREATE INDEX "donations_campaign_id_idx" ON "donations"("campaign_id");

-- CreateIndex
CREATE INDEX "donations_date_idx" ON "donations"("date");

-- CreateIndex
CREATE INDEX "donation_items_church_id_campaign_id_idx" ON "donation_items"("church_id", "campaign_id");

-- CreateIndex
CREATE INDEX "donation_status_history_church_id_donation_id_idx" ON "donation_status_history"("church_id", "donation_id");

-- CreateIndex
CREATE INDEX "campaign_expenses_church_id_campaign_id_date_idx" ON "campaign_expenses"("church_id", "campaign_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_finance_transfers_financial_entry_id_key" ON "campaign_finance_transfers"("financial_entry_id");

-- CreateIndex
CREATE INDEX "campaign_finance_transfers_church_id_campaign_id_idx" ON "campaign_finance_transfers"("church_id", "campaign_id");

-- CreateIndex
CREATE INDEX "reminder_logs_church_id_source_type_source_id_sent_at_idx" ON "reminder_logs"("church_id", "source_type", "source_id", "sent_at");

-- CreateIndex
CREATE INDEX "ministries_church_id_active_idx" ON "ministries"("church_id", "active");

-- CreateIndex
CREATE INDEX "media_items_church_id_published_published_at_idx" ON "media_items"("church_id", "published", "published_at");

-- CreateIndex
CREATE INDEX "live_streams_church_id_live_idx" ON "live_streams"("church_id", "live");

-- CreateIndex
CREATE INDEX "visitors_church_id_visited_at_idx" ON "visitors"("church_id", "visited_at");

-- CreateIndex
CREATE INDEX "visitors_church_id_schedule_id_visited_at_idx" ON "visitors"("church_id", "schedule_id", "visited_at");

-- CreateIndex
CREATE INDEX "visitors_church_id_event_id_visited_at_idx" ON "visitors"("church_id", "event_id", "visited_at");

-- CreateIndex
CREATE INDEX "visitors_worship_id_idx" ON "visitors"("worship_id");

-- CreateIndex
CREATE INDEX "prayer_requests_church_id_status_created_at_idx" ON "prayer_requests"("church_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "small_groups_church_id_active_idx" ON "small_groups"("church_id", "active");

-- CreateIndex
CREATE INDEX "bulletins_church_id_published_published_at_idx" ON "bulletins"("church_id", "published", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "id_cards_member_id_key" ON "id_cards"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "id_cards_worker_id_key" ON "id_cards"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "id_cards_code_key" ON "id_cards"("code");

-- CreateIndex
CREATE INDEX "id_cards_church_id_idx" ON "id_cards"("church_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecclesiastical_roles" ADD CONSTRAINT "ecclesiastical_roles_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_ecclesiastical_roles" ADD CONSTRAINT "member_ecclesiastical_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_ecclesiastical_roles" ADD CONSTRAINT "member_ecclesiastical_roles_ecclesiastical_role_id_fkey" FOREIGN KEY ("ecclesiastical_role_id") REFERENCES "ecclesiastical_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_functions" ADD CONSTRAINT "worker_functions_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "worker_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "worker_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worships" ADD CONSTRAINT "worships_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worships" ADD CONSTRAINT "worships_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_worship_id_fkey" FOREIGN KEY ("worship_id") REFERENCES "worships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_preacher_worker_id_fkey" FOREIGN KEY ("preacher_worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worship_songs" ADD CONSTRAINT "worship_songs_worship_id_fkey" FOREIGN KEY ("worship_id") REFERENCES "worships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "donation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_member_id_fkey" FOREIGN KEY ("donor_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_user_id_fkey" FOREIGN KEY ("donor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_status_history" ADD CONSTRAINT "donation_status_history_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_status_history" ADD CONSTRAINT "donation_status_history_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_status_history" ADD CONSTRAINT "donation_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_expenses" ADD CONSTRAINT "campaign_expenses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_finance_transfers" ADD CONSTRAINT "campaign_finance_transfers_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_finance_transfers" ADD CONSTRAINT "campaign_finance_transfers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_finance_transfers" ADD CONSTRAINT "campaign_finance_transfers_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "financial_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_worship_id_fkey" FOREIGN KEY ("worship_id") REFERENCES "worships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_cards" ADD CONSTRAINT "id_cards_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_cards" ADD CONSTRAINT "id_cards_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
