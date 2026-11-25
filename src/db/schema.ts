import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default('Researcher'),
  institution: text('institution').notNull().default(''),
  researchInterest: text('research_interest').notNull().default(''),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  status: text('status').notNull().default('active'), // 'active' | 'disabled'
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  researchObjective: text('research_objective').notNull().default(''),
  environmentType: text('environment_type').notNull().default('Freshwater'),
  location: text('location').notNull().default(''),
  samplingDate: text('sampling_date').notNull().default(''),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const samples = pgTable('samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  sampleName: text('sample_name').notNull(),
  sampleCode: text('sample_code').notNull(),
  collectionDate: text('collection_date').notNull().default(''),
  environment: text('environment').notNull().default('Freshwater'),
  location: text('location').notNull().default(''),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const datasets = pgTable('datasets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sampleId: uuid('sample_id').references(() => samples.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  fileFormat: text('file_format').notNull(),
  storagePath: text('storage_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  rowCount: integer('row_count').notNull().default(0),
  sequenceCount: integer('sequence_count').notNull().default(0),
  previewRows: jsonb('preview_rows').$type<Record<string, unknown>[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  uploadStatus: text('upload_status').notNull().default('validated'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const analyses = pgTable('analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  datasetId: uuid('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'cascade' }),
  sampleId: uuid('sample_id').references(() => samples.id, { onDelete: 'set null' }),
  pipelineName: text('pipeline_name').notNull(),
  pipelineVersion: text('pipeline_version').notNull().default('1.0.0'),
  status: text('status').notNull().default('completed'), // 'pending' | 'processing' | 'completed' | 'unprocessed' | 'failed'
  isDemo: boolean('is_demo').notNull().default(false),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  errorMessage: text('error_message'),
});

export const taxonomicResults = pgTable('taxonomic_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  sampleId: uuid('sample_id').references(() => samples.id, { onDelete: 'set null' }),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  taxonName: text('taxon_name').notNull(),
  taxonRank: text('taxon_rank').notNull().default('Species'),
  kingdom: text('kingdom').notNull().default('Unassigned'),
  phylum: text('phylum').notNull().default('Unassigned'),
  className: text('class_name').notNull().default('Unassigned'),
  orderName: text('order_name').notNull().default('Unassigned'),
  family: text('family').notNull().default('Unassigned'),
  genus: text('genus').notNull().default('Unassigned'),
  species: text('species').notNull().default('Unassigned'),
  readCount: integer('read_count').notNull().default(0),
  relativeAbundance: doublePrecision('relative_abundance').notNull().default(0),
  confidenceScore: doublePrecision('confidence_score'),
  referenceDatabase: text('reference_database').notNull().default('User-Provided Taxonomic Table'),
  identificationStatus: text('identification_status').notNull().default('Parsed from Dataset'),
  sequenceIdentifier: text('sequence_identifier').notNull().default(''),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
});

export const biodiversityMetrics = pgTable('biodiversity_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  sampleId: uuid('sample_id').references(() => samples.id, { onDelete: 'set null' }),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  taxonLevel: text('taxon_level').notNull().default('Species'),
  speciesRichness: integer('species_richness').notNull().default(0),
  shannonIndex: doublePrecision('shannon_index').notNull().default(0),
  simpsonDominance: doublePrecision('simpson_dominance').notNull().default(0),
  simpsonIndex: doublePrecision('simpson_index').notNull().default(0),
  simpsonInverse: doublePrecision('simpson_inverse').notNull().default(0),
  simpsonConvention: text('simpson_convention').notNull().default('1 - D (Gini-Simpson)'),
  pielouEvenness: doublePrecision('pielou_evenness'),
  totalReads: integer('total_reads').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  analysisId: uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
  reportName: text('report_name').notNull(),
  storagePath: text('storage_path').notNull().default(''),
  reportType: text('report_type').notNull().default('Biodiversity Assessment'),
  summaryData: jsonb('summary_data').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referenceDatabases = pgTable('reference_databases', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  markerGene: text('marker_gene').notNull(),
  version: text('version').notNull(),
  sourceUrl: text('source_url').notNull().default(''),
  status: text('status').notNull().default('Configured Metadata'),
  recordCount: integer('record_count').notNull().default(0),
  notes: text('notes').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  severity: text('severity').notNull().default('info'),
  isActive: boolean('is_active').notNull().default(true),
  createdByUid: text('created_by_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull().default(''),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  entityId: text('entity_id').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  samples: many(samples),
  datasets: many(datasets),
  analyses: many(analyses),
  reports: many(reports),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerUid], references: [users.uid] }),
  samples: many(samples),
  datasets: many(datasets),
  analyses: many(analyses),
  reports: many(reports),
}));

export const samplesRelations = relations(samples, ({ one, many }) => ({
  project: one(projects, { fields: [samples.projectId], references: [projects.id] }),
  datasets: many(datasets),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  project: one(projects, { fields: [analyses.projectId], references: [projects.id] }),
  dataset: one(datasets, { fields: [analyses.datasetId], references: [datasets.id] }),
  taxonomicResults: many(taxonomicResults),
  biodiversityMetrics: many(biodiversityMetrics),
}));
