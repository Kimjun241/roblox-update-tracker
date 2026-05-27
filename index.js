const fetch = require("@replit/node-fetch");
const fs = require("fs");
const path = require("path");

let config = {};
try {
  config = require(path.join(__dirname, "config.json"));
} catch (err) {}

const webhookUrl = process.env.WEBHOOK_URL || config.WebhookURL;
const pingRoleId = process.env.PING_ROLE_ID || config.PingRoleID;

const embedFooter = config.EmbedFooter || {
  text: "getcomet.lol",
  icon_url: "https://media.discordapp.net/attachments/1448420848204517420/1454605469904797746/Normal.png?ex=6a12d629&is=6a1184a9&hm=e8336ce4b85b7e8df63bc4c024de11703523f136928304fb3d7cc732b6d847df&=&format=webp&quality=lossless&width=873&height=873"
};

const embedDescriptions = config.EmbedDescriptions || {
  PreUpdate: "An unpublished Roblox version has been detected on the `LIVE` channel!\nThis means the update is **NOT** released yet, but will be within ~24 hours.",
  Update: "A new Roblox version has been detected on the `LIVE` channel!\nThis means the update **IS** released! Most externals / executors will be down temporarily.*",
  Revert: "Roblox has reverted to a previous version on the `LIVE` channel!\nThis means that some exploits or externals **MAY** be down temporarily."
};

const weaoCurrent = "https://weao.xyz/api/versions/current";
const weaoFuture = "https://weao.xyz/api/versions/future";

async function fetchWeao(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "WEAO-3PService" }
  });
  return res.json();
}

const knownFile = path.join(__dirname, "known.json");

if (!fs.existsSync(knownFile)) {
  try {
    fs.writeFileSync(knownFile, JSON.stringify({
      Unpublished: {},
      Published: {},
      LastLiveVersion: null
    }, null, 4));
  } catch (err) {}
}

function getLatest(known) {
  const versions = Object.keys(known.Published);
  if (versions.length === 0) return null;
  return versions.sort((a, b) => new Date(known.Published[b].FirstSeen) - new Date(known.Published[a].FirstSeen))[0];
}

async function sendRevert(hash, prev) {
  if (!webhookUrl) return;
  const body = {
    content: pingRoleId ? `<@&${pingRoleId}>` : "",
    embeds: [
      {
        title: "Update Reverted",
        description: embedDescriptions.Revert,
        color: 10181046,
        footer: embedFooter,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "Reverted To", value: "`" + hash + "`", inline: false },
          { name: "Previous Version", value: "`" + prev + "`", inline: false },
          { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
        ]
      }
    ]
  };
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function sendPreUpdate(hash) {
  if (!webhookUrl) return;
  const body = {
    content: pingRoleId ? `<@&${pingRoleId}>` : "",
    embeds: [
      {
        title: "Future Update Detected",
        description: embedDescriptions.PreUpdate,
        color: 3639030,
        footer: embedFooter,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "Version", value: "`" + hash + "`", inline: true },
          { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        ]
      }
    ],
    attachments: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Download Version",
            emoji: { name: "💠" },
            url: `https://rdd.whatexpsare.online/?channel=LIVE&binaryType=WindowsPlayer&version=${hash}`
          }
        ]
      }
    ]
  };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  console.log("SendPreUpdate:", res.status);
}

async function sendUpdate(hash) {
  if (!webhookUrl) return;
  const body = {
    content: pingRoleId ? `<@&${pingRoleId}>` : "",
    embeds: [
      {
        title: "Update Detected",
        description: embedDescriptions.Update,
        color: 16725044,
        footer: embedFooter,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "Version", value: "`" + hash + "`", inline: true },
          { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        ]
      }
    ],
    attachments: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Download Version",
            emoji: { name: "💠" },
            url: `https://rdd.whatexpsare.online/?channel=LIVE&binaryType=WindowsPlayer&version=${hash}`
          }
        ]
      }
    ]
  };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  console.log("SendUpdate:", res.status);
}

async function checkFuture() {
  try {
    const known = JSON.parse(fs.readFileSync(knownFile, "utf-8"));
    const data = await fetchWeao(weaoFuture);
    const win = data.Windows;
    if (!win) return;

    if (!known.Unpublished[win]) {
      known.Unpublished[win] = { FirstSeen: new Date().toISOString() };
      fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
      await sendPreUpdate(win);
    }
  } catch (err) {
    console.error("Error checkFuture:", err.message);
  }
}

async function checkCurrent() {
  try {
    const known = JSON.parse(fs.readFileSync(knownFile, "utf-8"));
    const data = await fetchWeao(weaoCurrent);
    const win = data.Windows;
    if (!win) return;

    const last = known.LastLiveVersion;

    if (!known.Published[win]) {
      known.Published[win] = { FirstSeen: new Date().toISOString() };
      known.LastLiveVersion = win;
      fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
      await sendUpdate(win);
    } else if (last && win !== last) {
      await sendRevert(win, last);
      known.LastLiveVersion = win;
      fs.writeFileSync(knownFile, JSON.stringify(known, null, 4));
    }
  } catch (err) {
    console.error("Error checkCurrent:", err.message);
  }
}

async function check() {
  await checkFuture();
  await checkCurrent();
}

check();
setInterval(check, 10000);
console.log("update tracker running");
