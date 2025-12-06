/**
 * BrawlBotTools
 * Bot que pega meta/picks/bans do Brawlify e envia automaticamente no canal #informações.
 *
 * Variáveis de ambiente que você precisa configurar na hospedagem:
 * - DISCORD_TOKEN : token do bot
 * - CHANNEL_ID    : ID do canal de destino (#informações)
 *
 * O bot atualiza a cada 30 minutos.
 */

require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

if (!TOKEN) {
  console.error("ERRO: Você precisa configurar DISCORD_TOKEN nas variáveis de ambiente.");
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error("ERRO: Você precisa configurar CHANNEL_ID nas variáveis de ambiente.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// -----------------------
// Função: Pegar meta do Brawlify (versão protegida)
// -----------------------
async function fetchMeta() {
  try {
    const response = await axios.get("https://brawlify.com/br/", {
      headers: {
        "User-Agent": 
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const $ = cheerio.load(response.data);

    const blocks = [];

    $("section").each((i, sec) => {
      const title = $(sec).find("h2, h3").first().text().trim();
      if (!title) return;

      const picks = [];
      $(sec)
        .find("div a, div span")
        .each((i, el) => {
          const t = $(el).text().trim();
          if (t && t.length < 40 && /[A-Za-zÀ-ú]/.test(t))
            picks.push(t);
        });

      if (picks.length > 0) {
        blocks.push({
          title,
          picks: [...new Set(picks)].slice(0, 10),
        });
      }
    });

    return blocks.slice(0, 5);

  } catch (error) {
    console.error("Erro ao buscar dados do Brawlify:", error.message);
    return null;
  }
}

// -----------------------
// Função: Enviar embed no Discord
// -----------------------
async function sendMeta(channel) {
  const data = await fetchMeta();
  if (!data || data.length === 0) {
    await channel.send("❌ Não foi possível obter os dados do Brawlify.");
    return;
  }

  for (const block of data) {
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${block.title}`)
      .setDescription(block.picks.join(" • "))
      .setColor("Blue")
      .setFooter({ text: "Fonte: brawlify.com" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
}

// -----------------------
// Bot pronto
// -----------------------
client.once("ready", async () => {
  console.log(`✔️ Bot logado como ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error("ERRO: Não encontrei o canal. O ID está correto?");
    return;
  }

  // Enviar imediatamente ao iniciar
  await sendMeta(channel);

  // Atualizar automaticamente
  setInterval(async () => {
    console.log("🔄 Atualizando meta...");
    await sendMeta(channel);
  }, CHECK_INTERVAL_MS);
});

// -----------------------
client.login(TOKEN);
