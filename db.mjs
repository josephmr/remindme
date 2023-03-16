import { DateTime } from "luxon";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.REMIND_DB_HOST,
  user: process.env.REMIND_DB_USER,
  password: process.env.REMIND_DB_PASSWORD,
  port: process.env.REMIND_DB_PORT,
  database: process.env.REMIND_DB_DATABASE,
  max: 20,
  idleTimoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const tzs = {};

const db = {
  async getTimezone({ userId }) {
    if (!tzs[userId]) {
      const result = await pool.query(
        `SELECT COALESCE(timezone, 'Etc/UTC') AS timezone FROM timezones WHERE user_id = $1;`,
        [userId]
      );
      tzs[userId] = result.rows[0]?.timezone || "Etc/UTC";
    }
    return tzs[userId];
  },
  async setTimezone({ userId, timezone }) {
    await pool.query(
      "INSERT INTO timezones (user_id, timezone) VALUES($1, $2) ON CONFLICT (user_id) DO UPDATE SET timezone = $2;",
      [userId, timezone]
    );
    tzs[userId] = timezone;
  },
  async insertReminder({
    remindAt,
    userId,
    serverId,
    channelId,
    messageId,
    message
  }) {
    await pool.query(
      "INSERT INTO reminders (remind_at, user_id, server_id, channel_id, message_id, message) VALUES($1, $2, $3, $4, $5, $6)",
      [remindAt, userId, serverId, channelId, messageId, message]
    );
  },
  async getActiveReminders() {
    const res = await pool.query(
      "SELECT * FROM reminders WHERE reminded = false AND remind_at < $1",
      [DateTime.utc().toJSDate()]
    );
    return res.rows;
  },
  async markReminded({ id }) {
    return await pool.query(
      `UPDATE reminders SET reminded = true WHERE id = $1`,
      [id]
    );
  }
};

export default db;
