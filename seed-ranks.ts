import { readFileSync } from 'fs';
import path from 'path';

// Load .env manually for VPS usage
const envPath = path.resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  if (!process.env[key]) {
    process.env[key] = trimmed.slice(eqIdx + 1);
  }
}

const { getPayload } = await import('payload');
const { default: config } = await import('./src/payload.config.ts');

const payload = await getPayload({ config });

const ranks = [
  { order: 1, name: 'Recrue', abbreviation: 'Rec', file: '1_recrue.png', discordRoleId: '1430539903237754890' },
  { order: 2, name: 'Soldat', abbreviation: 'Sdt', file: '2_soldat.png', discordRoleId: '1432663146492985434' },
  { order: 3, name: 'Appointé', abbreviation: 'App', file: '3_appointe.png', discordRoleId: '1481004219912945835' },
  { order: 4, name: 'Appointé-chef', abbreviation: 'App chef', file: '4_appointechef.png', discordRoleId: '1481004075372904599' },
  { order: 5, name: 'Caporal', abbreviation: 'Cpl', file: '5_caporal.png', discordRoleId: '1432663237068853289' },
  { order: 6, name: 'Sergent', abbreviation: 'Sgt', file: '6_sergent.png', discordRoleId: '1432663296615518289' },
  { order: 7, name: 'Sergent-chef', abbreviation: 'Sgt chef', file: '7_sergentchef.png', discordRoleId: '1481003977763065876' },
  { order: 8, name: 'Sergent-major', abbreviation: 'Sgt maj', file: '8_sergentmajor.png', discordRoleId: '1481003848834351216' },
  { order: 9, name: 'Sergent-major chef', abbreviation: 'Sgt maj chef', file: '9_sergentmajorchef.png', discordRoleId: '1481003669548826624' },
  { order: 10, name: 'Adjudant', abbreviation: 'Adj', file: '10_adjudant.png', discordRoleId: '1467194690032898222' },
  { order: 11, name: "Adjudant d'état-major", abbreviation: 'Adj EM', file: '11_adjudantetatmajor.png', discordRoleId: '1481003537059283218' },
  { order: 12, name: 'Adjudant-major', abbreviation: 'Adj maj', file: '12_adjudantmajor.png', discordRoleId: '1481003414744727634' },
  { order: 13, name: 'Adjudant-chef', abbreviation: 'Adj chef', file: '13_adjudantchef.png', discordRoleId: '1481003221697953843' },
  { order: 14, name: 'Spécialiste', abbreviation: 'Spéc', file: '14_specialiste.png', discordRoleId: '1435965553834594398' },
  { order: 15, name: 'Lieutenant', abbreviation: 'Lt', file: '15_lieutenant.png', discordRoleId: '1432663371970252920' },
  { order: 16, name: 'Premier-lieutenant', abbreviation: 'Plt', file: '16_premierlieutenant.png', discordRoleId: '1481002969758695445' },
  { order: 17, name: 'Capitaine', abbreviation: 'Cpt', file: '17_capitaine.png', discordRoleId: '1432663430896025610' },
  { order: 18, name: 'Major', abbreviation: 'Maj', file: '18_major.png', discordRoleId: '1481002759871398049' },
  { order: 19, name: 'Lieutenant-colonel', abbreviation: 'Lt col', file: '19_lieutenantcolonel.png', discordRoleId: '1481002607458648267' },
  { order: 20, name: 'Colonel', abbreviation: 'Col', file: '20_colonel.png', discordRoleId: '1481001076189823136' },
  { order: 21, name: 'Brigadier', abbreviation: 'Brig', file: '21_brigadier.png', discordRoleId: '1481002047162548354' },
];

for (const rank of ranks) {
  // Check if rank already exists
  const existing = await payload.find({
    collection: 'ranks',
    where: { name: { equals: rank.name } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log(`SKIP: ${rank.name} already exists`);
    continue;
  }

  // Upload icon to media
  const iconPath = path.resolve(process.cwd(), 'src/app/ranks', rank.file);
  const iconBuffer = readFileSync(iconPath);
  const iconFile = {
    data: iconBuffer,
    mimetype: 'image/png',
    name: rank.file,
    size: iconBuffer.length,
  };

  const media = await payload.create({
    collection: 'media',
    data: { alt: `Grade ${rank.name}` },
    file: iconFile,
  });

  // Create rank
  await payload.create({
    collection: 'ranks',
    data: {
      name: rank.name,
      abbreviation: rank.abbreviation,
      order: rank.order,
      discordRoleId: rank.discordRoleId,
      icon: media.id,
      color: '#c9a227',
    },
  });

  console.log(`CREATED: ${rank.name} (order: ${rank.order})`);
}

console.log('ALL_RANKS_DONE');
process.exit(0);
