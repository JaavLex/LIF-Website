import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Pages } from './collections/Pages';
import { Posts } from './collections/Posts';
import { Characters } from './collections/Characters';
import { CharacterTimeline } from './collections/CharacterTimeline';
import { Ranks } from './collections/Ranks';
import { Units } from './collections/Units';
import { AdminDashboard } from './globals/AdminDashboard';
import { Homepage } from './globals/Homepage';
import { Navigation } from './globals/Navigation';
import { Roleplay } from './globals/Roleplay';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
	admin: {
		user: Users.slug,
		importMap: {
			baseDir: path.resolve(dirname),
		},
		components: {
			afterDashboard: ['/components/AdminDashboardLinks'],
		},
	},
	collections: [
		Users,
		Media,
		Pages,
		Posts,
		Characters,
		CharacterTimeline,
		Ranks,
		Units,
	],
	globals: [Homepage, Navigation, AdminDashboard, Roleplay],
	editor: lexicalEditor(),
	secret: process.env.PAYLOAD_SECRET || 'dev-secret-key',
	typescript: {
		outputFile: path.resolve(dirname, 'payload-types.ts'),
	},
	db: postgresAdapter({
		pool: {
			connectionString: process.env.DATABASE_URI,
		},
	}),
	sharp,
	plugins: [],
});
