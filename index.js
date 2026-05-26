const fetch = require("@replit/node-fetch");
const fs = require("fs");
const path = require("path");

let Config = {};
try {
  Config = require(path.join(__dirname, "config.json"));
} catch (e) {
  console.log("config.json not found, relying on environment variables or defaults.");
}

const WEBHOOK_URL = process.env.WEBHOOK_URL || Config["WebhookURL"];
const PING_ROLE_ID = process.env.PING_ROLE_ID || Config["PingRoleID"];

const EMBED_FOOTER = Config["EmbedFooter"] || {
  text: "getcomet.lol",
  icon_url: "https://media.discordapp.net/attachments/1448420848204517420/1454605469904797746/Normal.png?ex=6a12d629&is=6a1184a9&hm=e8336ce4b85b7e8df63bc4c024de11703523f136928304fb3d7cc732b6d847df&=&format=webp&quality=lossless&width=873&height=873"
};

const EMBED_DESCRIPTIONS = Config["EmbedDescriptions"] || {
  PreUpdate: "An unpublished Roblox version has been detected on the `LIVE` channel!\nThis means the update is **NOT** released yet, but will be within ~24 hours.",
  Update: "A new Roblox version has been detected on the `LIVE` channel!\nThis means the update **IS** released! Most externals / executors will be down temporarily.*",
  Revert: "Roblox has reverted to a previous version on the `LIVE` channel!\nThis means that some exploits or externals **MAY** be down temporarily."
};

const WEAO_CURRENT_URL = "https://weao.xyz/api/versions/current";
const WEAO_FUTURE_URL = "https://weao.xyz/api/versions/future";

async function FetchWEAO(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "WEAO-3PService"
    }
  });
  return await response.json();
}

const KNOWN_FILE = path.join(__dirname, "known.json");

// Auto-create known.json if it is missing
if (!fs.existsSync(KNOWN_FILE)) {
  try {
    fs.writeFileSync(KNOWN_FILE, JSON.stringify({
      Unpublished: {},
      Published: {},
      LastLiveVersion: null
    }, null, 4));
  } catch (e) {
    console.log("Failed to create known.json:", e);
  }
}

function GetLatestPublished(KnownVersions) {
  const Versions = Object.keys(KnownVersions["Published"]);
  if (Versions.length === 0) return null;

  return Versions.sort((a, b) => {
    const A = KnownVersions["Published"][a].FirstSeen;
    const B = KnownVersions["Published"][b].FirstSeen;
    return new Date(B) - new Date(A);
  })[0];
}

async function SendRevert(VersionHash, PreviousVersion) {
  if (!WEBHOOK_URL) {
    console.log("No webhook URL configured. Skipping webhook.");
    return;
  }
  const EmbedData = {
    content: PING_ROLE_ID ? `<@&${PING_ROLE_ID}>` : "",
    embeds: [
      {
        title: "Update Reverted",
        description: EMBED_DESCRIPTIONS["Revert"],
        color: 10181046,
        footer: EMBED_FOOTER,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Reverted To",
            value: "`" + VersionHash + "`",
            inline: false,
          },
          {
            name: "Previous Version",
            value: "`" + PreviousVersion + "`",
            inline: false,
          },
          {
            name: "Timestamp",
            value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: false,
          },
        ],
      },
    ],
  };

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(EmbedData),
  });
}

async function SendPreUpdate(VersionHash) {
  if (!WEBHOOK_URL) {
    console.log("No webhook URL configured. Skipping webhook.");
    return;
  }
  const EmbedData = {
    content: PING_ROLE_ID ? `<@&${PING_ROLE_ID}>` : "",
    embeds: [
      {
        title: "Future Update Detected",
        description: EMBED_DESCRIPTIONS["PreUpdate"],
        color: 3639030,
        footer: EMBED_FOOTER,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Version",
            value: "`" + VersionHash + "`",
            inline: true,
          },
          {
            name: "Timestamp",
            value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: true,
          },
        ],
      },
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
            emoji: {
              name: "💠",
            },
            url: `https://rdd.whatexpsare.online/?channel=LIVE&binaryType=WindowsPlayer&version=${VersionHash}`,
          },
        ],
      },
    ],
  };

  const Response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(EmbedData),
  });

  console.log("SendPreUpdate, status code:", Response.status);
}

async function SendUpdate(VersionHash) {
  if (!WEBHOOK_URL) {
    console.log("No webhook URL configured. Skipping webhook.");
    return;
  }
  const EmbedData = {
    content: PING_ROLE_ID ? `<@&${PING_ROLE_ID}>` : "",
    embeds: [
      {
        title: "Update Detected",
        description: EMBED_DESCRIPTIONS["Update"],
        color: 16725044,
        footer: EMBED_FOOTER,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Version",
            value: "`" + VersionHash + "`",
            inline: true,
          },
          {
            name: "Timestamp",
            value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: true,
          },
        ],
      },
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
            emoji: {
              name: "💠",
            },
            url: `https://rdd.whatexpsare.online/?channel=LIVE&binaryType=WindowsPlayer&version=${VersionHash}`,
          },
        ],
      },
    ],
  };

  const Response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(EmbedData),
  });

  console.log("SendUpdate, status code:", Response.status);
}

async function CheckDeployHistory() {
  try {
    const KnownVersions = JSON.parse(fs.readFileSync(KNOWN_FILE, "utf-8"));

    const VersionInfo = await FetchWEAO(WEAO_FUTURE_URL);
    const WindowsVersion = VersionInfo["Windows"];

    if (!WindowsVersion) {
      console.log("Couldn't get future version from WEAO, got:", VersionInfo);
      return;
    }

    const VersionKey = WindowsVersion;

    if (!KnownVersions["Unpublished"][VersionKey]) {
      console.log("new unpublished version!!");

      KnownVersions["Unpublished"][VersionKey] = {
        FirstSeen: new Date().toISOString(),
      };

      fs.writeFileSync(KNOWN_FILE, JSON.stringify(KnownVersions, null, 4));
      await SendPreUpdate(VersionKey);
    }
  } catch (e) {
    console.log("Error in CheckDeployHistory", e);
  }
}

async function CheckCurrentVersion() {
  try {
    const KnownVersions = JSON.parse(fs.readFileSync(KNOWN_FILE, "utf-8"));

    const VersionInfo = await FetchWEAO(WEAO_CURRENT_URL);
    const CurrentVersion = VersionInfo["Windows"];

    if (CurrentVersion === undefined) {
      console.log("Couldn't get current version from WEAO, got:", VersionInfo);
      return;
    }

    const LastLive = KnownVersions["LastLiveVersion"];

    if (!KnownVersions["Published"][CurrentVersion]) {
      console.log("new published version!!");

      KnownVersions["Published"][CurrentVersion] = {
        FirstSeen: new Date().toISOString(),
      };

      KnownVersions["LastLiveVersion"] = CurrentVersion;

      fs.writeFileSync(KNOWN_FILE, JSON.stringify(KnownVersions, null, 4));
      await SendUpdate(CurrentVersion);
    } else {
      if (LastLive && CurrentVersion !== LastLive) {
        console.log("revert detected!!");

        await SendRevert(CurrentVersion, LastLive);

        KnownVersions["LastLiveVersion"] = CurrentVersion;
        fs.writeFileSync(KNOWN_FILE, JSON.stringify(KnownVersions, null, 4));
      }
    }
  } catch (e) {
    console.log("Error in CheckCurrentVersion", e);
  }
}

async function CheckForUpdates() {
  await CheckDeployHistory();
  await CheckCurrentVersion();
}

CheckForUpdates();
setInterval(CheckForUpdates, 10000);
console.log("update tracker running");
