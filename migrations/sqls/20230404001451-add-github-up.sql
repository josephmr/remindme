CREATE TABLE IF NOT EXISTS gh_reminders (
  id            serial primary key,
  sha           text,
  env           text,
  last_sha      text,
  message_id    uuid,
  channel_id    uuid,
  user_id       text, -- hashify id
  server_id     text, -- hashify id
  message       text,
  reminded      bool default false
);

CREATE INDEX IF NOT EXISTS gh_reminders_reminded_env_last_sha on gh_reminders (reminded, env, last_sha);
CREATE INDEX IF NOT EXISTS gh_reminders_user_id_reminded on gh_reminders (user_id, reminded);
