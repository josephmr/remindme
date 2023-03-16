CREATE TABLE IF NOT EXISTS timezones (
  id        serial primary key,
  user_id   text unique,  -- hashify id
  timezone  text not null -- IANA time zone
);
