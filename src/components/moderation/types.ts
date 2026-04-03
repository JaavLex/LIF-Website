export interface SessionUser {
	userId: number;
	discordId: string;
	discordUsername: string;
	discordAvatar: string;
	roles: string[];
}

export interface ModerationUser {
	discordId: string;
	discordUsername: string;
	globalName: string;
	serverNick: string | null;
	avatar: string;
	joinedAt: string;
	roles: string[];
	warnCount: number;
	cases: { id: number; status: string; caseNumber: number }[];
	characters: {
		id: number;
		fullName: string;
		status: string;
		isMainCharacter: boolean;
	}[];
}

export interface Transcript {
	messageId: string;
	ticketOwner: string;
	ticketOwnerAvatar: string;
	ticketName: string;
	panelName: string;
	participants: { count: number; name: string }[];
	transcriptUrl: string;
	downloadUrl: string;
	filename: string;
	size: number;
	timestamp: string;
}
