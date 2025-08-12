const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    EmbedBuilder,
    Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel],
});

const roles = {
    MT: 'MT',
    ST: 'ST',
    H1: 'H1',
    H2: 'H2',
    D1: 'D1',
    D2: 'D2',
    D3: 'D3',
    D4: 'D4'
};

// 🔹 Logging function
function logError(error) {
    const logDir = path.join(__dirname, 'logs');
    const logFile = path.join(logDir, 'log.txt');
    const timestamp = new Date().toISOString();

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    const message = `[${timestamp}] ${error.stack || error.message || error}`;
    fs.appendFileSync(logFile, message + '\n', 'utf8');
}

// 🔹 Create role select menu with default selection
function createRoleSelectMenu(selectedRoleKey = null) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('role_select')
        .setPlaceholder('選擇職能');

    const options = Object.entries(roles).map(([key, label]) => ({
        label,
        value: key,
        default: key === selectedRoleKey
    }));

    menu.addOptions(options);
    return menu;
}

// 🔹 Create user select menu with default user
function createUserSelectMenu(defaultUserId) {
    return new UserSelectMenuBuilder()
        .setCustomId('user_select')
        .setPlaceholder('選擇用戶')
        .setDefaultUsers([defaultUserId]);
}

// 🔹 Decode base64 from embed
function decodePreviousSelections(embedDescription) {
    try {
        const match = embedDescription?.match(/```(.*?)```/s);
        if (!match) return {};
        return JSON.parse(Buffer.from(match[1].trim(), 'base64').toString('utf-8'));
    } catch (err) {
        logError(err);
        return {};
    }
}

// 🔹 Get role key for a user
function getUserRoleKey(selections, username) {
    return Object.entries(selections).find(([key, name]) => name === username)?.[0] || null;
}

// 🔹 Handle /choose-role command
async function handleChooseRole(interaction) {
    try {
        const emptySelections = {};
        const base64Data = Buffer.from(JSON.stringify(emptySelections)).toString('base64');
        const base64Section = `\n\n🧾 Base64 資料：\n\`\`\`${base64Data}\`\`\``;

        const roleTable = Object.entries(roles).map(([key, label]) => {
            return `${label}: 冇人做`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📊 職能選擇')
            .setDescription(`${roleTable}${base64Section}`)
            .setColor(0x00AE86);

        const userMenuRow = new ActionRowBuilder().addComponents(createUserSelectMenu(interaction.user.id));
        const roleMenuRow = new ActionRowBuilder().addComponents(createRoleSelectMenu());

        await interaction.reply({
            embeds: [embed],
            components: [userMenuRow, roleMenuRow],
            flags: 0
        });
    } catch (err) {
        logError(err);
    }
}

// 🔹 Handle role selection
async function handleRoleSelect(interaction) {
    try {
        const selectedRole = interaction.values[0];
        const previousEmbed = interaction.message.embeds[0];
        const previousSelections = decodePreviousSelections(previousEmbed?.description);

        const selectedUserId = previousSelections._selectedUserId || interaction.user.id;
        const selectedUser = await interaction.guild.members.fetch(selectedUserId);
        const username = selectedUser.displayName || selectedUser.user.username;

        // Remove any previous role assigned to this user
        for (const role in previousSelections) {
            if (previousSelections[role] === username) {
                delete previousSelections[role];
            }
        }

        // Assign new role
        previousSelections[selectedRole] = username;

        const base64Data = Buffer.from(JSON.stringify(previousSelections)).toString('base64');
        const base64Section = `\n\n🧾 Base64 資料：\n\`\`\`${base64Data}\`\`\``;

        const roleTable = Object.entries(roles).map(([key, label]) => {
            const user = previousSelections[key] || '冇人做';
            return `${label}: ${user}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📊 已選擇職能')
            .setDescription(`${roleTable}${base64Section}`)
            .setColor(0x00AE86);

        const userMenuRow = new ActionRowBuilder().addComponents(createUserSelectMenu(selectedUserId));
        const selectedRoleKey = getUserRoleKey(previousSelections, username);
        const roleMenuRow = new ActionRowBuilder().addComponents(createRoleSelectMenu(selectedRoleKey));

        await interaction.update({
            embeds: [embed],
            components: [userMenuRow, roleMenuRow],
            flags: 0
        });
    } catch (err) {
        logError(err);
    }
}


// 🔹 Handle user selection silently
async function handleUserSelect(interaction) {
    try {
        const selectedUser = interaction.users.first();
        const selectedUserId = selectedUser?.id;

        const previousEmbed = interaction.message.embeds[0];
        const previousSelections = decodePreviousSelections(previousEmbed?.description);

        // Add selected user ID to selections
        previousSelections._selectedUserId = selectedUserId;

        const base64Data = Buffer.from(JSON.stringify(previousSelections)).toString('base64');
        const base64Section = `\n\n🧾 Base64 資料：\n\`\`\`${base64Data}\`\`\``;

        const roleTable = Object.entries(roles).map(([key, label]) => {
            const user = previousSelections[key] || '冇人做';
            return `${label}: ${user}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📊 職能選擇')
            .setDescription(`${roleTable}${base64Section}`)
            .setColor(0x00AE86);

        const userMenuRow = new ActionRowBuilder().addComponents(createUserSelectMenu(selectedUserId));
        const selectedRoleKey = getUserRoleKey(previousSelections, username);
        const roleMenuRow = new ActionRowBuilder().addComponents(createRoleSelectMenu(selectedRoleKey));

        await interaction.update({
            embeds: [embed],
            components: [userMenuRow, roleMenuRow],
            flags: 0
        });
    } catch (err) {
        logError(err);
    }
}


// 🔹 Main interaction handler
client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'choose-role') {
            await handleChooseRole(interaction);
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
            await handleRoleSelect(interaction);
        }

        if (interaction.isUserSelectMenu() && interaction.customId === 'user_select') {
            await handleUserSelect(interaction);
        }
    } catch (err) {
        logError(err);
    }
});

client.login(process.env.DISCORD_TOKEN);
