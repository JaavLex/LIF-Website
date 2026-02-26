import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Pages } from './collections/Pages';
import { Posts } from './collections/Posts';
import { Homepage } from './globals/Homepage';

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
	collections: [Users, Media, Pages, Posts],
	globals: [Homepage],
	editor: lexicalEditor(),
	secret: process.env.PAYLOAD_SECRET || 'your-secret-key',
	typescript: {
		outputFile: path.resolve(dirname, 'payload-types.ts'),
	},
	db: mongooseAdapter({
		url: process.env.MONGODB_URI || 'mongodb://127.0.0.1/lif-website',
	}),
	sharp,
	plugins: [],
});
