// BrawlBotTools - Meta Completa (Mapas, Picks, Bans)
require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN) {
  console.error("ERRO: DISCORD_TOKEN não configurado.");
  process.exit(1);
}
if (!CHANNEL_ID) {
  console.error("ERRO: CHANNEL_ID não configurado.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------------------------
// FUNÇÃO: META COMPLETA DO BRAWLIFY
// ---------------------------
async function fetchFullMeta() {
  try {
    const url = "https://brawlify.com/pt/";
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const sections = [];

    // Cada cartão de modo/mapa
    $(".mode-card").each((i, sec) => {
      const mapa = $(sec).find(".mode-title").text().trim();

      const picks = [];
      $(sec)
        .find(".brawler-list .brawler-name")
        .each((i, el) => picks.push($(el).text().trim()));

      if (mapa && picks.length) {
        sections.push({
          mapa,
          picks: [...new Set(picks)].slice(0, 10)
        });
      }
    });

    return sections;
  } catch (e) {
    console.error("Erro ao buscar meta:", e.message);
    return null;
  }
}

// ---------------------------
// FUNÇÃO: Enviar no Discord
// ---------------------------
async function sendFullMeta(channel) {
  const meta = await fetchFullMeta();
  if (!meta) return channel.send("❌ Não consegui buscar a meta do Brawlify.");

  for (const m of meta) {
    const embed = new EmbedBuilder()
      .setTitle("📍 Mapa: " + m.mapa)
      .setDescription("**Melhores picks:**\n" + m.picks.join(" • "))
      .setColor("Blue")
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
}

// ---------------------------
// BOT ONLINE
// ---------------------------
client.once("ready", async () => {
  console.log("✔️ Bot online:", client.user.tag);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error("ERRO: canal não encontrado. Verifique o CHANNEL_ID.");
    return;
  }

  // Enviar imediatamente
  await sendFullMeta(channel);

  // Atualizar tudo a cada 30 min
  setInterval(() => sendFullMeta(channel), 30 * 60 * 1000);
});

client.login(TOKEN);
