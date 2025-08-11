const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

const roles = {
  warrior: '🛡️ 戰士',
  mage: '🔥 法師',
  priest: '💉 牧師'
};

const userChoices = {};

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'choose-role') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('role_select')
      .setPlaceholder('選擇你的職能')
      .addOptions(Object.entries(roles).map(([key, label]) => ({
        label,
        value: key
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const stats = Object.entries(roles).map(([key, label]) => {
      const count = Object.values(userChoices).filter(v => v === key).length;
      return `${label}: ${count}人`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 職能選擇統計')
      .setDescription(stats)
      .setColor(0x00AE86);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
    const selected = interaction.values[0];
    userChoices[interaction.user.id] = selected;

    const stats = Object.entries(roles).map(([key, label]) => {
      const count = Object.values(userChoices).filter(v => v === key).length;
      return `${label}: ${count}人`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 職能選擇統計')
      .setDescription(stats)
      .setColor(0x00AE86);

    await interaction.update({
      embeds: [embed],
      components: []
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
