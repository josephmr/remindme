# Remind Me

Guilded bot for adding reminders.

## How to Deploy

1. Setup env variables

  ```
  DATABASE_URL
  REMIND_BOT_TOKEN
  # Optional: for git environment checking
  GITHUB_TOKEN
  GITHUB_CONFIG # of the form:
    # {
    #   "owner": string, # github owner
    #   "repo": string,  # github repo
    #   "envs": []{      # array of environments
    #     "key": string,   # name
    #     "url": string,   # url to GET for environment git sha
    #     "regex": string  # regex to run against body for git sha
    #   }
    # }
  # Optional: for targeting different environment
  REMIND_WS_URL
  REMIND_REST_URL
  ```

2. Setup database via database migrations

  ```
  npx db-migrate up
  ```

3. Deploy with Dokku or just run `yarn start`

  ```
  git remote add dokku ...
  git push dokku
  ```
