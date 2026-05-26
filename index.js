const fetch = require("@replit/node-fetch");
const fs = require("fs");
const path = require("path");

const Config = require(path.join(__dirname, "config.json"));

WEBHOOK_URL = Config["WebhookURL"];

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

KNOWN_FILE = path.join(__dirname, "known.json");

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
  const EmbedData = {
    content: `<@&${Config["PingRoleID"]}>`,
    embeds: [
      {
        title: "Update Reverted",
        description: Config["EmbedDescriptions"]["Revert"],
        color: 10181046,
        footer: Config["EmbedFooter"],
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
  const EmbedData = {
    content: `<@&${Config["PingRoleID"]}>`,
    embeds: [
      {
        title: "Future Update Detected",
        description: Config["EmbedDescriptions"]["PreUpdate"],
        color: 3639030,
        footer: Config["EmbedFooter"],
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
  const EmbedData = {
    content: `<@&${Config["PingRoleID"]}>`,
    embeds: [
      {
        title: "Update Detected",
        description: Config["EmbedDescriptions"]["Update"],
        color: 16725044,
        footer: Config["EmbedFooter"],
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
