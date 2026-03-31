import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'user');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_characters_status" AS ENUM('in-service', 'kia', 'mia', 'retired', 'honourable-discharge', 'dishonourable-discharge', 'executed');
  CREATE TYPE "public"."enum_characters_classification" AS ENUM('public', 'restricted', 'classified');
  CREATE TYPE "public"."enum_characters_threat_level" AS ENUM('low', 'moderate', 'high', 'critical');
  CREATE TYPE "public"."enum_character_timeline_type" AS ENUM('promotion', 'mutation', 'wound', 'mission', 'disciplinary', 'medal', 'training', 'other');
  CREATE TYPE "public"."enum_character_timeline_classification" AS ENUM('public', 'confidential', 'secret');
  CREATE TYPE "public"."enum_factions_type" AS ENUM('allied', 'neutral', 'hostile');
  CREATE TYPE "public"."enum_intelligence_type" AS ENUM('observation', 'interception', 'reconnaissance', 'infiltration', 'sigint', 'humint', 'other');
  CREATE TYPE "public"."enum_intelligence_status" AS ENUM('to-investigate', 'verified', 'false-info', 'inconclusive');
  CREATE TYPE "public"."enum_intelligence_classification" AS ENUM('public', 'restricted', 'classified');
  CREATE TYPE "public"."enum_navigation_links_type" AS ENUM('internal', 'external', 'anchor');
  CREATE TYPE "public"."enum_roleplay_admin_roles_permission_level" AS ENUM('full', 'limited');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'user' NOT NULL,
  	"discord_id" varchar,
  	"discord_username" varchar,
  	"discord_avatar" varchar,
  	"discord_roles" jsonb,
  	"is_guild_member" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"subheading" varchar,
  	"background_image_id" integer,
  	"cta_text" varchar,
  	"cta_link" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_blocks_image_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_google_docs_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"google_docs_url" varchar NOT NULL,
  	"height" numeric DEFAULT 800,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_pages_status" DEFAULT 'draft',
  	"hero_image_id" integer,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_posts_status" DEFAULT 'draft',
  	"published_date" timestamp(3) with time zone,
  	"author_id" integer,
  	"featured_image_id" integer,
  	"excerpt" varchar,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "characters_specialisations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "characters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"date_of_birth" timestamp(3) with time zone,
  	"place_of_origin" varchar,
  	"height" numeric,
  	"weight" numeric,
  	"physical_description" varchar,
  	"avatar_id" integer,
  	"motto" varchar,
  	"previous_unit" varchar,
  	"civilian_background" jsonb,
  	"military_background" jsonb,
  	"legal_background" jsonb,
  	"miscellaneous" jsonb,
  	"etat_major_notes" jsonb,
  	"military_id" varchar,
  	"rank_id" integer,
  	"rank_override" boolean DEFAULT false,
  	"status" "enum_characters_status" DEFAULT 'in-service' NOT NULL,
  	"classification" "enum_characters_classification" DEFAULT 'public',
  	"faction" varchar,
  	"is_main_character" boolean DEFAULT false,
  	"is_target" boolean DEFAULT false,
  	"target_faction" varchar,
  	"unit_id" integer,
  	"superior_officer_id" integer,
  	"discord_id" varchar,
  	"discord_username" varchar,
  	"threat_level" "enum_characters_threat_level",
  	"is_archived" boolean DEFAULT false,
  	"archived_at" timestamp(3) with time zone,
  	"archived_by" varchar,
  	"archive_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "character_timeline" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"character_id" integer NOT NULL,
  	"type" "enum_character_timeline_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"date" timestamp(3) with time zone NOT NULL,
  	"image_id" integer,
  	"classification" "enum_character_timeline_classification" DEFAULT 'public',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ranks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"abbreviation" varchar NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"discord_role_id" varchar,
  	"icon_id" integer,
  	"color" varchar DEFAULT '#c9a227',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "units" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" jsonb,
  	"insignia_id" integer,
  	"commander_id" integer,
  	"parent_faction_id" integer,
  	"color" varchar DEFAULT '#4a7c23',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "factions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_factions_type" DEFAULT 'neutral',
  	"description" jsonb,
  	"logo_id" integer,
  	"color" varchar DEFAULT '#8b9a7d',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "intelligence_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "intelligence" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"description" jsonb NOT NULL,
  	"type" "enum_intelligence_type" NOT NULL,
  	"coordinates" varchar,
  	"linked_target_id" integer,
  	"linked_faction_id" integer,
  	"posted_by_id" integer,
  	"posted_by_discord_id" varchar,
  	"posted_by_discord_username" varchar,
  	"status" "enum_intelligence_status" DEFAULT 'to-investigate',
  	"classification" "enum_intelligence_classification" DEFAULT 'restricted',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"characters_id" integer,
  	"character_timeline_id" integer,
  	"ranks_id" integer,
  	"units_id" integer,
  	"factions_id" integer,
  	"intelligence_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "homepage_servers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"mode" varchar NOT NULL,
  	"description" varchar,
  	"max_players" numeric DEFAULT 64,
  	"map" varchar DEFAULT 'Everon',
  	"ip" varchar,
  	"game_port" numeric DEFAULT 2001,
  	"query_port" numeric DEFAULT 17777,
  	"is_online" boolean DEFAULT true
  );
  
  CREATE TABLE "homepage_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"hero_background_id" integer,
  	"hero_title" varchar DEFAULT 'Légion Internationale Francophone' NOT NULL,
  	"hero_title_accent" varchar DEFAULT 'Légion',
  	"hero_subtitle" varchar DEFAULT 'Communauté francophone sur Arma Reforger',
  	"hero_description" varchar DEFAULT 'Rejoignez notre communauté de joueurs passionnés et vivez des opérations militaires immersives sur nos deux serveurs dédiés.',
  	"hero_primary_button_text" varchar DEFAULT 'Rejoindre le Discord',
  	"hero_primary_button_url" varchar DEFAULT 'https://discord.gg/votre-discord',
  	"hero_secondary_button_text" varchar DEFAULT 'Nos Serveurs',
  	"hero_secondary_button_url" varchar DEFAULT '/#serveurs',
  	"servers_title" varchar DEFAULT 'Nos Serveurs',
  	"servers_icon" varchar DEFAULT 'Swords',
  	"is_presentation_visible" boolean DEFAULT true,
  	"presentation_title" varchar DEFAULT 'Présentation de la LIF',
  	"presentation_icon" varchar DEFAULT 'Video',
  	"presentation_video_title" varchar DEFAULT 'Présentation de la LIF',
  	"presentation_video_link" varchar DEFAULT 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  	"is_features_visible" boolean DEFAULT true,
  	"features_title" varchar DEFAULT 'Pourquoi nous rejoindre ?',
  	"features_icon" varchar DEFAULT 'Star',
  	"is_news_visible" boolean DEFAULT true,
  	"news_title" varchar DEFAULT 'Actualités',
  	"news_icon" varchar DEFAULT 'Newspaper',
  	"is_cta_visible" boolean DEFAULT true,
  	"cta_title" varchar DEFAULT 'Prêt à rejoindre les rangs ?',
  	"cta_description" varchar DEFAULT 'Rejoignez notre Discord pour commencer l''aventure avec la Légion Internationale Francophone.',
  	"cta_button_text" varchar DEFAULT 'Rejoindre la LIF',
  	"cta_button_url" varchar DEFAULT 'https://discord.gg/votre-discord',
  	"discord_url" varchar DEFAULT 'https://discord.gg/votre-discord',
  	"youtube_url" varchar,
  	"twitter_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"type" "enum_navigation_links_type" DEFAULT 'internal' NOT NULL,
  	"page_id" integer,
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"is_highlighted" boolean DEFAULT false
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"discord_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "admin_dashboard_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"icon" varchar DEFAULT '🔗' NOT NULL,
  	"color" varchar DEFAULT '#4a7c23' NOT NULL
  );
  
  CREATE TABLE "admin_dashboard" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "roleplay_blocks_lore_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"content" jsonb NOT NULL,
  	"background_image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "roleplay_blocks_lore_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar,
  	"full_width" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "roleplay_blocks_lore_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "roleplay_blocks_lore_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "roleplay_timeline_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "roleplay_loading_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"message" varchar NOT NULL
  );
  
  CREATE TABLE "roleplay_admin_roles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role_id" varchar NOT NULL,
  	"role_name" varchar,
  	"permission_level" "enum_roleplay_admin_roles_permission_level" DEFAULT 'full'
  );
  
  CREATE TABLE "roleplay" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"header_title" varchar DEFAULT 'Dossiers du Personnel',
  	"header_subtitle" varchar DEFAULT 'Base de données militaire — Accès autorisé',
  	"header_logo_id" integer,
  	"header_background_id" integer,
  	"is_lore_visible" boolean DEFAULT true,
  	"lore_title" varchar DEFAULT 'Histoire & Lore',
  	"is_timeline_visible" boolean DEFAULT true,
  	"timeline_title" varchar DEFAULT 'Chronologie',
  	"matricule_prefix" varchar DEFAULT 'DA',
  	"matricule_year" numeric DEFAULT 2042,
  	"discord_sync_interval" numeric DEFAULT 30,
  	"default_faction" varchar DEFAULT 'LIF',
  	"loading_enabled" boolean DEFAULT true,
  	"disclaimer_enabled" boolean DEFAULT true,
  	"disclaimer_title" varchar DEFAULT 'ACCÈS RESTREINT',
  	"disclaimer_message" varchar DEFAULT 'Vous devez être membre du serveur Discord et avoir complété votre entrée en service pour accéder à toutes les fonctionnalités.',
  	"discord_invite_url" varchar DEFAULT '',
  	"intelligence_role_id" varchar DEFAULT '1424804277813248091',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_content" ADD CONSTRAINT "pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_gallery_images" ADD CONSTRAINT "pages_blocks_image_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_gallery_images" ADD CONSTRAINT "pages_blocks_image_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_image_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_gallery" ADD CONSTRAINT "pages_blocks_image_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_google_docs_embed" ADD CONSTRAINT "pages_blocks_google_docs_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_categories" ADD CONSTRAINT "posts_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_specialisations" ADD CONSTRAINT "characters_specialisations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_rank_id_ranks_id_fk" FOREIGN KEY ("rank_id") REFERENCES "public"."ranks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_superior_officer_id_characters_id_fk" FOREIGN KEY ("superior_officer_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "character_timeline" ADD CONSTRAINT "character_timeline_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "character_timeline" ADD CONSTRAINT "character_timeline_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ranks" ADD CONSTRAINT "ranks_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units" ADD CONSTRAINT "units_insignia_id_media_id_fk" FOREIGN KEY ("insignia_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units" ADD CONSTRAINT "units_commander_id_characters_id_fk" FOREIGN KEY ("commander_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units" ADD CONSTRAINT "units_parent_faction_id_factions_id_fk" FOREIGN KEY ("parent_faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "factions" ADD CONSTRAINT "factions_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "intelligence_media" ADD CONSTRAINT "intelligence_media_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "intelligence_media" ADD CONSTRAINT "intelligence_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."intelligence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "intelligence" ADD CONSTRAINT "intelligence_linked_target_id_characters_id_fk" FOREIGN KEY ("linked_target_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "intelligence" ADD CONSTRAINT "intelligence_linked_faction_id_factions_id_fk" FOREIGN KEY ("linked_faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "intelligence" ADD CONSTRAINT "intelligence_posted_by_id_characters_id_fk" FOREIGN KEY ("posted_by_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_character_timeline_fk" FOREIGN KEY ("character_timeline_id") REFERENCES "public"."character_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ranks_fk" FOREIGN KEY ("ranks_id") REFERENCES "public"."ranks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_units_fk" FOREIGN KEY ("units_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_factions_fk" FOREIGN KEY ("factions_id") REFERENCES "public"."factions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_intelligence_fk" FOREIGN KEY ("intelligence_id") REFERENCES "public"."intelligence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_servers" ADD CONSTRAINT "homepage_servers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_features" ADD CONSTRAINT "homepage_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_hero_background_id_media_id_fk" FOREIGN KEY ("hero_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_links" ADD CONSTRAINT "navigation_links_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_links" ADD CONSTRAINT "navigation_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admin_dashboard_links" ADD CONSTRAINT "admin_dashboard_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admin_dashboard"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_text" ADD CONSTRAINT "roleplay_blocks_lore_text_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_text" ADD CONSTRAINT "roleplay_blocks_lore_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_banner" ADD CONSTRAINT "roleplay_blocks_lore_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_banner" ADD CONSTRAINT "roleplay_blocks_lore_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_gallery_images" ADD CONSTRAINT "roleplay_blocks_lore_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_gallery_images" ADD CONSTRAINT "roleplay_blocks_lore_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay_blocks_lore_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_blocks_lore_gallery" ADD CONSTRAINT "roleplay_blocks_lore_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_timeline_events" ADD CONSTRAINT "roleplay_timeline_events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roleplay_timeline_events" ADD CONSTRAINT "roleplay_timeline_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_loading_messages" ADD CONSTRAINT "roleplay_loading_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay_admin_roles" ADD CONSTRAINT "roleplay_admin_roles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roleplay"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roleplay" ADD CONSTRAINT "roleplay_header_logo_id_media_id_fk" FOREIGN KEY ("header_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "roleplay" ADD CONSTRAINT "roleplay_header_background_id_media_id_fk" FOREIGN KEY ("header_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_discord_id_idx" ON "users" USING btree ("discord_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_background_image_idx" ON "pages_blocks_hero" USING btree ("background_image_id");
  CREATE INDEX "pages_blocks_content_order_idx" ON "pages_blocks_content" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_parent_id_idx" ON "pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_path_idx" ON "pages_blocks_content" USING btree ("_path");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_gallery_images_order_idx" ON "pages_blocks_image_gallery_images" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_gallery_images_parent_id_idx" ON "pages_blocks_image_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_gallery_images_image_idx" ON "pages_blocks_image_gallery_images" USING btree ("image_id");
  CREATE INDEX "pages_blocks_image_gallery_order_idx" ON "pages_blocks_image_gallery" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_gallery_parent_id_idx" ON "pages_blocks_image_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_gallery_path_idx" ON "pages_blocks_image_gallery" USING btree ("_path");
  CREATE INDEX "pages_blocks_google_docs_embed_order_idx" ON "pages_blocks_google_docs_embed" USING btree ("_order");
  CREATE INDEX "pages_blocks_google_docs_embed_parent_id_idx" ON "pages_blocks_google_docs_embed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_google_docs_embed_path_idx" ON "pages_blocks_google_docs_embed" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "posts_categories_order_idx" ON "posts_categories" USING btree ("_order");
  CREATE INDEX "posts_categories_parent_id_idx" ON "posts_categories" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");
  CREATE INDEX "posts_featured_image_idx" ON "posts" USING btree ("featured_image_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts" USING btree ("meta_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "characters_specialisations_order_idx" ON "characters_specialisations" USING btree ("_order");
  CREATE INDEX "characters_specialisations_parent_id_idx" ON "characters_specialisations" USING btree ("_parent_id");
  CREATE INDEX "characters_avatar_idx" ON "characters" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "characters_military_id_idx" ON "characters" USING btree ("military_id");
  CREATE INDEX "characters_rank_idx" ON "characters" USING btree ("rank_id");
  CREATE INDEX "characters_unit_idx" ON "characters" USING btree ("unit_id");
  CREATE INDEX "characters_superior_officer_idx" ON "characters" USING btree ("superior_officer_id");
  CREATE INDEX "characters_updated_at_idx" ON "characters" USING btree ("updated_at");
  CREATE INDEX "characters_created_at_idx" ON "characters" USING btree ("created_at");
  CREATE INDEX "character_timeline_character_idx" ON "character_timeline" USING btree ("character_id");
  CREATE INDEX "character_timeline_image_idx" ON "character_timeline" USING btree ("image_id");
  CREATE INDEX "character_timeline_updated_at_idx" ON "character_timeline" USING btree ("updated_at");
  CREATE INDEX "character_timeline_created_at_idx" ON "character_timeline" USING btree ("created_at");
  CREATE INDEX "ranks_icon_idx" ON "ranks" USING btree ("icon_id");
  CREATE INDEX "ranks_updated_at_idx" ON "ranks" USING btree ("updated_at");
  CREATE INDEX "ranks_created_at_idx" ON "ranks" USING btree ("created_at");
  CREATE UNIQUE INDEX "units_slug_idx" ON "units" USING btree ("slug");
  CREATE INDEX "units_insignia_idx" ON "units" USING btree ("insignia_id");
  CREATE INDEX "units_commander_idx" ON "units" USING btree ("commander_id");
  CREATE INDEX "units_parent_faction_idx" ON "units" USING btree ("parent_faction_id");
  CREATE INDEX "units_updated_at_idx" ON "units" USING btree ("updated_at");
  CREATE INDEX "units_created_at_idx" ON "units" USING btree ("created_at");
  CREATE UNIQUE INDEX "factions_slug_idx" ON "factions" USING btree ("slug");
  CREATE INDEX "factions_logo_idx" ON "factions" USING btree ("logo_id");
  CREATE INDEX "factions_updated_at_idx" ON "factions" USING btree ("updated_at");
  CREATE INDEX "factions_created_at_idx" ON "factions" USING btree ("created_at");
  CREATE INDEX "intelligence_media_order_idx" ON "intelligence_media" USING btree ("_order");
  CREATE INDEX "intelligence_media_parent_id_idx" ON "intelligence_media" USING btree ("_parent_id");
  CREATE INDEX "intelligence_media_file_idx" ON "intelligence_media" USING btree ("file_id");
  CREATE INDEX "intelligence_linked_target_idx" ON "intelligence" USING btree ("linked_target_id");
  CREATE INDEX "intelligence_linked_faction_idx" ON "intelligence" USING btree ("linked_faction_id");
  CREATE INDEX "intelligence_posted_by_idx" ON "intelligence" USING btree ("posted_by_id");
  CREATE INDEX "intelligence_updated_at_idx" ON "intelligence" USING btree ("updated_at");
  CREATE INDEX "intelligence_created_at_idx" ON "intelligence" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_characters_id_idx" ON "payload_locked_documents_rels" USING btree ("characters_id");
  CREATE INDEX "payload_locked_documents_rels_character_timeline_id_idx" ON "payload_locked_documents_rels" USING btree ("character_timeline_id");
  CREATE INDEX "payload_locked_documents_rels_ranks_id_idx" ON "payload_locked_documents_rels" USING btree ("ranks_id");
  CREATE INDEX "payload_locked_documents_rels_units_id_idx" ON "payload_locked_documents_rels" USING btree ("units_id");
  CREATE INDEX "payload_locked_documents_rels_factions_id_idx" ON "payload_locked_documents_rels" USING btree ("factions_id");
  CREATE INDEX "payload_locked_documents_rels_intelligence_id_idx" ON "payload_locked_documents_rels" USING btree ("intelligence_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage_servers_order_idx" ON "homepage_servers" USING btree ("_order");
  CREATE INDEX "homepage_servers_parent_id_idx" ON "homepage_servers" USING btree ("_parent_id");
  CREATE INDEX "homepage_features_order_idx" ON "homepage_features" USING btree ("_order");
  CREATE INDEX "homepage_features_parent_id_idx" ON "homepage_features" USING btree ("_parent_id");
  CREATE INDEX "homepage_logo_idx" ON "homepage" USING btree ("logo_id");
  CREATE INDEX "homepage_hero_background_idx" ON "homepage" USING btree ("hero_background_id");
  CREATE INDEX "navigation_links_order_idx" ON "navigation_links" USING btree ("_order");
  CREATE INDEX "navigation_links_parent_id_idx" ON "navigation_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_links_page_idx" ON "navigation_links" USING btree ("page_id");
  CREATE INDEX "admin_dashboard_links_order_idx" ON "admin_dashboard_links" USING btree ("_order");
  CREATE INDEX "admin_dashboard_links_parent_id_idx" ON "admin_dashboard_links" USING btree ("_parent_id");
  CREATE INDEX "roleplay_blocks_lore_text_order_idx" ON "roleplay_blocks_lore_text" USING btree ("_order");
  CREATE INDEX "roleplay_blocks_lore_text_parent_id_idx" ON "roleplay_blocks_lore_text" USING btree ("_parent_id");
  CREATE INDEX "roleplay_blocks_lore_text_path_idx" ON "roleplay_blocks_lore_text" USING btree ("_path");
  CREATE INDEX "roleplay_blocks_lore_text_background_image_idx" ON "roleplay_blocks_lore_text" USING btree ("background_image_id");
  CREATE INDEX "roleplay_blocks_lore_banner_order_idx" ON "roleplay_blocks_lore_banner" USING btree ("_order");
  CREATE INDEX "roleplay_blocks_lore_banner_parent_id_idx" ON "roleplay_blocks_lore_banner" USING btree ("_parent_id");
  CREATE INDEX "roleplay_blocks_lore_banner_path_idx" ON "roleplay_blocks_lore_banner" USING btree ("_path");
  CREATE INDEX "roleplay_blocks_lore_banner_image_idx" ON "roleplay_blocks_lore_banner" USING btree ("image_id");
  CREATE INDEX "roleplay_blocks_lore_gallery_images_order_idx" ON "roleplay_blocks_lore_gallery_images" USING btree ("_order");
  CREATE INDEX "roleplay_blocks_lore_gallery_images_parent_id_idx" ON "roleplay_blocks_lore_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "roleplay_blocks_lore_gallery_images_image_idx" ON "roleplay_blocks_lore_gallery_images" USING btree ("image_id");
  CREATE INDEX "roleplay_blocks_lore_gallery_order_idx" ON "roleplay_blocks_lore_gallery" USING btree ("_order");
  CREATE INDEX "roleplay_blocks_lore_gallery_parent_id_idx" ON "roleplay_blocks_lore_gallery" USING btree ("_parent_id");
  CREATE INDEX "roleplay_blocks_lore_gallery_path_idx" ON "roleplay_blocks_lore_gallery" USING btree ("_path");
  CREATE INDEX "roleplay_timeline_events_order_idx" ON "roleplay_timeline_events" USING btree ("_order");
  CREATE INDEX "roleplay_timeline_events_parent_id_idx" ON "roleplay_timeline_events" USING btree ("_parent_id");
  CREATE INDEX "roleplay_timeline_events_image_idx" ON "roleplay_timeline_events" USING btree ("image_id");
  CREATE INDEX "roleplay_loading_messages_order_idx" ON "roleplay_loading_messages" USING btree ("_order");
  CREATE INDEX "roleplay_loading_messages_parent_id_idx" ON "roleplay_loading_messages" USING btree ("_parent_id");
  CREATE INDEX "roleplay_admin_roles_order_idx" ON "roleplay_admin_roles" USING btree ("_order");
  CREATE INDEX "roleplay_admin_roles_parent_id_idx" ON "roleplay_admin_roles" USING btree ("_parent_id");
  CREATE INDEX "roleplay_header_logo_idx" ON "roleplay" USING btree ("header_logo_id");
  CREATE INDEX "roleplay_header_background_idx" ON "roleplay" USING btree ("header_background_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_content" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_image_gallery_images" CASCADE;
  DROP TABLE "pages_blocks_image_gallery" CASCADE;
  DROP TABLE "pages_blocks_google_docs_embed" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "posts_categories" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "characters_specialisations" CASCADE;
  DROP TABLE "characters" CASCADE;
  DROP TABLE "character_timeline" CASCADE;
  DROP TABLE "ranks" CASCADE;
  DROP TABLE "units" CASCADE;
  DROP TABLE "factions" CASCADE;
  DROP TABLE "intelligence_media" CASCADE;
  DROP TABLE "intelligence" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "homepage_servers" CASCADE;
  DROP TABLE "homepage_features" CASCADE;
  DROP TABLE "homepage" CASCADE;
  DROP TABLE "navigation_links" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "admin_dashboard_links" CASCADE;
  DROP TABLE "admin_dashboard" CASCADE;
  DROP TABLE "roleplay_blocks_lore_text" CASCADE;
  DROP TABLE "roleplay_blocks_lore_banner" CASCADE;
  DROP TABLE "roleplay_blocks_lore_gallery_images" CASCADE;
  DROP TABLE "roleplay_blocks_lore_gallery" CASCADE;
  DROP TABLE "roleplay_timeline_events" CASCADE;
  DROP TABLE "roleplay_loading_messages" CASCADE;
  DROP TABLE "roleplay_admin_roles" CASCADE;
  DROP TABLE "roleplay" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum_characters_status";
  DROP TYPE "public"."enum_characters_classification";
  DROP TYPE "public"."enum_characters_threat_level";
  DROP TYPE "public"."enum_character_timeline_type";
  DROP TYPE "public"."enum_character_timeline_classification";
  DROP TYPE "public"."enum_factions_type";
  DROP TYPE "public"."enum_intelligence_type";
  DROP TYPE "public"."enum_intelligence_status";
  DROP TYPE "public"."enum_intelligence_classification";
  DROP TYPE "public"."enum_navigation_links_type";
  DROP TYPE "public"."enum_roleplay_admin_roles_permission_level";`)
}
