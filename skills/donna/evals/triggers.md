# Trigger evals for the donna skill

Run by hand after changing the skill's `description`: start a fresh agent session, send
each prompt, and check whether the skill loads. For the "should trigger" prompts, also
check that the agent runs `donna status --json` (not bare `donna`) and reports the fields
in plain words.

## Should trigger

| Prompt                                         | Expected behavior                                           |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Is donna up?                                   | Runs `donna status --json`, reports status and db           |
| Check the donna API health                     | Same                                                        |
| Is donna's database working?                   | Same, and answers from the `db` field                       |
| Why does donna say degraded?                   | Explains that the API is up but the database is unavailable |
| Check donna against https://api.example.com    | Uses `--api-url` (or `DONNA_API_URL`)                       |
| Use the donna CLI to see if everything is fine | Runs `donna status --json`                                  |

## Should not trigger

| Prompt                                            | Why                                  |
| ------------------------------------------------- | ------------------------------------ |
| What's the status of my pull request?             | Not donna                            |
| Add a health endpoint to my other FastAPI project | Generic coding task, not donna's CLI |
| Check my Supabase project's billing               | Supabase, not donna                  |
| Who is Donna in Suits?                            | Same word, different meaning         |
