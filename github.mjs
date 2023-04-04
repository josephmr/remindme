import { Octokit } from "octokit";
import fetch from "node-fetch";
import db from "./db.mjs";

const ghConfig =
  process.env.GITHUB_CONFIG && JSON.parse(process.env.GITHUB_CONFIG);

let github;
export async function init() {
  if (process.env.GITHUB_TOKEN) {
    github = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
    try {
      await github.rest.users.getAuthenticated();
      console.log("connected to Github");
    } catch (error) {
      console.log("Failed to authenticate to Github API");
      throw error;
    }

    initGhCommandRegex();
  }
}

let GH_COMMAND_REGEX;
function initGhCommandRegex() {
  GH_COMMAND_REGEX = new RegExp(
    `\\s*([0-9]{1,6})\\sin\\s(${ghConfig.envs.map(env => env.key).join("|")})`
  );
}

export async function addReminder({ command, message }) {
  const match = command.match(GH_COMMAND_REGEX);
  if (!match) {
    return false;
  }

  const [_, pr, env] = match;
  let sha;
  try {
    const response = await github.rest.pulls.get({
      owner: ghConfig.owner,
      repo: ghConfig.repo,
      pull_number: pr
    });
    if (!response.data.merged) {
      await message.reply({
        isPrivate: true,
        content: `PR #${pr} is not yet merged. Currently this feature only works for merged PRs.`
      });
      return true;
    }
    sha = response.data.merge_commit_sha;
  } catch (error) {
    await message.reply({
      isPrivate: true,
      content: `Sorry, failed trying to get Github PR #${pr}`
    });
  }
  await db.insertGhReminder({
    sha,
    env: env,
    userId: message.createdById,
    serverId: message.serverId,
    channelId: message.channelId,
    messageId: message.id,
    message: message.content
  });
  return true;
}

async function getSha({ url, regex }) {
  try {
    const r = new RegExp(regex);

    return await fetch(url)
      .then(res => res.text())
      .then(body => {
        const match = body.match(r);
        return match ? match[1] : undefined;
      });
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

async function isDeployed({ envSha, sha }) {
  const res = await github.rest.repos.compareCommitsWithBasehead({
    owner: ghConfig.owner,
    repo: ghConfig.repo,
    basehead: `${sha}...${envSha}`
  });
  return res.data.status !== "behind";
}

export async function remind(client) {
  for (const env of ghConfig.envs) {
    const sha = await getSha(env);
    if (!sha) {
      console.log(`Failed to get sha for ${env.key}`);
      continue;
    }

    let reminders;
    try {
      reminders = await db.getActiveGhReminders({ env: env.key, sha });
    } catch (error) {
      console.log(error);
      continue;
    }
    for (const reminder of reminders) {
      try {
        const shouldRemind = await isDeployed({
          envSha: sha,
          sha: reminder.sha
        });
        if (!shouldRemind) {
          continue;
        }
        await client.messages.send(reminder.channel_id, {
          isPrivate: true,
          replyMessageIds: [reminder.message_id],
          content: `^ this is now live in ${env.key}`
        });
        await db.markGhReminded({ id: reminder.id });
      } catch (error) {
        console.log(error);
        continue;
      }
    }
  }

  setTimeout(() => remind(client), 60 * 1000);
}
