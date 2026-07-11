# Developer Guide

This document is the working guide for developers who need to maintain or extend this backend. It focuses on how the project is structured today, which parts are protected or opinionated, and how to make changes safely.

## Stack

- NestJS backend
- Prisma with PostgreSQL
- Redis for caching, sessions, and locks
- BullMQ for queued work
- Brevo/SMTP mail providers behind a common mail abstraction
- Square for booking, availability, and payments

## High-Level Structure

- `src/modules/admin`
  - Admin-only management APIs.
  - Examples: roles, team management, sections, email management.
- `src/modules/application`
  - Public or application-facing APIs.
  - Examples: booking, public pages, testimonials, FAQ, gallery.
- `src/mail`
  - Central mail abstraction, template rendering, queue processor, and provider strategy.
- `src/common`
  - Shared helpers, middleware, validators, repository classes, and Redis key helpers.
- `prisma`
  - Prisma schema, migrations, and seed script.

## Module Reference

This section explains what each major module is responsible for and what to check before changing it.

### `src/modules/admin`

This area contains authenticated back-office APIs used by staff, managers, or administrators.

#### `activity-log`

- Tracks important admin and system actions.
- Used to keep auditable history for sensitive operations.
- If you add important create/update/delete flows, consider whether they should emit activity logs.

#### `campaign`

- Manages campaign metadata, lead groups, orchestration, and webhook-related email flow.
- Tightly related to provider-side email campaign behavior.
- Changes here often affect email logs, campaign status, and lead grouping.

#### `email-management`

- Manual/admin-triggered email sending area.
- Uses provider abstraction similar to the mail module pattern.
- If you change provider contracts, keep this area aligned with the central mail architecture.

#### `faq`

- Admin CRUD for FAQ content.
- Public FAQ consumption depends on `is_active` behavior, so admin changes should preserve publish/unpublish semantics.

#### `gallery`

- Admin CRUD for gallery images and metadata.
- Tied to file storage behavior and public media URL generation.
- File replacement and deletion must keep storage and DB in sync.

#### `lead`

- One of the most stateful modules in the system.
- Manages lead lifecycle, assignments, notes, exports/imports, filters, and timeline entries.
- Often touches stages, assignment history, reporting, and campaign grouping.
- Changes here should be reviewed carefully because reporting and booking follow-up logic may depend on lead state conventions.

#### `news-and-events`

- Admin CRUD for news/events content and category-like behavior.
- Uses storage for uploaded images.
- Public module consumes this content, so publishing logic must stay consistent.

#### `notification`

- Notification feed and pagination behavior.
- Good reference for offset and cursor pagination patterns used elsewhere in the codebase.

#### `payment-transaction`

- Administrative transaction/report-style access around payment records.
- Closely related to booking payment writes and reporting queries.

#### `report`

- Aggregated read/reporting logic across leads, campaigns, payments, and activities.
- When changing source entity fields, check reports to avoid silent breakage.

#### `role`

- Manages dynamic roles and permission mappings.
- Also maintains Redis role-permission cache.
- Protected `Super User` role rules are enforced here.
- Any new role mutation flow should preserve cache correctness.

#### `sections`

- Admin management for dynamic website sections and section media files.
- Supports paginated listing, snake_case DTO payloads, multiple image uploads, and media CRUD.
- Public page rendering depends on section key naming and `is_active` state.

#### `stage`

- Manages lead stages and visual metadata such as colors and icons.
- Used by leads, reporting, and booking follow-up state updates.

#### `team`

- Manages internal members, roles, and block/unblock behavior.
- Invalidates sessions and refresh tokens after security-sensitive changes.
- Super user protections are enforced here.

#### `template`

- Stores reusable email or content templates.
- Has indirect coupling with campaign/email sending features.

#### `testimonial`

- Admin CRUD for testimonial content and avatars.
- Public consumption depends on active/publish behavior.

#### `website-info`

- Stores core website/business identity fields such as contact info, logo, and policy text.
- Booking flow reads from this module for business-facing booking info.

### `src/modules/application`

This area contains frontend-facing or public consumption APIs.

#### `booking`

- Integrates with Square for services, availability, locks, booking creation, payments, rescheduling, and cancellation.
- One of the most sensitive modules because it spans external APIs, Redis locks, DB side effects, emails, and payment records.
- Cart summary and payment confirmation must stay consistent on subtotal/tax/total behavior.

#### `faq`

- Public read-only FAQ delivery.
- Only active content should be exposed.

#### `gallery`

- Public gallery delivery.
- Depends on admin gallery storage and URL conversion conventions.

#### `news-and-events`

- Public delivery of news/event content.
- Relies on admin publishing and image handling.

#### `pages`

- Public dynamic page section delivery.
- Fetches active sections only.
- Uses section key naming conventions like `home_*` and sorts by `sort_order`.

#### `quote`

- Application-facing quote behavior.
- Check for lead or booking relationships before modifying DTOs or persistence behavior.

#### `testimonial`

- Public testimonial delivery.
- Should remain aligned with admin publish/visibility fields.

### `src/mail`

This area is the centralized mail delivery system and should be treated as infrastructure, not feature-only code.

#### `mail.service.ts`

- Public entry point used by modules that want to send mail.
- Queues jobs only; it should not directly know provider implementation details.

#### `processors/mail.processor.ts`

- Runs queue jobs.
- Renders templates and dispatches the final HTML through the selected provider.
- If mail sending breaks globally, this is one of the first places to inspect.

#### `providers`

- Concrete outbound mail transports.
- Current implementations include Brevo and SMTP.
- New providers should implement the same contract instead of introducing special cases elsewhere.

#### `template-renderer.service.ts`

- Provider-agnostic EJS renderer.
- Keeps templating separate from transport logic.

#### `templates`

- EJS templates used by queued jobs.
- If you rename a template file, update all job producers that reference it.

### `src/common`

This area contains shared infrastructure and reusable building blocks.

#### `analytics`

- Tracking and deduplication logic, including Redis-backed behavior.

#### `constants`

- Shared constants used across modules.
- Includes protected system role names.

#### `decorator`

- Shared decorators for extracting request metadata or defining behavior.

#### `exception`

- Shared exception patterns if introduced.

#### `guard`

- Shared guards not scoped to a single business module.

#### `helper`

- Common helper utilities such as string/date formatting.
- Used broadly across services.

#### `interceptors`

- Shared response or request processing behavior.
- Important for keeping API response format consistent.

#### `lib`

- Lower-level adapters/utilities such as storage abstraction.
- File upload flows depend heavily on this area.

#### `middleware`

- Cross-cutting request middleware such as logging and auth gates.

#### `pipe`

- Shared request transformation/validation behavior.

#### `redis`

- Centralized Redis key builder and Redis-related shared utilities.
- All new Redis keys should be standardized here.

#### `repository`

- Repository wrappers around Prisma queries for common entity logic.
- Auth and user flows use this heavily.

#### `validators`

- Shared validators for DTOs and decorators.

### `prisma`

This area is the persistence contract of the project.

#### `schema.prisma`

- Defines database models and field naming.
- Changes here often cascade into DTOs, services, Redis cache content, and seed behavior.

#### `migrations`

- Historical schema changes.
- Keep migrations additive and explicit.

#### `seed.ts`

- Seeds and reconciles permissions, role mappings, and selected bootstrap users.
- Permission seed is now state-reconciling, not append-only.

## Core Conventions

### Database naming

- Prisma models introduced recently use snake_case database fields where possible.
- Examples:
  - `Section.section_key`
  - `Section.section_type`
  - `Section.is_active`
  - `MediaFile.mime_type`
  - `MediaFile.created_at`
- New IDs should prefer `cuid()` unless there is an explicit reason to do otherwise.

### DTO naming

- New request DTOs should follow the API contract expected by frontend consumers.
- For section management, DTO payload fields were intentionally moved to snake_case.
- Match existing endpoint style instead of inventing a second shape.

### Redis keys

- Do not hardcode Redis keys in new code.
- Use the centralized helper:
  - `src/common/redis/redis-keys.ts`
- Existing standardized keys include:
  - role permission cache
  - refresh tokens
  - blacklisted sessions
  - booking locks

### Role and permission cache

- Role permissions are cached in Redis by role name.
- Cache key generation must use `RedisKeys.rolePermissions(roleName)`.
- When changing role permissions or role names, update Redis in the same flow.
- If permission cache is missing, `PermissionGuard` now falls back to the database and repopulates Redis.

## Authentication and Authorization

### Permission model

- Permissions follow the `resource:action` format.
- Standard action mapping is based on HTTP method in `PermissionGuard`.
- Decorator usage supports either:
  - a full permission string like `staff:invite`
  - a resource name like `role`, where the action is derived from the HTTP method

### Permission resolution flow

- Guard reads user roles from JWT/session context.
- Guard tries Redis first for permission arrays.
- If Redis misses, it fetches role permissions from PostgreSQL and writes them back to Redis.

Relevant files:

- `src/modules/auth/guards/permission.guard.ts`
- `src/common/redis/redis-keys.ts`

## Super User System

The system now supports a protected super user account and a protected `Super User` role.

### Environment variables

The super user is provisioned from `.env` via:

- `SUPERUSER_NAME`
- `SUPERUSER_EMAIL`
- `SUPERUSER_PASSWORD`

These are read from:

- `src/config/app.config.ts`

### Bootstrap behavior

On auth module initialization:

- the `Admin` role is ensured
- the `Super User` role is ensured
- the `Super User` role is synced to all permissions in the database
- the configured super user account is upserted by email
- the super user is attached to `Super User`
- the super user is also attached to `Admin` for compatibility with older checks
- the `Super User` permission cache is refreshed in Redis

Relevant file:

- `src/modules/auth/auth.service.ts`

### Protected behavior

The super user account must not be blocked or altered through standard admin flows.

The following protections are already in place:

- team service blocks role changes for the configured super user email
- team service blocks block/unblock actions for that account
- role service prevents updating the `Super User` role
- role service prevents deleting the `Super User` role

Relevant files:

- `src/modules/admin/team/team.service.ts`
- `src/modules/admin/role/role.service.ts`
- `src/common/constants/system-roles.ts`

### Rule for future work

If you add new admin flows that can disable, delete, reassign, or reset users or roles, explicitly check whether the target is the configured super user or the protected `Super User` role.

## Roles, Permissions, and Seed Behavior

### Seed is now source-of-truth, not append-only

The permission seed flow was changed to reconcile state.

What that means:

- if a permission exists in DB but is removed from the seed constants, the next seed run removes it from DB
- role-permission mappings for seeded roles are rebuilt from the current seed result
- Redis role caches are cleared and rebuilt during seeding

Relevant file:

- `prisma/seed.ts`

### Important implication

Do not add permission rows manually in production or staging and expect them to survive if the seeder owns that permission namespace. Add them to the seed constants first.

### Seeded role cache behavior

Seeder currently refreshes Redis permission caches for the seeded roles after reconciliation.

## Mail System

The mail module was refactored to support provider switching without changing template logic.

### Current design

- `MailService` queues jobs only
- `MailProcessor` consumes queue jobs
- `TemplateRendererService` renders EJS to HTML
- provider strategy sends the rendered HTML through the active provider

### Supported providers

- Brevo
- SMTP

### Provider selection

Configured with:

- `MAIL_PROVIDER=brevo`
- `MAIL_PROVIDER=smtp`

Relevant files:

- `src/mail/mail.module.ts`
- `src/mail/mail.service.ts`
- `src/mail/processors/mail.processor.ts`
- `src/mail/template-renderer.service.ts`
- `src/mail/providers/brevo-mail.provider.ts`
- `src/mail/providers/smtp-mail.provider.ts`

### Template behavior

- Templates live under `src/mail/templates`
- Renderer checks built `dist` output first, then falls back to `src`
- EJS templates are provider-agnostic now

### Rule for future work

If you add a new provider, implement the common provider interface and register it in `MailModule`. Do not couple templates to provider-specific payload shapes.

## Dynamic Section Management

Dynamic website sections are split across two module areas.

### Admin side

- manages create, update, delete, and listing of sections
- manages media uploads for sections
- section DTOs use snake_case payload fields

Relevant area:

- `src/modules/admin/sections`

### Application side

- exposes public page section payloads
- only returns active sections
- page fetch sorts by `sort_order`

Relevant area:

- `src/modules/application/pages`

### Media file behavior

- media uploads support multiple images
- list endpoint is paginated
- update can replace file content and/or metadata
- delete removes both the DB row and the stored file

## Booking Flow Notes

Square booking logic has several important behaviors that should not be broken casually.

### Cart summary

- `getCartSummary` now includes:
  - item summary
  - tax lines
  - subtotal
  - tax total
  - final total
  - total duration

### Payment confirmation

- booking confirmation now includes taxes in the charge amount
- payment total is computed from Square order calculation, not only item base prices

### Locking

- booking slots are locked in Redis with a TTL
- the lock key is centralized in Redis key helpers
- lock ownership is verified before confirmation or release

Relevant file:

- `src/modules/application/booking/squareup-booking.service.ts`

### Rule for future work

If you change price, taxes, or booking confirmation logic, update both cart summary and payment confirmation flow together. Do not let frontend totals drift from backend charge totals.

## Team Management Rules

Team/member operations are security-sensitive.

Current behavior includes:

- changing a user role invalidates sessions and refresh tokens
- blocking a user invalidates sessions and refresh tokens
- super user account cannot be blocked or have roles changed from team service

Relevant file:

- `src/modules/admin/team/team.service.ts`

## Role Management Rules

Role management is also tied to Redis permission cache.

Current behavior includes:

- creating a role writes its permission cache
- updating a role rewrites cache and removes old cache if role name changed
- deleting a role removes its cache entry
- protected `Super User` role cannot be edited or deleted

Relevant file:

- `src/modules/admin/role/role.service.ts`

## Environment Variables You Should Know

Not exhaustive, but high-value variables include:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_REFRESH_TOKEN_SECRET`
- `JWT_ACCESS_TOKEN_EXPIRY`
- `JWT_REFRESH_TOKEN_EXPIRY`
- `MAIL_PROVIDER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM_ADDRESS`
- `MAIL_SENDER_NAME`
- `MAIL_SENDER_EMAIL`
- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`
- `SUPERUSER_NAME`
- `SUPERUSER_EMAIL`
- `SUPERUSER_PASSWORD`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT`

## Safe Change Workflow

When changing anything substantial, follow this order:

1. Check whether Redis cache, DB state, and queue behavior are affected.
2. Check whether there is an admin module and an application module that both need changes.
3. Check whether seed logic also needs to change.
4. Check whether protected roles or super user behavior needs special handling.
5. Run a focused validation command.

Recommended commands:

- `yarn build`
- `yarn db:seed`
- `npx prisma generate`
- `npx prisma migrate dev`

## Common Mistakes To Avoid

- Do not hardcode Redis keys in new code.
- Do not add permission rows manually and forget to reflect them in the seed constants.
- Do not bypass the mail provider abstraction by calling Brevo directly from unrelated modules.
- Do not change section DTO field shape without checking admin consumers.
- Do not change booking total logic in one place only.
- Do not allow destructive actions against the super user or `Super User` role.
- Do not rename protected roles casually without updating constants and bootstrap logic.

## Suggested Future Cleanup

These are not required for current behavior, but they are sensible follow-up improvements:

- migrate remaining hardcoded Redis keys in older modules to `RedisKeys`
- extract super-user protection into a shared helper/service instead of repeating checks
- add tests around super-user bootstrap and protected-role restrictions
- add tests around seed reconciliation and permission cache refresh
- add tests around booking tax totals and Square confirmation flows

## Final Rule

Treat this codebase as a stateful system, not only a set of controllers and services. Many features here touch multiple layers at once:

- Prisma schema and seed
- Redis cache
- queue processing
- protected authorization flows
- external providers like Square and Brevo

If you change one of those layers, check the others before you merge.