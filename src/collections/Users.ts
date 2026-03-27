import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
	slug: 'users',
	admin: {
		useAsTitle: 'email',
	},
	auth: true,
	fields: [
		{
			name: 'name',
			type: 'text',
		},
		{
			name: 'role',
			type: 'select',
			options: [
				{ label: 'Admin', value: 'admin' },
				{ label: 'Editor', value: 'editor' },
				{ label: 'User', value: 'user' },
			],
			defaultValue: 'user',
			required: true,
		},
		// Discord OAuth fields
		{
			name: 'discordId',
			label: 'Discord ID',
			type: 'text',
			unique: true,
			index: true,
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		{
			name: 'discordUsername',
			label: 'Discord Username',
			type: 'text',
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		{
			name: 'discordAvatar',
			label: 'Discord Avatar URL',
			type: 'text',
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		{
			name: 'discordRoles',
			label: 'Discord Roles',
			type: 'json',
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
		{
			name: 'isGuildMember',
			label: 'Membre du serveur Discord',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				readOnly: true,
				position: 'sidebar',
			},
		},
	],
};
