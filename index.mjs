import { Client } from "guilded.js";
import { WebSocketManager } from "@guildedjs/ws";
import db from "./db.mjs";
import { DateTime } from "luxon";
import hrt from "parse-human-relative-time";
const parseHumanRelative = hrt(DateTime);

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

const COMMAND_RE = /!(?:remind(?:me)?)(?:$|\s)(.*)/;

async function remind() {
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
  setTimeout(remind, 5000);
}
remind();

client.on("ready", () => console.log("Bot is logged in"));
client.on("messageCreated", async message => {
  let relativeTimeStr;
  if (message.content.includes(`@${client.user.name}`)) {
    const content = message.content.replace(`@${client.user.name}`, "").trim();
    const match = content.match(COMMAND_RE);
    relativeTimeStr = match ? match[1] : content;
  } else {
    const match = message.content.match(COMMAND_RE);
    relativeTimeStr = match ? match[1] : undefined;
  }

  if (!relativeTimeStr) {
    return;
  }

  const now = DateTime.utc();
  let then;
  try {
    then = parseHumanRelative(relativeTimeStr, now);
  } catch (error) {
    console.error("failed to parse relative time", message.content);
    await message.reply({
      isPrivate: true,
      content: `Sorry, but I didn't understand. Try phrases like "in 5 minutes" or "tomorrow".`
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
});

client.login();
