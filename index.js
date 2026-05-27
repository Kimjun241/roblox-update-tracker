const fetch = require("@replit/node-fetch");
const fs = require("fs");
const path = require("path");

let config = {};
try {
  config = require("./config.json");
} catch (e) {
  config = {
    WebhookURL: process.env.WEBHOOK_URL,
    PingRoleID: process.env.PING_ROLE_ID
  };
}

const webhookUrl = config.WebhookURL;
const pingRoleId = config.PingRoleID;

const footer = config.EmbedFooter || {
  text: "getcomet.lol",
  icon_url: "https://media.discordapp.net/attachments/1448420848204517420/1454605469904797746/Normal.png"
};

const desc = config.EmbedDescriptions || {
  PreUpdate: "An unpublished Roblox version has been detected on the `LIVE` channel!\nThis means the update is **NOT** released yet, but will be within ~24 hours.",
  Update: "A new Roblox version has been detected on the `LIVE` channel!\nThis means the update **IS** released! Most externals / executors will be down temporarily.*",
  Revert: "Roblox has reverted to a previous version on the `LIVE` channel!\nThis means that some exploits or externals **MAY** be down temporarily."
};

const knownFile = path.join(__dirname, "known.json");

if (!fs.existsSync(knownFile)) {
  fs.writeFileSync(knownFile, JSON.stringify({ Unpublished: {}, Published: {}, LastLiveVersion: null }, null, 4));
}

async function fetchWeao(url) {
  const res = await fetch(url, { headers: { "User-Agent": "WEAO-3PService" } });
  return res.json();
}

async function sendWebhook(title, description, color, hash, extraFields = []) {
  if (!webhookUrl) return;

  const fields = [
    { name: "Version", value: "`" + hash + "`", inline: true },
    { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
    ...extraFields
  ];

  const body = {
    content: pingRoleId ? `<@&${pingRoleId}>` : "",
    embeds: [{ title, description, color, footer, timestamp: new Date().toISOString(), fields }]
  };

  if (title !== "Update Reverted") {
    body.components = [{
      type: 1,
      components: [{
        type: 2,
        style: 5,
        label: "Download Version",
        emoji: { name: "💠" },
        url: `https://rdd.whatexpsare.online/?channel=LIVE&binaryType=WindowsPlayer&version=${hash}`
      }]
    }];
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function checkFuture() {
  const known = JSON.parse(fs.readFileSync(knownFile, "utf-8"));
  const data = await fetchWeao("https://weao.xyz/api/versions/future");
  const win = data.Windows;
  if (!win) return;

  if (!known.Unpublished[win]) {
    known.Unpublished[win] = { FirstSeen: new Date().toISOString() };
    fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
    await sendWebhook("Future Update Detected", desc.PreUpdate, 3639030, win);
  }
}

async function checkCurrent() {
  const known = JSON.parse(fs.readFileSync(knownFile, "utf-8"));
  const data = await fetchWeao("https://weao.xyz/api/versions/current");
  const win = data.Windows;
  if (!win) return;

  const last = known.LastLiveVersion;

  if (!known.Published[win]) {
    known.Published[win] = { FirstSeen: new Date().toISOString() };
    known.LastLiveVersion = win;
    fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
    await sendWebhook("Update Detected", desc.Update, 16725044, win);
  } else if (last && win !== last) {
    known.LastLiveVersion = win;
    fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
    await sendWebhook("Update Reverted", desc.Revert, 10181046, win, [
      { name: "Previous Version", value: "`" + last + "`", inline: false }
    ]);
  }
}

async function run() {
  try {
    await checkFuture();
    await checkCurrent();
  } catch (err) {
    console.error(err.message);
  }
}

run();
setInterval(run, 10000);
console.log("tracker running");
