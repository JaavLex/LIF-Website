---
name: deploy-dev
description: Deploy the LIF website to the dev environment (dev.lif-arma.com). Runs tests, builds, and restarts the dev service.
---

Deploy the LIF website to the **dev environment** (https://dev.lif-arma.com).

## Steps

1. **Check version** — Confirm that `src/lib/version.ts` has been updated with a new version number and changelog entry for this deploy. If not, ask the user what version number and changelog to use, then update the file.

2. **Check for uncommitted changes** — if there are changes, ask the user if they want to commit first.

3. **Push to origin/dev** — ensure the latest code is on GitHub's `dev` branch.

4. **Pull and run tests on VPS:**
   ```
   ssh LIF "cd /home/armarserver/LIF-Website-Dev && git pull origin dev && npm install && npx vitest run"
   ```
   If tests fail, **STOP** and report the failures. Do NOT proceed to build.

5. **Build on VPS:**
   ```
   ssh LIF "cd /home/armarserver/LIF-Website-Dev && NODE_OPTIONS='--no-deprecation' npm run build"
   ```
   If the build fails, **STOP** and report the error.

6. **Restart the service:**
   ```
   echo 'po7@NTMWf!' | ssh LIF "sudo -S systemctl restart lif-website-dev"
   ```

7. **Health check** — wait 5 seconds, then:
   ```
   curl -s -o /dev/null -w '%{http_code}' https://dev.lif-arma.com/
   ```
   Expect HTTP 200.

8. **Report result** — confirm deployment success or failure with the HTTP status code.

## Important
- Never skip tests unless the user explicitly says to
- If the build fails, show the last 30 lines of build output
- Dev environment: port 3002, database `lif_website_dev`, service `lif-website-dev`
- The VPS uses HTTPS remote for GitHub (not SSH)
- Sudo password: `po7@NTMWf!`
