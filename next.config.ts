import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Your Next.js config here
	experimental: {
		reactCompiler: false,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'cdn.discordapp.com',
			},
		],
	},
};

export default withPayload(nextConfig);
