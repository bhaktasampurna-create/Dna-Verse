import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  activityLogs,
  analyses,
  announcements,
  auditLogs,
  biodiversityMetrics,
  datasets,
  projects,
  referenceDatabases,
  reports,
  samples,
  taxonomicResults,
  users,
} from './src/db/schema.ts';
import { AuthRequest, requireAdmin, requireAuth } from './src/middleware/auth.ts';
import { computeBiodiversityMetrics, detectAndParseEdnaFile, detectFileFormat } from './src/lib/edna-parser.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

function resolveUserUploadPath(uid: string, fileName: string): string {
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userDir = path.resolve(UPLOADS_ROOT, safeUid);
  if (!userDir.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error('Invalid user upload directory');
  }
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const cleanName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${crypto.randomUUID()}_${cleanName}`;
  const fullPath = path.resolve(userDir, uniqueName);
  if (!fullPath.startsWith(userDir + path.sep)) {
    throw new Error('Invalid file path');
  }
  return fullPath;
}

function verifyStoredPath(storedPath: string): string | null {
  const resolved = path.resolve(storedPath);
  if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(express.json({ limit: '2mb' }));

// Public health & active platform announcements
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ecotrace-api', timestamp: new Date().toISOString() });
});

app.get('/api/announcements', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt))
      .limit(5);
    res.json({ announcements: rows });
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
    res.status(500).json({ error: 'Unable to load announcements.' });
  }
});

app.get('/api/reference-databases', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(referenceDatabases).orderBy(referenceDatabases.name);
    res.json({ databases: rows });
  } catch (err) {
    console.error('Failed to fetch reference databases:', err);
    res.status(500).json({ error: 'Unable to load reference databases.' });
  }
});

// Auth sync & profile
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.appUser!;
    const { fullName, institution, researchInterest } = req.body || {};

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      updates.fullName = fullName.trim().slice(0, 120);
    }
    if (typeof institution === 'string') {
      updates.institution = institution.trim().slice(0, 160);
    }
    if (typeof researchInterest === 'string') {
      updates.researchInterest = researchInterest.trim().slice(0, 240);
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, user.uid))
      .returning();

    res.json({ user: updated[0] });
  } catch (err) {
    console.error('Auth sync error:', err);
    res.status(500).json({ error: 'Failed to synchronize user profile.' });
  }
});

app.get('/api/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.appUser });
});

app.patch('/api/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.appUser!;
    const { fullName, institution, researchInterest } = req.body || {};

    if (typeof fullName === 'string' && fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }

    const updated = await db
      .update(users)
      .set({
        fullName: typeof fullName === 'string' ? fullName.trim().slice(0, 120) : user.fullName,
        institution: typeof institution === 'string' ? institution.trim().slice(0, 160) : user.institution,
        researchInterest:
          typeof researchInterest === 'string' ? researchInterest.trim().slice(0, 240) : user.researchInterest,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, user.uid))
      .returning();

    res.json({ user: updated[0] });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Dashboard aggregation
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;

    const [
      userProjects,
      userSamples,
      userDatasets,
      userAnalyses,
      userMetrics,
      userTaxa,
      recentActivity,
      userReports,
    ] = await Promise.all([
      db.select().from(projects).where(eq(projects.ownerUid, uid)).orderBy(desc(projects.updatedAt)),
      db.select().from(samples).where(eq(samples.ownerUid, uid)).orderBy(desc(samples.createdAt)),
      db.select().from(datasets).where(eq(datasets.ownerUid, uid)).orderBy(desc(datasets.createdAt)),
      db.select().from(analyses).where(eq(analyses.ownerUid, uid)).orderBy(desc(analyses.startedAt)),
      db
        .select()
        .from(biodiversityMetrics)
        .where(and(eq(biodiversityMetrics.ownerUid, uid), eq(biodiversityMetrics.taxonLevel, 'Species'))),
      db.select().from(taxonomicResults).where(eq(taxonomicResults.ownerUid, uid)),
      db.select().from(activityLogs).where(eq(activityLogs.ownerUid, uid)).orderBy(desc(activityLogs.createdAt)).limit(12),
      db.select().from(reports).where(eq(reports.ownerUid, uid)).orderBy(desc(reports.createdAt)),
    ]);

    const uniqueTaxaNames = new Set(userTaxa.map((t) => t.taxonName));
    const completedAnalyses = userAnalyses.filter((a) => a.status === 'completed');

    // Phylum composition across saved analyses
    const phylumMap = new Map<string, number>();
    for (const row of userTaxa) {
      const key = row.phylum && row.phylum !== 'Unassigned' ? row.phylum : row.kingdom || 'Unassigned';
      phylumMap.set(key, (phylumMap.get(key) ?? 0) + row.readCount);
    }
    const taxonomicDistribution = Array.from(phylumMap.entries())
      .map(([name, reads]) => ({ name, reads }))
      .sort((a, b) => b.reads - a.reads)
      .slice(0, 8);

    res.json({
      stats: {
        totalProjects: userProjects.length,
        totalSamples: userSamples.length,
        totalDatasets: userDatasets.length,
        completedAnalyses: completedAnalyses.length,
        identifiedTaxa: uniqueTaxaNames.size,
        totalReports: userReports.length,
      },
      recentProjects: userProjects.slice(0, 6).map((p) => ({
        ...p,
        sampleCount: userSamples.filter((s) => s.projectId === p.id).length,
        datasetCount: userDatasets.filter((d) => d.projectId === p.id).length,
      })),
      recentActivity,
      taxonomicDistribution,
      metricsSeries: userMetrics.slice(0, 10),
    });
  } catch (err) {
    console.error('Dashboard aggregation error:', err);
    res.status(500).json({ error: 'Failed to load dashboard overview.' });
  }
});

// Projects CRUD
app.get('/api/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const [projRows, sampleRows, datasetRows, analysisRows] = await Promise.all([
      db.select().from(projects).where(eq(projects.ownerUid, uid)).orderBy(desc(projects.updatedAt)),
      db.select().from(samples).where(eq(samples.ownerUid, uid)),
      db.select().from(datasets).where(eq(datasets.ownerUid, uid)),
      db.select().from(analyses).where(eq(analyses.ownerUid, uid)),
    ]);

    const enriched = projRows.map((p) => ({
      ...p,
      sampleCount: sampleRows.filter((s) => s.projectId === p.id).length,
      datasetCount: datasetRows.filter((d) => d.projectId === p.id).length,
      analysisCount: analysisRows.filter((a) => a.projectId === p.id).length,
    }));

    res.json({ projects: enriched });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Failed to load projects.' });
  }
});

app.post('/api/projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { name, description, researchObjective, environmentType, location, samplingDate } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Project name must be at least 2 characters.' });
    }

    const allowedEnvs = ['Freshwater', 'Marine', 'Soil', 'Forest', 'Wetland', 'Air', 'Other'];
    const env = allowedEnvs.includes(environmentType) ? environmentType : 'Freshwater';

    const created = await db
      .insert(projects)
      .values({
        ownerUid: uid,
        name: name.trim().slice(0, 160),
        description: typeof description === 'string' ? description.trim().slice(0, 2000) : '',
        researchObjective: typeof researchObjective === 'string' ? researchObjective.trim().slice(0, 1000) : '',
        environmentType: env,
        location: typeof location === 'string' ? location.trim().slice(0, 200) : '',
        samplingDate: typeof samplingDate === 'string' ? samplingDate.trim().slice(0, 40) : '',
        status: 'Active',
      })
      .returning();

    await db.insert(activityLogs).values({
      ownerUid: uid,
      eventType: 'project_created',
      title: `Created project "${created[0].name}"`,
      description: `${env}${location ? ` · ${location}` : ''}`,
      entityId: created[0].id,
    });

    res.status(201).json({ project: created[0] });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

app.patch('/api/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;
    const { name, description, researchObjective, environmentType, location, samplingDate, status } = req.body || {};

    const existing = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerUid, uid)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const allowedEnvs = ['Freshwater', 'Marine', 'Soil', 'Forest', 'Wetland', 'Air', 'Other'];
    const updated = await db
      .update(projects)
      .set({
        name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 160) : existing[0].name,
        description: typeof description === 'string' ? description.trim().slice(0, 2000) : existing[0].description,
        researchObjective:
          typeof researchObjective === 'string' ? researchObjective.trim().slice(0, 1000) : existing[0].researchObjective,
        environmentType: allowedEnvs.includes(environmentType) ? environmentType : existing[0].environmentType,
        location: typeof location === 'string' ? location.trim().slice(0, 200) : existing[0].location,
        samplingDate: typeof samplingDate === 'string' ? samplingDate.trim().slice(0, 40) : existing[0].samplingDate,
        status: typeof status === 'string' && ['Active', 'Completed', 'Archived'].includes(status) ? status : existing[0].status,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.ownerUid, uid)))
      .returning();

    res.json({ project: updated[0] });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;

    const deleted = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerUid, uid)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// Samples CRUD
app.get('/api/samples', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;

    const rows = projectId
      ? await db
          .select()
          .from(samples)
          .where(and(eq(samples.ownerUid, uid), eq(samples.projectId, projectId)))
          .orderBy(desc(samples.createdAt))
      : await db.select().from(samples).where(eq(samples.ownerUid, uid)).orderBy(desc(samples.createdAt));

    res.json({ samples: rows });
  } catch (err) {
    console.error('Get samples error:', err);
    res.status(500).json({ error: 'Failed to load samples.' });
  }
});

app.post('/api/samples', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { projectId, sampleName, sampleCode, collectionDate, environment, location, metadata } = req.body || {};

    if (!projectId || !sampleName || !sampleCode) {
      return res.status(400).json({ error: 'Project, sample name, and sample ID code are required.' });
    }

    const proj = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerUid, uid)))
      .limit(1);

    if (proj.length === 0) {
      return res.status(404).json({ error: 'Selected project not found.' });
    }

    const created = await db
      .insert(samples)
      .values({
        projectId,
        ownerUid: uid,
        sampleName: String(sampleName).trim().slice(0, 140),
        sampleCode: String(sampleCode).trim().slice(0, 60),
        collectionDate: typeof collectionDate === 'string' ? collectionDate.trim().slice(0, 40) : '',
        environment: typeof environment === 'string' ? environment.trim().slice(0, 40) : proj[0].environmentType,
        location: typeof location === 'string' ? location.trim().slice(0, 200) : proj[0].location,
        metadata: typeof metadata === 'object' && metadata ? metadata : {},
      })
      .returning();

    res.status(201).json({ sample: created[0] });
  } catch (err) {
    console.error('Create sample error:', err);
    res.status(500).json({ error: 'Failed to create sample.' });
  }
});

app.delete('/api/samples/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;
    const deleted = await db
      .delete(samples)
      .where(and(eq(samples.id, id), eq(samples.ownerUid, uid)))
      .returning();
    if (deleted.length === 0) return res.status(404).json({ error: 'Sample not found.' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete sample error:', err);
    res.status(500).json({ error: 'Failed to delete sample.' });
  }
});

// Datasets Upload & Management
app.get('/api/datasets', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const rows = await db.select().from(datasets).where(eq(datasets.ownerUid, uid)).orderBy(desc(datasets.createdAt));
    res.json({ datasets: rows });
  } catch (err) {
    console.error('Get datasets error:', err);
    res.status(500).json({ error: 'Failed to load datasets.' });
  }
});

app.post('/api/datasets/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No dataset file provided.' });
    }

    const format = detectFileFormat(file.originalname);
    if (!format) {
      return res.status(400).json({
        error: 'Unsupported file format. Accepted: CSV, TSV, TXT, JSON, FASTA (.fasta/.fa), FASTQ (.fastq/.fq).',
      });
    }

    const { projectId, sampleId, datasetName, sampleCode, samplingLocation, environment, collectionDate, dataSource, notes } =
      req.body || {};

    if (!projectId) {
      return res.status(400).json({ error: 'Please select a target project before uploading.' });
    }

    const proj = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerUid, uid)))
      .limit(1);

    if (proj.length === 0) {
      return res.status(404).json({ error: 'Target project not found.' });
    }

    const textContent = file.buffer.toString('utf8');
    let parsed;
    try {
      parsed = detectAndParseEdnaFile(textContent, file.originalname);
    } catch (parseErr: any) {
      return res.status(400).json({ error: parseErr.message || 'Unable to parse dataset file.' });
    }

    let resolvedSampleId: string | null = null;
    if (sampleId && typeof sampleId === 'string' && sampleId.trim()) {
      const existingSample = await db
        .select()
        .from(samples)
        .where(and(eq(samples.id, sampleId), eq(samples.ownerUid, uid)))
        .limit(1);
      if (existingSample.length > 0) {
        resolvedSampleId = existingSample[0].id;
      }
    } else if (sampleCode && typeof sampleCode === 'string' && sampleCode.trim()) {
      const createdSample = await db
        .insert(samples)
        .values({
          projectId,
          ownerUid: uid,
          sampleName: (datasetName || file.originalname).trim().slice(0, 120),
          sampleCode: sampleCode.trim().slice(0, 60),
          collectionDate: typeof collectionDate === 'string' ? collectionDate.trim().slice(0, 40) : '',
          environment: typeof environment === 'string' ? environment.trim().slice(0, 40) : proj[0].environmentType,
          location: typeof samplingLocation === 'string' ? samplingLocation.trim().slice(0, 200) : proj[0].location,
          metadata: { dataSource: dataSource || '' },
        })
        .returning();
      resolvedSampleId = createdSample[0].id;
    }

    const diskPath = resolveUserUploadPath(uid, file.originalname);
    fs.writeFileSync(diskPath, file.buffer);

    const inserted = await db
      .insert(datasets)
      .values({
        ownerUid: uid,
        projectId,
        sampleId: resolvedSampleId,
        name: (typeof datasetName === 'string' && datasetName.trim() ? datasetName.trim() : file.originalname).slice(0, 160),
        fileName: file.originalname,
        fileFormat: parsed.format,
        storagePath: diskPath,
        fileSize: file.size,
        rowCount: parsed.rowCount,
        sequenceCount: parsed.sequenceCount,
        previewRows: parsed.previewRows,
        metadata: {
          columns: parsed.columns,
          hasTaxonomicData: parsed.hasTaxonomicData,
          sequenceQc: parsed.sequenceQc,
          warnings: parsed.warnings,
          samplingLocation: samplingLocation || '',
          environment: environment || proj[0].environmentType,
          collectionDate: collectionDate || '',
          dataSource: dataSource || '',
          notes: notes || '',
        },
        uploadStatus: parsed.hasTaxonomicData ? 'validated' : 'qc_ready',
      })
      .returning();

    await db.insert(activityLogs).values({
      ownerUid: uid,
      eventType: 'dataset_uploaded',
      title: `Uploaded dataset "${inserted[0].name}"`,
      description: `${parsed.format} · ${parsed.rowCount} records · ${(file.size / 1024).toFixed(1)} KB`,
      entityId: inserted[0].id,
    });

    res.status(201).json({ dataset: inserted[0], parsedSummary: { ...parsed, taxa: undefined } });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to store uploaded dataset.' });
  }
});

app.get('/api/datasets/:id/download', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;

    const rows = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, id), eq(datasets.ownerUid, uid)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    const safePath = verifyStoredPath(rows[0].storagePath);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Stored dataset file not found on server.' });
    }

    res.download(safePath, rows[0].fileName);
  } catch (err) {
    console.error('Download dataset error:', err);
    res.status(500).json({ error: 'Failed to download dataset.' });
  }
});

app.delete('/api/datasets/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;

    const deleted = await db
      .delete(datasets)
      .where(and(eq(datasets.id, id), eq(datasets.ownerUid, uid)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    const safePath = verifyStoredPath(deleted[0].storagePath);
    if (safePath && fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete dataset error:', err);
    res.status(500).json({ error: 'Failed to delete dataset.' });
  }
});

// eDNA Analysis Module
app.get('/api/analyses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const rows = await db.select().from(analyses).where(eq(analyses.ownerUid, uid)).orderBy(desc(analyses.startedAt));
    const metricRows = await db.select().from(biodiversityMetrics).where(eq(biodiversityMetrics.ownerUid, uid));

    const enriched = rows.map((a) => ({
      ...a,
      metrics: metricRows.filter((m) => m.analysisId === a.id),
    }));

    res.json({ analyses: enriched });
  } catch (err) {
    console.error('Get analyses error:', err);
    res.status(500).json({ error: 'Failed to fetch analyses.' });
  }
});

app.get('/api/analyses/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;

    const analysisRows = await db
      .select()
      .from(analyses)
      .where(and(eq(analyses.id, id), eq(analyses.ownerUid, uid)))
      .limit(1);

    if (analysisRows.length === 0) {
      return res.status(404).json({ error: 'Analysis record not found.' });
    }

    const [taxaRows, metricRows] = await Promise.all([
      db.select().from(taxonomicResults).where(eq(taxonomicResults.analysisId, id)),
      db.select().from(biodiversityMetrics).where(eq(biodiversityMetrics.analysisId, id)),
    ]);

    res.json({
      analysis: analysisRows[0],
      taxa: taxaRows,
      metrics: metricRows,
    });
  } catch (err) {
    console.error('Get analysis detail error:', err);
    res.status(500).json({ error: 'Failed to load analysis details.' });
  }
});

app.post('/api/analyses/run', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { datasetId, pipelineName } = req.body || {};

    if (!datasetId) {
      return res.status(400).json({ error: 'Dataset selection is required.' });
    }

    const dsRows = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, datasetId), eq(datasets.ownerUid, uid)))
      .limit(1);

    if (dsRows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    const ds = dsRows[0];
    const safePath = verifyStoredPath(ds.storagePath);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Dataset file could not be read from storage.' });
    }

    const rawText = fs.readFileSync(safePath, 'utf8');
    const parsed = detectAndParseEdnaFile(rawText, ds.fileName);

    const selectedPipeline =
      typeof pipelineName === 'string' && pipelineName.trim()
        ? pipelineName.trim().slice(0, 120)
        : parsed.hasTaxonomicData
          ? 'EcoTrace Taxonomic Table & Biodiversity Calculator'
          : 'EcoTrace Sequence QC Inspector';

    if (!parsed.hasTaxonomicData) {
      // Raw FASTA / FASTQ without taxonomic classifier connected:
      // Record accurate sequence QC and mark status 'unprocessed' (never fabricate species!)
      const created = await db
        .insert(analyses)
        .values({
          ownerUid: uid,
          projectId: ds.projectId,
          datasetId: ds.id,
          sampleId: ds.sampleId,
          pipelineName: selectedPipeline,
          pipelineVersion: '1.0.0',
          status: 'unprocessed',
          isDemo: false,
          completedAt: new Date(),
          metadata: {
            format: parsed.format,
            sequenceQc: parsed.sequenceQc,
            warnings: parsed.warnings,
            requiresExternalClassifier: true,
          },
        })
        .returning();

      await db.insert(activityLogs).values({
        ownerUid: uid,
        eventType: 'analysis_completed',
        title: `Sequence QC completed for "${ds.name}"`,
        description: `${parsed.sequenceCount} sequences inspected · External classifier required for taxonomy`,
        entityId: created[0].id,
      });

      return res.status(201).json({
        analysis: created[0],
        taxa: [],
        metrics: [],
        sequenceQc: parsed.sequenceQc,
        warnings: parsed.warnings,
      });
    }

    // Validated taxonomic table: persist taxa & exact biodiversity metrics across taxonomic ranks
    const created = await db
      .insert(analyses)
      .values({
        ownerUid: uid,
        projectId: ds.projectId,
        datasetId: ds.id,
        sampleId: ds.sampleId,
        pipelineName: selectedPipeline,
        pipelineVersion: '1.0.0',
        status: 'completed',
        isDemo: false,
        completedAt: new Date(),
        metadata: {
          format: parsed.format,
          rowCount: parsed.rowCount,
          totalReads: parsed.sequenceCount,
          warnings: parsed.warnings,
        },
      })
      .returning();

    const analysisId = created[0].id;

    if (parsed.taxa.length > 0) {
      await db.insert(taxonomicResults).values(
        parsed.taxa.map((t) => ({
          analysisId,
          sampleId: ds.sampleId,
          ownerUid: uid,
          taxonName: t.taxonName,
          taxonRank: t.taxonRank,
          kingdom: t.kingdom,
          phylum: t.phylum,
          className: t.className,
          orderName: t.orderName,
          family: t.family,
          genus: t.genus,
          species: t.species,
          readCount: t.readCount,
          relativeAbundance: t.relativeAbundance,
          confidenceScore: t.confidenceScore,
          referenceDatabase: t.referenceDatabase,
          identificationStatus: t.identificationStatus,
          sequenceIdentifier: t.sequenceIdentifier,
        }))
      );
    }

    const levels: Array<'Species' | 'Genus' | 'Family' | 'Order' | 'Phylum'> = [
      'Species',
      'Genus',
      'Family',
      'Order',
      'Phylum',
    ];
    const metricsPayload = levels.map((lvl) => {
      const m = computeBiodiversityMetrics(parsed.taxa, lvl);
      return {
        analysisId,
        sampleId: ds.sampleId,
        ownerUid: uid,
        taxonLevel: m.taxonLevel,
        speciesRichness: m.speciesRichness,
        shannonIndex: m.shannonIndex,
        simpsonDominance: m.simpsonDominance,
        simpsonIndex: m.simpsonIndex,
        simpsonInverse: m.simpsonInverse,
        simpsonConvention: m.simpsonConvention,
        pielouEvenness: m.pielouEvenness,
        totalReads: m.totalReads,
      };
    });

    const insertedMetrics = await db.insert(biodiversityMetrics).values(metricsPayload).returning();
    const insertedTaxa = await db.select().from(taxonomicResults).where(eq(taxonomicResults.analysisId, analysisId));

    await db.insert(activityLogs).values({
      ownerUid: uid,
      eventType: 'analysis_completed',
      title: `Biodiversity analysis completed for "${ds.name}"`,
      description: `S=${metricsPayload[0].speciesRichness} · H'=${metricsPayload[0].shannonIndex.toFixed(3)} · 1-D=${metricsPayload[0].simpsonIndex.toFixed(3)}`,
      entityId: analysisId,
    });

    res.status(201).json({
      analysis: created[0],
      taxa: insertedTaxa,
      metrics: insertedMetrics,
      warnings: parsed.warnings,
    });
  } catch (err) {
    console.error('Analysis execution error:', err);
    res.status(500).json({ error: 'Failed to execute eDNA analysis.' });
  }
});

// Taxonomic Explorer query endpoint
app.get('/api/taxonomy', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const rows = await db
      .select({
        id: taxonomicResults.id,
        analysisId: taxonomicResults.analysisId,
        sampleId: taxonomicResults.sampleId,
        taxonName: taxonomicResults.taxonName,
        taxonRank: taxonomicResults.taxonRank,
        kingdom: taxonomicResults.kingdom,
        phylum: taxonomicResults.phylum,
        className: taxonomicResults.className,
        orderName: taxonomicResults.orderName,
        family: taxonomicResults.family,
        genus: taxonomicResults.genus,
        species: taxonomicResults.species,
        readCount: taxonomicResults.readCount,
        relativeAbundance: taxonomicResults.relativeAbundance,
        confidenceScore: taxonomicResults.confidenceScore,
        referenceDatabase: taxonomicResults.referenceDatabase,
        identificationStatus: taxonomicResults.identificationStatus,
        sequenceIdentifier: taxonomicResults.sequenceIdentifier,
        projectId: analyses.projectId,
        datasetId: analyses.datasetId,
      })
      .from(taxonomicResults)
      .innerJoin(analyses, eq(taxonomicResults.analysisId, analyses.id))
      .where(eq(taxonomicResults.ownerUid, uid));

    res.json({ taxa: rows });
  } catch (err) {
    console.error('Get taxonomy error:', err);
    res.status(500).json({ error: 'Failed to load taxonomic results.' });
  }
});

// Reports CRUD
app.get('/api/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const rows = await db.select().from(reports).where(eq(reports.ownerUid, uid)).orderBy(desc(reports.createdAt));
    res.json({ reports: rows });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Failed to load saved reports.' });
  }
});

app.post('/api/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { projectId, analysisId, reportName, reportType, summaryData } = req.body || {};

    if (!projectId || !reportName) {
      return res.status(400).json({ error: 'Project and report title are required.' });
    }

    const proj = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerUid, uid)))
      .limit(1);

    if (proj.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const created = await db
      .insert(reports)
      .values({
        ownerUid: uid,
        projectId,
        analysisId: analysisId || null,
        reportName: String(reportName).trim().slice(0, 160),
        reportType: typeof reportType === 'string' ? reportType.trim().slice(0, 80) : 'Biodiversity Assessment',
        summaryData: typeof summaryData === 'object' && summaryData ? summaryData : {},
      })
      .returning();

    await db.insert(activityLogs).values({
      ownerUid: uid,
      eventType: 'report_generated',
      title: `Generated report "${created[0].reportName}"`,
      description: created[0].reportType,
      entityId: created[0].id,
    });

    res.status(201).json({ report: created[0] });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Failed to save report.' });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.appUser!.uid;
    const { id } = req.params;
    const deleted = await db
      .delete(reports)
      .where(and(eq(reports.id, id), eq(reports.ownerUid, uid)))
      .returning();
    if (deleted.length === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

// ========================
// ADMIN ENDPOINTS (Server-Verified Role)
// ========================
app.get('/api/admin/overview', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [allUsers, allProjects, allDatasets, allAnalyses, logs] = await Promise.all([
      db.select().from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(projects),
      db.select({ count: sql<number>`count(*)::int` }).from(datasets),
      db.select({ count: sql<number>`count(*)::int` }).from(analyses),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(25),
    ]);

    await db.insert(auditLogs).values({
      actorUid: req.appUser!.uid,
      actorEmail: req.appUser!.email,
      action: 'admin_overview_viewed',
      targetType: 'system',
      details: { timestamp: new Date().toISOString() },
    });

    res.json({
      stats: {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter((u) => u.status === 'active').length,
        totalProjects: allProjects[0]?.count ?? 0,
        totalDatasets: allDatasets[0]?.count ?? 0,
        totalAnalyses: allAnalyses[0]?.count ?? 0,
      },
      auditLogs: logs,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to load administrator overview.' });
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        institution: users.institution,
        researchInterest: users.researchInterest,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json({ users: rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

app.patch('/api/admin/users/:uid/status', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { status } = req.body || {};

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "disabled".' });
    }
    if (uid === req.appUser!.uid && status === 'disabled') {
      return res.status(400).json({ error: 'Administrators cannot disable their own active account.' });
    }

    const updated = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.uid, uid))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.insert(auditLogs).values({
      actorUid: req.appUser!.uid,
      actorEmail: req.appUser!.email,
      action: status === 'disabled' ? 'user_disabled' : 'user_enabled',
      targetType: 'user',
      targetId: uid,
      details: { targetEmail: updated[0].email, newStatus: status },
    });

    res.json({ user: updated[0] });
  } catch (err) {
    console.error('Admin update user status error:', err);
    res.status(500).json({ error: 'Failed to update user account status.' });
  }
});

app.get('/api/admin/datasets', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        fileName: datasets.fileName,
        fileFormat: datasets.fileFormat,
        fileSize: datasets.fileSize,
        rowCount: datasets.rowCount,
        uploadStatus: datasets.uploadStatus,
        ownerUid: datasets.ownerUid,
        ownerEmail: users.email,
        createdAt: datasets.createdAt,
      })
      .from(datasets)
      .leftJoin(users, eq(datasets.ownerUid, users.uid))
      .orderBy(desc(datasets.createdAt));

    res.json({ datasets: rows });
  } catch (err) {
    console.error('Admin datasets error:', err);
    res.status(500).json({ error: 'Failed to load datasets.' });
  }
});

app.delete('/api/admin/datasets/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(datasets).where(eq(datasets.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }

    const safePath = verifyStoredPath(deleted[0].storagePath);
    if (safePath && fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }

    await db.insert(auditLogs).values({
      actorUid: req.appUser!.uid,
      actorEmail: req.appUser!.email,
      action: 'dataset_removed_by_admin',
      targetType: 'dataset',
      targetId: id,
      details: { fileName: deleted[0].fileName, ownerUid: deleted[0].ownerUid },
    });

    res.json({ deleted: true });
  } catch (err) {
    console.error('Admin delete dataset error:', err);
    res.status(500).json({ error: 'Failed to remove dataset.' });
  }
});

app.post('/api/admin/reference-databases', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, markerGene, version, sourceUrl, status, notes } = req.body || {};
    if (!name || !markerGene || !version) {
      return res.status(400).json({ error: 'Name, marker gene, and version are required.' });
    }

    const created = await db
      .insert(referenceDatabases)
      .values({
        name: String(name).trim().slice(0, 140),
        markerGene: String(markerGene).trim().slice(0, 100),
        version: String(version).trim().slice(0, 40),
        sourceUrl: typeof sourceUrl === 'string' ? sourceUrl.trim().slice(0, 300) : '',
        status: typeof status === 'string' ? status.trim().slice(0, 60) : 'Configured Metadata',
        notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
      })
      .returning();

    await db.insert(auditLogs).values({
      actorUid: req.appUser!.uid,
      actorEmail: req.appUser!.email,
      action: 'reference_database_added',
      targetType: 'reference_database',
      targetId: created[0].id,
      details: { name: created[0].name, version: created[0].version },
    });

    res.status(201).json({ database: created[0] });
  } catch (err) {
    console.error('Admin add ref DB error:', err);
    res.status(500).json({ error: 'Failed to add reference database.' });
  }
});

app.get('/api/admin/announcements', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    res.json({ announcements: rows });
  } catch (err) {
    console.error('Admin get announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

app.post('/api/admin/announcements', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, severity } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and message body are required.' });
    }

    const created = await db
      .insert(announcements)
      .values({
        title: String(title).trim().slice(0, 140),
        body: String(body).trim().slice(0, 1000),
        severity: ['info', 'warning'].includes(severity) ? severity : 'info',
        isActive: true,
        createdByUid: req.appUser!.uid,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorUid: req.appUser!.uid,
      actorEmail: req.appUser!.email,
      action: 'announcement_published',
      targetType: 'announcement',
      targetId: created[0].id,
      details: { title: created[0].title },
    });

    res.status(201).json({ announcement: created[0] });
  } catch (err) {
    console.error('Admin create announcement error:', err);
    res.status(500).json({ error: 'Failed to publish announcement.' });
  }
});

app.patch('/api/admin/announcements/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};
    const updated = await db
      .update(announcements)
      .set({ isActive: Boolean(isActive) })
      .where(eq(announcements.id, id))
      .returning();
    if (updated.length === 0) return res.status(404).json({ error: 'Announcement not found.' });
    res.json({ announcement: updated[0] });
  } catch (err) {
    console.error('Admin toggle announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

app.get('/api/admin/audit-logs', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json({ auditLogs: rows });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Vite / Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoTrace server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
