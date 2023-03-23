# Remind Me

Guilded bot for adding reminders.

## How to Deploy

1. Setup env variables

  ```
  REMIND_DB_USER
  REMIND_DB_PASSWORD
  REMIND_DB_HOST
  REMIND_DB_PORT
  REMIND_BOT_TOKEN
  # Optional: for targeting different environment
  REMIND_WS_URL
  REMIND_REST_URL
  ```

2. Setup database via database migrations

  ```
  npx db-migrate up
  ```

3. Deploy with CapRover or just run `yarn start`

  ```
  caprover deploy
  ```
