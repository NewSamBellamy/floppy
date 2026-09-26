export const FLOPPY_GEOMETRY = Object.freeze({
  diskWidth: 'clamp(250px, 23vw, 320px)',
  diskAspectRatio: '1 / 1.04',
  artLeft: '10%',
  artWidth: '80%',
  artTop: '39%',
  labelBottom: '10%',
  artBorderRadius: '0px',
  artAspectRatio: 2,
});
export const FLOPPY_ART_WINDOW_ASPECT_RATIO = FLOPPY_GEOMETRY.artAspectRatio;
export const ART_GENERATION_RATIOS = Object.freeze(['1:1', '2:3', '3:2', '4:3', '3:4', '9:16', '16:9', '21:9']);
const ART_TYPES = new Set(['builtin', 'upload', 'generated', 'legacy']);
const REFERENCE_TYPES = new Set(['uploaded', 'current', 'project']);
const REFERENCE_IMAGE = /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function normalizeCrop(crop = {}) {
  return {
    x: Math.max(0, Math.min(1, finite(crop?.x, 0.5))),
    y: Math.max(0, Math.min(1, finite(crop?.y, 0.5))),
    zoom: Math.max(1, Math.min(3, finite(crop?.zoom, 1))),
  };
}

function normalizeReferences(references) {
  if (!Array.isArray(references)) return [];
  return references.slice(0, 4).flatMap((reference, index) => {
    if (!reference || typeof reference !== 'object') return [];
    const sourceUrl = typeof reference.sourceUrl === 'string' ? reference.sourceUrl : '';
    if (!REFERENCE_IMAGE.test(sourceUrl)) return [];
    const type = REFERENCE_TYPES.has(reference.type) ? reference.type : 'uploaded';
    return [{
      id: typeof reference.id === 'string' && reference.id ? reference.id : `reference-${index + 1}`,
      title: typeof reference.title === 'string' ? reference.title.slice(0, 120) : 'Image reference',
      type,
      sourceUrl,
    }];
  });
}

export function createProjectArt({
  sourceUrl = '',
  sourceType = 'builtin',
  prompt = '',
  useProjectContext = true,
  references = [],
  crop,
  generatedAt = null,
  updatedAt = null,
} = {}) {
  return {
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : '',
    sourceType: ART_TYPES.has(sourceType) ? sourceType : 'legacy',
    prompt: typeof prompt === 'string' ? prompt.slice(0, 4000) : '',
    useProjectContext: useProjectContext !== false,
    references: normalizeReferences(references),
    crop: normalizeCrop(crop),
    generatedAt: typeof generatedAt === 'string' ? generatedAt : null,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : null,
  };
}

export function normalizeProjectArt(value, legacySource = '') {
  if (typeof value === 'string') {
    return createProjectArt({ sourceUrl: value || legacySource, sourceType: 'legacy' });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createProjectArt({ sourceUrl: legacySource, sourceType: legacySource ? 'legacy' : 'builtin' });
  }
  return createProjectArt({ ...value, sourceUrl: value.sourceUrl || legacySource });
}

export function projectArtSource(project) {
  return typeof project?.projectArt?.sourceUrl === 'string'
    ? project.projectArt.sourceUrl
    : typeof project?.art === 'string' ? project.art : '';
}

export function cropImageStyle({ imageWidth, imageHeight, frameAspectRatio = FLOPPY_ART_WINDOW_ASPECT_RATIO, crop } = {}) {
  const width = finite(imageWidth, 0);
  const height = finite(imageHeight, 0);
  const frame = finite(frameAspectRatio, FLOPPY_ART_WINDOW_ASPECT_RATIO);
  if (width <= 0 || height <= 0 || frame <= 0) return null;

  const position = normalizeCrop(crop);
  const imageRatio = width / height;
  const baseWidth = Math.max(1, imageRatio / frame);
  const baseHeight = Math.max(1, frame / imageRatio);
  const scaledWidth = baseWidth * position.zoom;
  const scaledHeight = baseHeight * position.zoom;
  const css = value => `${Number(value.toFixed(4))}%`;
  return {
    width: css(scaledWidth * 100),
    height: css(scaledHeight * 100),
    left: css((1 - scaledWidth) * position.x * 100),
    top: css((1 - scaledHeight) * position.y * 100),
  };
}

function ratioNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : NaN;
  const match = typeof value === 'string' && value.match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  return match ? Number(match[1]) / Number(match[2]) : NaN;
}

export function nearestSupportedAspectRatio(targetRatio, supportedRatios = ART_GENERATION_RATIOS) {
  const target = ratioNumber(targetRatio);
  if (!Number.isFinite(target) || !Array.isArray(supportedRatios) || !supportedRatios.length) {
    throw new TypeError('Provide a valid target aspect ratio and supported ratios.');
  }
  return supportedRatios.reduce((closest, candidate) => {
    const value = ratioNumber(candidate);
    if (!Number.isFinite(value)) return closest;
    return Math.abs(value - target) < Math.abs(ratioNumber(closest) - target) ? candidate : closest;
  }, supportedRatios[0]);
}

export function commitProjectArt(project, candidate, updatedAt = new Date().toISOString()) {
  if (!project || !candidate?.sourceUrl) return false;
  project.projectArt = createProjectArt({ ...candidate, updatedAt });
  project.customArt = ['upload', 'generated'].includes(project.projectArt.sourceType);
  delete project.art;
  return true;
}
