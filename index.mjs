import { WebSocketManager } from "@guildedjs/ws";
import { Client } from "guilded.js";
import { DateTime } from "luxon";
import hrt from "parse-human-relative-time";
import * as github from "./github.mjs";
import db from "./db.mjs";

const parseHumanRelative = hrt(DateTime);

const githubEnabled = process.env.GITHUB_TOKEN;
if (githubEnabled) {
  await github.init();
}

const client = new Client({
  token: process.env.REMIND_BOT_TOKEN,
  rest: {
    proxyURL: process.env.REMIND_REST_URL
  }
});
// Override default so we can override WS url
client.ws = new WebSocketManager({
  token: process.env.REMIND_BOT_TOKEN,
  proxyURL: process.env.REMIND_WS_URL
});

let COMMAND_PARSE;
function initCommandParse(client) {
  COMMAND_PARSE = new RegExp(
    `(?:^|\n)(?:@${client.user.name})[\r\t\f\v ]+([^\n]*?(?=--|$|\n))`
  );
}

async function remind(client) {
  try {
    const reminders = await db.getActiveReminders();
    const messages = reminders.map(async reminder => {
      await client.messages.send(reminder.channel_id, {
        isPrivate: true,
        replyMessageIds: [reminder.message_id],
        content: "^ consider yourself reminded"
      });
      return db.markReminded({ id: reminder.id });
    });
    const settled = await Promise.allSettled(messages);
    for (const result of settled) {
      if (result.status === "rejected") {
        console.error("failed when sending a reminder", result);
      }
    }
  } catch (error) {
    console.error("Uncaught Error!", error);
  }
  setTimeout(remind, 5000);
}

if (githubEnabled) {
  github.remind(client);
}
remind(client);

async function settz({ command, message, client }) {
  const tz = command.replace("settz", "").trim();
  const isValid = DateTime.now().setZone(tz).isValid;
  if (!isValid) {
    await message.reply({
      isPrivate: true,
      content: `Sorry, that timezone was not recognized. Please use a valid IANA zone specifier e.g. America/New_York.`
    });
  }
  let success = false;
  try {
    await db.setTimezone({
      userId: message.createdById,
      timezone: tz
    });
    success = true;
  } catch (error) {
    console.error(`Failed to save user's timezone`, error);
  }
  await message.reply({
    isPrivate: true,
    content: success
      ? `Got it, your timezone has been set to ${tz}`
      : `Sorry, something went wrong trying to save your timezone. Please try again later and report failures to my creator.`
  });
}

async function addReminder({ command, message, client }) {
  const tz = await db.getTimezone({ userId: message.createdById });
  const now = DateTime.local().setZone(tz);
  let then;
  try {
    then = parseHumanRelative(command, now);
  } catch (error) {
    console.error("failed to parse relative time", message.content);
    await message.reply({
      isPrivate: true,
      content: `Sorry, but I didn't understand that. Try phrases like "in 5 minutes" or "tomorrow at 2pm".`
    });
    return;
  }

  try {
    await db.insertReminder({
      remindAt: then,
      userId: message.createdById,
      serverId: message.serverId,
      channelId: message.channelId,
      messageId: message.id,
      message: message.content
    });
  } catch (error) {
    console.error("failed to save reminder", error);
    await message.reply({
      isPrivate: true,
      content: `Sorry, something went wrong. Please try again later and report failures to my creator.`
    });
    return;
  }

  await message.reply({
    isPrivate: true,
    content: `I'll remind you at ${then.toISO({
      suppressSeconds: true,
      suppressMilliseconds: true
    })}`
  });
}

async function sendHelp({ message, client }) {
  const name = client.user.name;
  await message.reply({
    isPrivate: true,
    content: `Here's what I can do:

@${name} help: Print this help message.
@${name} in 5 minutes: Set a reminder for some time in the future.
@${name} settz America/New_York: Set your timezone so I can better understand absolute times like 2pm.`
  });
}

client.on("ready", () => {
  console.log("Bot is logged in");
  initCommandParse(client);
});
client.on("messageCreated", async message => {
  try {
    const match = message.content.match(COMMAND_PARSE);
    if (!match) {
      return;
    }
    const [_, command] = match;
    switch (command.split(/\s/)[0]) {
      case "help":
        await sendHelp({ client, message });
        break;
      case "settz":
        await settz({ command, message, client });
        break;
      default:
        if (githubEnabled) {
          const isHandled = await github.addReminder({
            command,
            message,
            client
          });
          if (isHandled) {
            return;
          }
        }
        await addReminder({ command, message, client });
        break;
    }
  } catch (error) {
    console.error("Uncaught Error!", error);
    message.reply({
      isPrivate: true,
      content: `Sorry, something went wrong. Please try again later and report failures to my creator.`
    });
  }
});

client.login();
