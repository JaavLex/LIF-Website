import type { CollectionConfig } from 'payload';

export const Pages: CollectionConfig = {
	slug: 'pages',
	admin: {
		useAsTitle: 'title',
		defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
	},
	access: {
		read: () => true,
	},
	fields: [
		{
			name: 'title',
			type: 'text',
			required: true,
		},
		{
			name: 'slug',
			type: 'text',
			required: true,
			unique: true,
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'status',
			type: 'select',
			options: [
				{ label: 'Draft', value: 'draft' },
				{ label: 'Published', value: 'published' },
			],
			defaultValue: 'draft',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'heroImage',
			type: 'upload',
			relationTo: 'media',
		},
		{
			name: 'layout',
			type: 'blocks',
			blocks: [
				{
					slug: 'hero',
					fields: [
						{
							name: 'heading',
							type: 'text',
							required: true,
						},
						{
							name: 'subheading',
							type: 'text',
						},
						{
							name: 'backgroundImage',
							type: 'upload',
							relationTo: 'media',
						},
						{
							name: 'ctaText',
							type: 'text',
						},
						{
							name: 'ctaLink',
							type: 'text',
						},
					],
				},
				{
					slug: 'content',
					fields: [
						{
							name: 'content',
							type: 'richText',
							required: true,
						},
					],
				},
				{
					slug: 'callToAction',
					fields: [
						{
							name: 'heading',
							type: 'text',
						},
						{
							name: 'text',
							type: 'textarea',
						},
						{
							name: 'buttonText',
							type: 'text',
						},
						{
							name: 'buttonLink',
							type: 'text',
						},
					],
				},
				{
					slug: 'imageGallery',
					fields: [
						{
							name: 'images',
							type: 'array',
							fields: [
								{
									name: 'image',
									type: 'upload',
									relationTo: 'media',
									required: true,
								},
							],
						},
					],
				},
			],
		},
		{
			name: 'meta',
			type: 'group',
			fields: [
				{
					name: 'title',
					type: 'text',
				},
				{
					name: 'description',
					type: 'textarea',
				},
				{
					name: 'image',
					type: 'upload',
					relationTo: 'media',
				},
			],
		},
	],
};
