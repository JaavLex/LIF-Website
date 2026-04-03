---
name: deploy-dev
description: Deploy the LIF website to the dev environment (dev.lif-arma.com). Runs tests, builds, and restarts the dev service.
---

Deploy the LIF website to the **dev environment** (https://dev.lif-arma.com).

## Steps

1. **Check version** — Confirm that `src/lib/version.ts` has been updated with a new version number and changelog entry for this deploy. If not, ask the user what version number and changelog to use, then update the file.

2. **Check for uncommitted changes** — if there are changes, ask the user if they want to commit first.

3. **Push to origin/dev** — ensure the latest code is on GitHub's `dev` branch.

4. **Deploy via Ansible** (website only, dev environment):
   ```
   cd ansible && ansible-playbook -i inventory.ini deploy.yml -e env=dev --tags website
   ```
   This will:
   - Pull latest code from `dev` branch
   - Install dependencies
   - Run tests (unless `skip_tests=true` is passed)
   - Build the Next.js app
   - Deploy/update the systemd service
   - Restart the service
   - Run a health check (retries up to 10 times with 3s delay)

   If tests or build fail, Ansible will stop and report the error.

5. **External health check** — after Ansible succeeds, verify from outside:
   ```
   curl -s -o /dev/null -w '%{http_code}' https://dev.lif-arma.com/
   ```
   Expect HTTP 200.

6. **Report result** — confirm deployment success or failure with the HTTP status code.

## Important
- Never skip tests unless the user explicitly says to (pass `-e skip_tests=true` to skip)
- If Ansible fails, show the relevant task output
- Dev environment: port 3002, database `lif_website_dev`, service `lif-website-dev`, branch `dev`
- Ansible inventory and vars are in `ansible/`
