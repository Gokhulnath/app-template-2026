# Trigger evals for the myapp skill

Run by hand after changing the skill's `description`: start a fresh agent session, send
each prompt, and check whether the skill loads. For the "should trigger" prompts, also
check that the agent runs `myapp status --json` (not bare `myapp`) and reports the fields
in plain words.

## Should trigger

| Prompt                                         | Expected behavior                                           |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Is myapp up?                                   | Runs `myapp status --json`, reports status and db           |
| Check the myapp API health                     | Same                                                        |
| Is myapp's database working?                   | Same, and answers from the `db` field                       |
| Why does myapp say degraded?                   | Explains that the API is up but the database is unavailable |
| Check myapp against https://api.example.com    | Uses `--api-url` (or `MYAPP_API_URL`)                       |
| Use the myapp CLI to see if everything is fine | Runs `myapp status --json`                                  |

## Should not trigger

| Prompt                                            | Why                                  |
| ------------------------------------------------- | ------------------------------------ |
| What's the status of my pull request?             | Not myapp                            |
| Add a health endpoint to my other FastAPI project | Generic coding task, not myapp's CLI |
| Check my Supabase project's billing               | Supabase, not myapp                  |
| Who is Myapp in Suits?                            | Same word, different meaning         |
