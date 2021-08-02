const { fetchRoles } = require("../util");
const { MEMBER_ROLE_DOES_NOT_EXIST, OFFICER_ROLE_DOES_NOT_EXIST, NOT_ENOUGH_PYLONS, memberRoleHasBeenRemoved, memberRoleHasBeenRemovedFromUser } = require("../copy");
const { getCacheData, deleteCache } = require("../mongodb");
const { getStatusOnly } = require("../memberAPI");
const { cougarcsServerIds } = require("../config.json");
const { officerChannels } = require('../config.json');

module.exports = {
	name: 'flush',
	superuser: true,
	description: 'remove expired roles.',
	async execute(message, client, args) {

		// Check if command was sent in an approved channel.
		if (!officerChannels.includes(message.channel.id)) {
			await message.reply(OFFICER_ONLY_CHANNELS);
			return;
		}

		// Check if roles exist.
		const [memberRole, officerRole] = await fetchRoles(message);

		if (officerRole === undefined) {
			await message.reply(OFFICER_ROLE_DOES_NOT_EXIST);
			return;
		}

		if (memberRole === undefined) {
			await message.reply(MEMBER_ROLE_DOES_NOT_EXIST);
			if (officerRole) await message.channel.send(informOfficer(officerRole));
			return;
		}

		// Check if user has required roles.
		if (!message.member.roles.cache.has(memberRole.id) || !message.member.roles.cache.has(officerRole.id)) {
			await message.reply(NOT_ENOUGH_PYLONS);
			return;
		}

		const cachedData = await getCacheData();
		for (const cache of cachedData) {

			const { discordId, psid } = cache;
			const status = await getStatusOnly(discordId);
			if (status) continue;
			
			for (let serverId of cougarcsServerIds) {
				// Fetch server.
				const guild = client.guilds.cache.find(g => g.id === serverId);
				if (guild === undefined) continue;

				// Fetch member for server.
				const member = guild.members.cache.find(m => m.id === discordId);
				if (member === undefined) continue;
				
				// Fetch memberRole for server.
				const guildMemberRole = guild.roles.cache.find(r => r.name.toLowerCase() === "member");
				if (guildMemberRole === undefined) continue;

				// If member has member role, then remove it.
				if (!member.roles.cache.has(guildMemberRole.id)) continue;
				await member.roles.remove(guildMemberRole);
				await message.reply(memberRoleHasBeenRemovedFromUser(member.id));
				try {
					await member.send(memberRoleHasBeenRemoved(guild.name));
				} catch (e) {};
			}

			await deleteCache(psid);
		}
	},
};