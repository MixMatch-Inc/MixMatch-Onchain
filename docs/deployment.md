# Deployment

## Pipeline

1. A change to `apps/api-py` that reaches `develop` or `main` runs **API image** (`api-image.yml`): the image is built,
   smoke-tested (the container must answer `/health`) and pushed to `ghcr.io/<owner>/<repo>/api-py` tagged
   `sha-<commit>`, the branch name, and `latest` on `main`.
2. **Deploy** (`deploy.yml`) then deploys the new `sha-<commit>` tag to **staging** automatically after a successful
   image build on `develop`.
3. **Production** is manual: *Actions > Deploy > Run workflow*, environment `production`, image tag (for example the
   `sha-...` tag that ran on staging). The job waits for approval from the `production` Environment's required reviewers.
4. **Rollback** is the same workflow with the previous image tag (shown in the run summary as "previous tag"); keep
   the variable `CURRENT_IMAGE_TAG` up to date in the Environment so the summary can show it.

## One-time setup (repository settings, not code)

- Create the Environments `staging` and `production` (*Settings > Environments*). Add **required reviewers** and a
  `main`-only deployment branch rule to `production`.
- In each Environment set the secret `DEPLOY_HOOK_URL` (a URL that makes the platform pull the given image and
  restart, for example a Render/Fly/ECS deploy hook or an internal endpoint) and the variable `APP_URL` (base URL
  used for the post-deploy `/health` check).
- The documented target is AWS (ALB and Route 53, see the cutover docs): the hook is expected to update the ECS service
  or equivalent to the image in the request body `{"image": "...", "environment": "..."}`.

The web app (`apps/web`) deploys separately (Vercel, see `apps/web/vercel.json`).
