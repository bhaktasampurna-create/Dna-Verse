import { BiodiversitySummary, computeBiodiversityMetrics, ParsedTaxonRecord } from '../lib/edna-parser.ts';

export interface DemoSampleRecord {
  id: string;
  projectId: string;
  projectName: string;
  sampleName: string;
  sampleCode: string;
  environment: 'Freshwater' | 'Marine' | 'Wetland';
  location: string;
  collectionDate: string;
  markerGene: string;
  referenceDatabase: string;
  fileName: string;
  isDemo: true;
  taxa: ParsedTaxonRecord[];
  metrics: BiodiversitySummary;
}

function buildTaxa(
  rows: Array<{
    taxonName: string;
    kingdom: string;
    phylum: string;
    className: string;
    orderName: string;
    family: string;
    genus: string;
    species: string;
    readCount: number;
    confidenceScore: number;
    referenceDatabase: string;
    sequenceIdentifier: string;
  }>
): ParsedTaxonRecord[] {
  const total = rows.reduce((s, r) => s + r.readCount, 0);
  return rows.map((r) => ({
    ...r,
    taxonRank: 'Species',
    relativeAbundance: total > 0 ? Number((r.readCount / total).toFixed(6)) : 0,
    identificationStatus: 'Demonstration Taxonomic Record',
  }));
}

const cascadeTaxa = buildTaxa([
  {
    taxonName: 'Oncorhynchus mykiss',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Salmoniformes',
    family: 'Salmonidae',
    genus: 'Oncorhynchus',
    species: 'Oncorhynchus mykiss',
    readCount: 1420,
    confidenceScore: 0.992,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_ASV_001',
  },
  {
    taxonName: 'Salvelinus confluentus',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Salmoniformes',
    family: 'Salmonidae',
    genus: 'Salvelinus',
    species: 'Salvelinus confluentus',
    readCount: 680,
    confidenceScore: 0.985,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_ASV_002',
  },
  {
    taxonName: 'Cottus bairdii',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Scorpaeniformes',
    family: 'Cottidae',
    genus: 'Cottus',
    species: 'Cottus bairdii',
    readCount: 910,
    confidenceScore: 0.978,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_ASV_003',
  },
  {
    taxonName: 'Baetis tricaudatus',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Insecta',
    orderName: 'Ephemeroptera',
    family: 'Baetidae',
    genus: 'Baetis',
    species: 'Baetis tricaudatus',
    readCount: 1850,
    confidenceScore: 0.996,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_ASV_004',
  },
  {
    taxonName: 'Ephemerella invaria',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Insecta',
    orderName: 'Ephemeroptera',
    family: 'Ephemerellidae',
    genus: 'Ephemerella',
    species: 'Ephemerella invaria',
    readCount: 1120,
    confidenceScore: 0.989,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_ASV_005',
  },
  {
    taxonName: 'Hydropsyche oslari',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Insecta',
    orderName: 'Trichoptera',
    family: 'Hydropsychidae',
    genus: 'Hydropsyche',
    species: 'Hydropsyche oslari',
    readCount: 740,
    confidenceScore: 0.971,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_ASV_006',
  },
  {
    taxonName: 'Ascaphus truei',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Amphibia',
    orderName: 'Anura',
    family: 'Ascaphidae',
    genus: 'Ascaphus',
    species: 'Ascaphus truei',
    readCount: 390,
    confidenceScore: 0.964,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_ASV_007',
  },
  {
    taxonName: 'Pacifastacus leniusculus',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Malacostraca',
    orderName: 'Decapoda',
    family: 'Astacidae',
    genus: 'Pacifastacus',
    species: 'Pacifastacus leniusculus',
    readCount: 530,
    confidenceScore: 0.981,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_ASV_008',
  },
]);

const kelpTaxa = buildTaxa([
  {
    taxonName: 'Macrocystis pyrifera',
    kingdom: 'Chromista',
    phylum: 'Ochrophyta',
    className: 'Phaeophyceae',
    orderName: 'Laminariales',
    family: 'Laminariaceae',
    genus: 'Macrocystis',
    species: 'Macrocystis pyrifera',
    readCount: 2450,
    confidenceScore: 0.995,
    referenceDatabase: 'Demo Reference (SILVA 18S)',
    sequenceIdentifier: 'DEMO_MAR_001',
  },
  {
    taxonName: 'Sebastes mystinus',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Scorpaeniformes',
    family: 'Sebastidae',
    genus: 'Sebastes',
    species: 'Sebastes mystinus',
    readCount: 1180,
    confidenceScore: 0.988,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_MAR_002',
  },
  {
    taxonName: 'Strongylocentrotus purpuratus',
    kingdom: 'Animalia',
    phylum: 'Echinodermata',
    className: 'Echinoidea',
    orderName: 'Camarodonta',
    family: 'Strongylocentrotidae',
    genus: 'Strongylocentrotus',
    species: 'Strongylocentrotus purpuratus',
    readCount: 960,
    confidenceScore: 0.991,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_MAR_003',
  },
  {
    taxonName: 'Oxyjulis californica',
    kingdom: 'Animalia',
    phylum: 'Chordata',
    className: 'Actinopterygii',
    orderName: 'Labriformes',
    family: 'Labridae',
    genus: 'Oxyjulis',
    species: 'Oxyjulis californica',
    readCount: 810,
    confidenceScore: 0.976,
    referenceDatabase: 'Demo Reference (NCBI 12S)',
    sequenceIdentifier: 'DEMO_MAR_004',
  },
  {
    taxonName: 'Haliotis rufescens',
    kingdom: 'Animalia',
    phylum: 'Mollusca',
    className: 'Gastropoda',
    orderName: 'Lepetellida',
    family: 'Haliotidae',
    genus: 'Haliotis',
    species: 'Haliotis rufescens',
    readCount: 470,
    confidenceScore: 0.984,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_MAR_005',
  },
  {
    taxonName: 'Pycnopodia helianthoides',
    kingdom: 'Animalia',
    phylum: 'Echinodermata',
    className: 'Asteroidea',
    orderName: 'Forcipulatida',
    family: 'Asteriidae',
    genus: 'Pycnopodia',
    species: 'Pycnopodia helianthoides',
    readCount: 290,
    confidenceScore: 0.969,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_MAR_006',
  },
  {
    taxonName: 'Pacifastacus leniusculus',
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    className: 'Malacostraca',
    orderName: 'Decapoda',
    family: 'Astacidae',
    genus: 'Pacifastacus',
    species: 'Pacifastacus leniusculus',
    readCount: 120,
    confidenceScore: 0.912,
    referenceDatabase: 'Demo Reference (BOLD COI)',
    sequenceIdentifier: 'DEMO_MAR_007',
  },
]);

const wetlandTaxa = buildTaxa([
  {
    taxonName: 'Desulfovibrio vulgaris',
    kingdom: 'Bacteria',
    phylum: 'Pseudomonadota',
    className: 'Deltaproteobacteria',
    orderName: 'Desulfovibrionales',
    family: 'Desulfovibrionaceae',
    genus: 'Desulfovibrio',
    species: 'Desulfovibrio vulgaris',
    readCount: 1920,
    confidenceScore: 0.987,
    referenceDatabase: 'Demo Reference (SILVA 16S)',
    sequenceIdentifier: 'DEMO_WET_001',
  },
  {
    taxonName: 'Nitrosomonas europaea',
    kingdom: 'Bacteria',
    phylum: 'Pseudomonadota',
    className: 'Betaproteobacteria',
    orderName: 'Nitrosomonadales',
    family: 'Nitrosomonadaceae',
    genus: 'Nitrosomonas',
    species: 'Nitrosomonas europaea',
    readCount: 1410,
    confidenceScore: 0.982,
    referenceDatabase: 'Demo Reference (SILVA 16S)',
    sequenceIdentifier: 'DEMO_WET_002',
  },
  {
    taxonName: 'Geobacter sulfurreducens',
    kingdom: 'Bacteria',
    phylum: 'Pseudomonadota',
    className: 'Deltaproteobacteria',
    orderName: 'Desulfuromonadales',
    family: 'Geobacteraceae',
    genus: 'Geobacter',
    species: 'Geobacter sulfurreducens',
    readCount: 1680,
    confidenceScore: 0.991,
    referenceDatabase: 'Demo Reference (SILVA 16S)',
    sequenceIdentifier: 'DEMO_WET_003',
  },
  {
    taxonName: 'Salicornia pacifica',
    kingdom: 'Plantae',
    phylum: 'Tracheophyta',
    className: 'Magnoliopsida',
    orderName: 'Caryophyllales',
    family: 'Amaranthaceae',
    genus: 'Salicornia',
    species: 'Salicornia pacifica',
    readCount: 980,
    confidenceScore: 0.974,
    referenceDatabase: 'Demo Reference (ITS2)',
    sequenceIdentifier: 'DEMO_WET_004',
  },
  {
    taxonName: 'Rhizophagus irregularis',
    kingdom: 'Fungi',
    phylum: 'Mucoromycota',
    className: 'Glomeromycetes',
    orderName: 'Glomerales',
    family: 'Glomeraceae',
    genus: 'Rhizophagus',
    species: 'Rhizophagus irregularis',
    readCount: 640,
    confidenceScore: 0.968,
    referenceDatabase: 'Demo Reference (UNITE ITS)',
    sequenceIdentifier: 'DEMO_WET_005',
  },
]);

export const DEMO_SAMPLES: DemoSampleRecord[] = [
  {
    id: 'demo-cascade-stream',
    projectId: 'demo-proj-1',
    projectName: 'Cascade Watershed Riparian Bioassessment (Demo)',
    sampleName: 'Upper McKenzie Riffle — 2L Sterivex',
    sampleCode: 'CAS-MCK-01',
    environment: 'Freshwater',
    location: '44.172° N, 122.054° W · Oregon Cascades',
    collectionDate: '2026-09-14',
    markerGene: '12S MiFish + COI',
    referenceDatabase: 'Demonstration Dataset (NCBI 12S / BOLD COI)',
    fileName: 'cascade_riparian_demo.csv',
    isDemo: true,
    taxa: cascadeTaxa,
    metrics: computeBiodiversityMetrics(cascadeTaxa, 'Species'),
  },
  {
    id: 'demo-monterey-kelp',
    projectId: 'demo-proj-2',
    projectName: 'Monterey Bay Kelp Canopy Transect (Demo)',
    sampleName: 'Point Lobos Subtidal Reef — 12m',
    sampleCode: 'MBY-PLB-04',
    environment: 'Marine',
    location: '36.521° N, 121.951° W · Monterey Bay',
    collectionDate: '2026-10-02',
    markerGene: '12S / 18S / COI',
    referenceDatabase: 'Demonstration Dataset (NCBI / SILVA / BOLD)',
    fileName: 'monterey_kelp_demo.csv',
    isDemo: true,
    taxa: kelpTaxa,
    metrics: computeBiodiversityMetrics(kelpTaxa, 'Species'),
  },
  {
    id: 'demo-nisqually-wetland',
    projectId: 'demo-proj-3',
    projectName: 'Nisqually Delta Estuarine Sediment Survey (Demo)',
    sampleName: 'Tidal Marsh Sediment Core B2',
    sampleCode: 'NSQ-WET-02',
    environment: 'Wetland',
    location: '47.079° N, 122.708° W · Puget Sound',
    collectionDate: '2026-08-27',
    markerGene: '16S V4 + ITS2',
    referenceDatabase: 'Demonstration Dataset (SILVA 16S / UNITE)',
    fileName: 'nisqually_wetland_demo.csv',
    isDemo: true,
    taxa: wetlandTaxa,
    metrics: computeBiodiversityMetrics(wetlandTaxa, 'Species'),
  },
];

export const SAMPLE_DOWNLOAD_CSV = `sequence_id,scientific_name,taxon_rank,kingdom,phylum,class,order,family,genus,species,read_count,confidence_score,reference_database
ASV_101,Oncorhynchus mykiss,Species,Animalia,Chordata,Actinopterygii,Salmoniformes,Salmonidae,Oncorhynchus,Oncorhynchus mykiss,1240,0.992,User-Provided 12S Table
ASV_102,Salmo trutta,Species,Animalia,Chordata,Actinopterygii,Salmoniformes,Salmonidae,Salmo,Salmo trutta,830,0.985,User-Provided 12S Table
ASV_103,Cottus gobio,Species,Animalia,Chordata,Actinopterygii,Scorpaeniformes,Cottidae,Cottus,Cottus gobio,645,0.979,User-Provided 12S Table
ASV_104,Baetis rhodani,Species,Animalia,Arthropoda,Insecta,Ephemeroptera,Baetidae,Baetis,Baetis rhodani,1590,0.995,User-Provided COI Table
ASV_105,Gammarus pulex,Species,Animalia,Arthropoda,Malacostraca,Amphipoda,Gammaridae,Gammarus,Gammarus pulex,1120,0.988,User-Provided COI Table
ASV_106,Hydropsyche pellucidula,Species,Animalia,Arthropoda,Insecta,Trichoptera,Hydropsychidae,Hydropsyche,Hydropsyche pellucidula,510,0.971,User-Provided COI Table
ASV_107,Rana temporaria,Species,Animalia,Chordata,Amphibia,Anura,Ranidae,Rana,Rana temporaria,275,0.964,User-Provided 12S Table
`;

export const SAMPLE_DOWNLOAD_FASTA = `>SEQ_001_12S_MiFish_F freshwater_riffle_sample
GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGGCTCAAGTTGATAGACACCGGCGTAAAGAGTGGTTAAGGAAATAAACTAATAAAGCCGAACACCTTCAGAGCTGTTATACGTACCCGAAAGCAAGAAGCCCAACCACGAAAGTAGCTTTAA
>SEQ_002_COI_Folmer freshwater_riffle_sample
GGTCAACAAATCATAAAGATATTGGAAACTTTATATTTTATTTTTGGAGCATGAGCAGGTATAGTAGGAACTTCTTTAAGTATTCTTATTCGTGCTGAACTAGGACATCCTGGATCTTTAATTGGAGATGATCAAATTTATAATGTAATTGTTACAGCTC
>SEQ_003_16S_V4 estuarine_sediment_sample
GTGCCAGCAGCCGCGGTAATACGTAGGGGGCAAGCGTTAATCGGAATTACTGGGCGTAAAGCGTGCGTAGGCGGTTTTTTAAGTCTGATGTGAAAGCCCCGGGCTCAACCTGGGAATTGCATTGGAGACTGGAAGGCTAGAGTATGGCAGAGGGGGGTAGAAT
`;
