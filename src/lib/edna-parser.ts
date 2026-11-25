export type SupportedFormat = 'CSV' | 'TSV' | 'TXT' | 'JSON' | 'FASTA' | 'FASTQ';

export interface ParsedTaxonRecord {
  taxonName: string;
  taxonRank: string;
  kingdom: string;
  phylum: string;
  className: string;
  orderName: string;
  family: string;
  genus: string;
  species: string;
  readCount: number;
  relativeAbundance: number;
  confidenceScore: number | null;
  referenceDatabase: string;
  identificationStatus: string;
  sequenceIdentifier: string;
}

export interface SequenceQcStats {
  sequenceCount: number;
  totalBases: number;
  meanLength: number;
  minLength: number;
  maxLength: number;
  gcPercent: number;
  meanQualityScore: number | null;
}

export interface ParsedEdnaDataset {
  format: SupportedFormat;
  rowCount: number;
  sequenceCount: number;
  columns: string[];
  previewRows: Record<string, unknown>[];
  taxa: ParsedTaxonRecord[];
  hasTaxonomicData: boolean;
  sequenceQc: SequenceQcStats | null;
  warnings: string[];
}

export interface BiodiversitySummary {
  taxonLevel: string;
  speciesRichness: number;
  totalReads: number;
  shannonIndex: number;
  simpsonDominance: number;
  simpsonIndex: number; // 1 - D (Gini-Simpson)
  simpsonInverse: number; // 1 / D
  simpsonConvention: string;
  pielouEvenness: number | null;
}

export function detectFileFormat(fileName: string): SupportedFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'csv') return 'CSV';
  if (ext === 'tsv') return 'TSV';
  if (ext === 'txt') return 'TXT';
  if (ext === 'json') return 'JSON';
  if (ext === 'fasta' || ext === 'fa' || ext === 'fna') return 'FASTA';
  if (ext === 'fastq' || ext === 'fq') return 'FASTQ';
  return null;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function pickField(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== '') return row[c];
  }
  return '';
}

function mapRowsToTaxa(rawRows: Record<string, string>[]): ParsedTaxonRecord[] {
  const normalizedRows = rawRows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeader(k)] = String(v ?? '').trim();
    }
    return out;
  });

  const preliminary: Omit<ParsedTaxonRecord, 'relativeAbundance'>[] = [];

  for (const row of normalizedRows) {
    const species = pickField(row, ['species', 'taxon_species']);
    const genus = pickField(row, ['genus']);
    const family = pickField(row, ['family']);
    const orderName = pickField(row, ['order', 'order_name']);
    const className = pickField(row, ['class', 'class_name']);
    const phylum = pickField(row, ['phylum']);
    const kingdom = pickField(row, ['kingdom', 'superkingdom', 'domain']);
    const explicitTaxon = pickField(row, [
      'taxon_name',
      'scientific_name',
      'taxon',
      'organism',
      'otu_taxonomy',
      'taxonomy',
    ]);

    const taxonName =
      explicitTaxon || species || genus || family || orderName || className || phylum || kingdom;

    if (!taxonName) continue;

    const readStr = pickField(row, [
      'read_count',
      'reads',
      'count',
      'abundance',
      'sequence_count',
      'hits',
    ]);
    const parsedReads = readStr ? Number(readStr) : 1;
    const readCount = Number.isFinite(parsedReads) && parsedReads >= 0 ? Math.round(parsedReads) : 0;

    const confStr = pickField(row, ['confidence', 'confidence_score', 'identity', 'pident', 'score']);
    let confidenceScore: number | null = null;
    if (confStr) {
      const num = Number(confStr);
      if (Number.isFinite(num)) {
        confidenceScore = num > 1 && num <= 100 ? Number((num / 100).toFixed(4)) : Number(num.toFixed(4));
      }
    }

    const taxonRank =
      pickField(row, ['taxon_rank', 'rank']) ||
      (species ? 'Species' : genus ? 'Genus' : family ? 'Family' : orderName ? 'Order' : className ? 'Class' : phylum ? 'Phylum' : 'Kingdom');

    const referenceDatabase =
      pickField(row, ['reference_database', 'database', 'ref_db', 'source_db']) ||
      'User-Provided Taxonomic Table';

    const sequenceIdentifier = pickField(row, ['sequence_identifier', 'sequence_id', 'seq_id', 'asv_id', 'otu_id', 'accession']);
    const identificationStatus =
      pickField(row, ['identification_status', 'status']) || 'Parsed from Dataset';

    preliminary.push({
      taxonName,
      taxonRank,
      kingdom: kingdom || 'Unassigned',
      phylum: phylum || 'Unassigned',
      className: className || 'Unassigned',
      orderName: orderName || 'Unassigned',
      family: family || 'Unassigned',
      genus: genus || 'Unassigned',
      species: species || (taxonRank.toLowerCase() === 'species' ? taxonName : 'Unassigned'),
      readCount,
      confidenceScore,
      referenceDatabase,
      identificationStatus,
      sequenceIdentifier,
    });
  }

  const totalReads = preliminary.reduce((acc, r) => acc + r.readCount, 0);
  return preliminary.map((item) => ({
    ...item,
    relativeAbundance: totalReads > 0 ? Number((item.readCount / totalReads).toFixed(6)) : 0,
  }));
}

export function detectAndParseEdnaFile(content: string, fileName: string): ParsedEdnaDataset {
  const format = detectFileFormat(fileName);
  if (!format) {
    throw new Error('Unsupported file format. Accepted formats: CSV, TSV, TXT, JSON, FASTA, FASTQ.');
  }

  const trimmed = content.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error('Uploaded file is empty.');
  }

  if (format === 'FASTA') {
    const lines = trimmed.split(/\r?\n/);
    const sequences: { id: string; description: string; length: number; gcCount: number; preview: string }[] = [];
    let currentId = '';
    let currentDesc = '';
    let currentSeq = '';

    const flush = () => {
      if (!currentId) return;
      const clean = currentSeq.replace(/\s+/g, '').toUpperCase();
      const gcCount = (clean.match(/[GC]/g) || []).length;
      sequences.push({
        id: currentId,
        description: currentDesc,
        length: clean.length,
        gcCount,
        preview: clean.slice(0, 48) + (clean.length > 48 ? '...' : ''),
      });
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        flush();
        const header = line.slice(1).trim();
        const spaceIdx = header.search(/\s/);
        currentId = spaceIdx === -1 ? header : header.slice(0, spaceIdx);
        currentDesc = spaceIdx === -1 ? '' : header.slice(spaceIdx + 1).trim();
        currentSeq = '';
      } else {
        currentSeq += line;
      }
    }
    flush();

    if (sequences.length === 0) {
      throw new Error('No valid FASTA records starting with ">" were found.');
    }

    const totalBases = sequences.reduce((s, r) => s + r.length, 0);
    const totalGc = sequences.reduce((s, r) => s + r.gcCount, 0);
    const lengths = sequences.map((s) => s.length);

    return {
      format: 'FASTA',
      rowCount: sequences.length,
      sequenceCount: sequences.length,
      columns: ['sequence_id', 'description', 'length_bp', 'gc_percent', 'sequence_preview'],
      previewRows: sequences.slice(0, 12).map((s) => ({
        sequence_id: s.id,
        description: s.description || '—',
        length_bp: s.length,
        gc_percent: s.length > 0 ? Number(((s.gcCount / s.length) * 100).toFixed(1)) : 0,
        sequence_preview: s.preview,
      })),
      taxa: [],
      hasTaxonomicData: false,
      sequenceQc: {
        sequenceCount: sequences.length,
        totalBases,
        meanLength: Number((totalBases / sequences.length).toFixed(1)),
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        gcPercent: totalBases > 0 ? Number(((totalGc / totalBases) * 100).toFixed(2)) : 0,
        meanQualityScore: null,
      },
      warnings: [
        'FASTA contains raw nucleotide sequences without taxonomic assignments. Sequence QC metrics are computed directly; external BLAST/SILVA/BOLD alignment is required for automated species classification.',
      ],
    };
  }

  if (format === 'FASTQ') {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length < 4 || !lines[0].startsWith('@')) {
      throw new Error('Invalid FASTQ structure. Expected 4-line records starting with "@".');
    }

    const sequences: { id: string; length: number; gcCount: number; meanQ: number; preview: string }[] = [];
    for (let i = 0; i + 3 < lines.length; i += 4) {
      const header = lines[i].trim();
      const seq = lines[i + 1].trim().toUpperCase();
      const plus = lines[i + 2].trim();
      const qual = lines[i + 3].trim();
      if (!header.startsWith('@') || !plus.startsWith('+')) continue;
      const gcCount = (seq.match(/[GC]/g) || []).length;
      let qSum = 0;
      for (let j = 0; j < qual.length; j++) {
        qSum += qual.charCodeAt(j) - 33;
      }
      const meanQ = qual.length > 0 ? qSum / qual.length : 0;
      sequences.push({
        id: header.slice(1).split(/\s+/)[0],
        length: seq.length,
        gcCount,
        meanQ,
        preview: seq.slice(0, 48) + (seq.length > 48 ? '...' : ''),
      });
    }

    if (sequences.length === 0) {
      throw new Error('No valid 4-line FASTQ reads were parsed.');
    }

    const totalBases = sequences.reduce((s, r) => s + r.length, 0);
    const totalGc = sequences.reduce((s, r) => s + r.gcCount, 0);
    const lengths = sequences.map((s) => s.length);
    const avgQ = sequences.reduce((s, r) => s + r.meanQ, 0) / sequences.length;

    return {
      format: 'FASTQ',
      rowCount: sequences.length,
      sequenceCount: sequences.length,
      columns: ['read_id', 'length_bp', 'mean_phred_q', 'gc_percent', 'sequence_preview'],
      previewRows: sequences.slice(0, 12).map((s) => ({
        read_id: s.id,
        length_bp: s.length,
        mean_phred_q: Number(s.meanQ.toFixed(1)),
        gc_percent: s.length > 0 ? Number(((s.gcCount / s.length) * 100).toFixed(1)) : 0,
        sequence_preview: s.preview,
      })),
      taxa: [],
      hasTaxonomicData: false,
      sequenceQc: {
        sequenceCount: sequences.length,
        totalBases,
        meanLength: Number((totalBases / sequences.length).toFixed(1)),
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        gcPercent: totalBases > 0 ? Number(((totalGc / totalBases) * 100).toFixed(2)) : 0,
        meanQualityScore: Number(avgQ.toFixed(2)),
      },
      warnings: [
        'FASTQ contains raw sequencing reads with Phred quality scores. Read QC is computed directly; external denoising & classifier pipeline (DADA2/BLAST) is required for species-level assignment.',
      ],
    };
  }

  if (format === 'JSON') {
    const parsed = JSON.parse(trimmed);
    const arr: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.records)
        ? parsed.records
        : Array.isArray(parsed?.taxa)
          ? parsed.taxa
          : Array.isArray(parsed?.data)
            ? parsed.data
            : [];

    if (!arr.length) {
      throw new Error('JSON file must contain an array of records or a "records" / "taxa" array.');
    }

    const columns = Array.from(new Set(arr.flatMap((obj) => Object.keys(obj))));
    const stringRows = arr.map((obj) => {
      const rec: Record<string, string> = {};
      for (const col of columns) {
        rec[col] = obj[col] === null || obj[col] === undefined ? '' : String(obj[col]);
      }
      return rec;
    });

    const taxa = mapRowsToTaxa(stringRows);
    return {
      format: 'JSON',
      rowCount: arr.length,
      sequenceCount: taxa.reduce((s, t) => s + t.readCount, 0),
      columns,
      previewRows: arr.slice(0, 12),
      taxa,
      hasTaxonomicData: taxa.length > 0,
      sequenceQc: null,
      warnings:
        taxa.length === 0
          ? ['No recognized taxonomic columns (e.g. species, taxon_name, genus) were detected in this JSON dataset.']
          : [],
    };
  }

  // CSV, TSV, or TXT
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Delimited file must include a header row and at least one data row.');
  }

  const firstLine = lines[0];
  const delimiter =
    format === 'TSV'
      ? '\t'
      : firstLine.includes('\t') && !firstLine.includes(',')
        ? '\t'
        : firstLine.includes(';') && !firstLine.includes(',')
          ? ';'
          : ',';

  const columns = splitDelimitedLine(firstLine, delimiter);
  const rawRows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitDelimitedLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] ?? '';
    });
    rawRows.push(row);
  }

  const taxa = mapRowsToTaxa(rawRows);
  return {
    format,
    rowCount: rawRows.length,
    sequenceCount: taxa.reduce((s, t) => s + t.readCount, 0),
    columns,
    previewRows: rawRows.slice(0, 12),
    taxa,
    hasTaxonomicData: taxa.length > 0,
    sequenceQc: null,
    warnings:
      taxa.length === 0
        ? ['No recognized taxonomic columns (e.g. scientific_name, species, genus, read_count) were detected.']
        : [],
  };
}

export function computeBiodiversityMetrics(
  taxa: ParsedTaxonRecord[],
  taxonLevel: 'Species' | 'Genus' | 'Family' | 'Order' | 'Phylum' = 'Species'
): BiodiversitySummary {
  const countsByGroup = new Map<string, number>();

  for (const item of taxa) {
    let key = item.taxonName;
    if (taxonLevel === 'Species') {
      key = item.species !== 'Unassigned' ? item.species : item.taxonName;
    } else if (taxonLevel === 'Genus') {
      key = item.genus !== 'Unassigned' ? item.genus : item.taxonName;
    } else if (taxonLevel === 'Family') {
      key = item.family !== 'Unassigned' ? item.family : item.taxonName;
    } else if (taxonLevel === 'Order') {
      key = item.orderName !== 'Unassigned' ? item.orderName : item.taxonName;
    } else if (taxonLevel === 'Phylum') {
      key = item.phylum !== 'Unassigned' ? item.phylum : item.taxonName;
    }

    if (!key || key === 'Unassigned' || item.readCount <= 0) continue;
    countsByGroup.set(key, (countsByGroup.get(key) ?? 0) + item.readCount);
  }

  const counts = Array.from(countsByGroup.values());
  const speciesRichness = counts.length;
  const totalReads = counts.reduce((sum, n) => sum + n, 0);

  if (speciesRichness === 0 || totalReads === 0) {
    return {
      taxonLevel,
      speciesRichness: 0,
      totalReads: 0,
      shannonIndex: 0,
      simpsonDominance: 0,
      simpsonIndex: 0,
      simpsonInverse: 0,
      simpsonConvention: '1 - D (Gini-Simpson Diversity)',
      pielouEvenness: null,
    };
  }

  let shannon = 0;
  let simpsonD = 0;

  for (const n of counts) {
    const p = n / totalReads;
    if (p > 0) {
      shannon -= p * Math.log(p);
      simpsonD += p * p;
    }
  }

  const simpsonDiversity = Math.max(0, 1 - simpsonD);
  const simpsonInverse = simpsonD > 0 ? 1 / simpsonD : 0;
  const pielouEvenness = speciesRichness > 1 ? shannon / Math.log(speciesRichness) : null;

  return {
    taxonLevel,
    speciesRichness,
    totalReads,
    shannonIndex: Number(shannon.toFixed(4)),
    simpsonDominance: Number(simpsonD.toFixed(4)),
    simpsonIndex: Number(simpsonDiversity.toFixed(4)),
    simpsonInverse: Number(simpsonInverse.toFixed(4)),
    simpsonConvention: '1 - D (Gini-Simpson Diversity)',
    pielouEvenness: pielouEvenness !== null ? Number(pielouEvenness.toFixed(4)) : null,
  };
}
