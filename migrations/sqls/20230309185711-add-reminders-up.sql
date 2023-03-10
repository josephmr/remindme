CREATE TABLE IF NOT EXISTS reminders (
  id            serial primary key,
  remind_at     timestamp with time zone not null,
  message_id    uuid,
  channel_id    uuid,
  user_id       text, -- hashify id
  server_id     text, -- hashify id
  message       text,
  reminded      bool default false
);

CREATE INDEX IF NOT EXISTS reminders_reminded_remind_at_asc on reminders (reminded, remind_at asc);
CREATE INDEX IF NOT EXISTS reminders_user_id_reminded_remind_at_asc on reminders (user_id, reminded, remind_at asc);
