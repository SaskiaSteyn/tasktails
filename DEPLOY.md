# Deploying TaskTails to AWS

Runbook for DEP ([GitHub #164](https://github.com/SaskiaSteyn/tasktails/issues/164)).
Targets NFR-GEN-3 — $0/month while inside AWS Free Tier (first 12 months on a
new account), ~$21–23/month after, well under the $15/month *fallback* ceiling
NFR-GEN-3 sets if you migrate the database to Neon at that point instead.

This is a checklist for the AWS console/CLI parts, which only you can do (they
touch billing and an account only you have access to). Everything Claude could
prepare in advance — the compose file, the TLS config, the CI/CD workflow, the
IAM policies — is already in the repo; this doc wires them together.

**How to use this doc:** open a terminal and work through §0–§9 in order,
top to bottom, pasting each command block as you reach it. The first block in
§0 sets a handful of shell variables (domain, region, account ID, ...); every
command after that reuses them (`$DOMAIN`, `$ACCOUNT_ID`, etc.) instead of a
placeholder you'd have to remember to substitute. If you close the terminal
and come back later, re-run §0's `export` block first — the variables don't
persist across sessions.

## Architecture

```
Internet
  │  HTTPS (443) / HTTP→HTTPS redirect (80)
  ▼
Elastic IP ── DNS A record: tasktails.co.za
  │
EC2 (t3.micro)
  ├── Caddy container ── terminates TLS (Let's Encrypt, auto-renewed)
  │     └── reverse-proxies to ──▶ app container (port 3000, not published)
  ├── migrate container ── runs `prisma migrate deploy` once per deploy, then exits
  └── (pulls images from) Amazon ECR
         ▲
         │ push, on every merge to main (after CI passes)
GitHub Actions ── assumes an IAM role via OIDC (no AWS keys stored in the repo)

RDS PostgreSQL (private subnet, only reachable from the EC2 security group)
```

Why this shape, briefly:
- **RDS over a containerised Postgres** — you chose RDS for the managed
  backups/durability; it costs the same $0 during the free-tier window as
  running Postgres in a third container would have.
- **Caddy, not an ALB** — an Application Load Balancer has no free tier and
  costs ~$16/month minimum just to exist. Caddy gets you the same automatic
  Let's Encrypt TLS for free, at the cost of one more container.
- **ECR + pull-on-EC2, not build-on-EC2** — a t3.micro has 1GB of RAM.
  `next build` inside Docker on that box is slow at best and OOM-prone at
  worst. Building on GitHub's runners (free) and pulling a finished image is
  both faster and more reliable.
- **CD gated on CI** — `deploy.yml` triggers on `ci.yml` completing
  successfully on `main`, not on the raw push event, so a push that fails
  lint/typecheck/test/build never reaches production.

## §0 — One-time setup and shell variables

**Create an IAM user for this** if you're currently signed in as root (root
has no "Security credentials → Create access key" flow of the kind below —
that's deliberate, AWS wants root reserved for account-level tasks only, not
day-to-day CLI work):

1. Console → **IAM → Users → Create user**. Name it e.g. `<yourname>-admin`.
2. Permissions options → **Attach policies directly** → check
   **AdministratorAccess** → Next → **Create user**. (This account is
   dedicated to the study, so nothing else on it a broad policy could put at
   risk — see the note below if you'd rather scope it.)
3. Click into the new user → **Security credentials** tab → **Create access
   key** → use case **Command Line Interface (CLI)** → check the
   acknowledgement → **Create access key**.
4. Copy the **Access key ID** and **Secret access key** now (or download the
   `.csv`) — the secret is shown exactly once.

```bash
brew install awscli   # skip if `aws --version` already prints something
aws configure
# Paste the IAM user's access key ID / secret from step 4 above — NOT root's.
# Default region: eu-west-1
# Default output format: json
```

The setup below touches EC2/RDS/ECR/IAM console features whose read-only
`Describe*` calls aren't visible in the CLI commands you'll type, which is
why `AdministratorAccess` rather than a hand-scoped policy — a scoped one
tends to fail on exactly those calls. The permissions that *do* matter for
participant data are already least-privilege by design: the GitHub Actions
role (§3b) and the EC2 instance role (§3c) are both scoped to push/pull on
one ECR repository, nothing else. If you'd rather scope your own user too,
[`deploy/aws/setup-user-policy.json`](deploy/aws/setup-user-policy.json)
covers exactly what §2–§9 use.

```bash
# Everything below reuses these. Re-run this block if you open a new terminal.
export DOMAIN=tasktails.co.za
export REGION=eu-west-1
export GH_REPO=SaskiaSteyn/tasktails
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID   Region: $REGION   Domain: $DOMAIN"
```

`eu-west-1` is a safe default with unconditional Free Tier support. If you'd
rather have lower latency to South African participants, `af-south-1` (Cape
Town) works too, but it's an "opt-in" region — enable it first under
Account → AWS Regions, then use that value instead everywhere below.

Run this from the repo root (`cd` there now) — later steps read files
relative to it (`deploy/aws/*.json`, `Dockerfile`, `docker-compose.prod.yml`).

## §1 — Domain

Nothing to do yet — you already own `tasktails.co.za`. Just make sure you can
log into whatever registrar you bought it through; you'll add one DNS record
there in §6.

## §2 — ECR repository

```bash
aws ecr create-repository \
  --repository-name tasktails \
  --image-scanning-configuration scanOnPush=true \
  --region "$REGION"

export ECR_REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
echo "$ECR_REGISTRY"
```

## §3 — IAM: let GitHub Actions push, without storing AWS keys

**§3a — register GitHub's OIDC provider** (once per AWS account only — if a
previous project already did this, skip straight to §3b).

The provider registration needs the SHA-1 fingerprint of the root CA in
GitHub's certificate chain. Don't hardcode this — GitHub has rotated it
before (it's currently a Let's Encrypt root, not the DigiCert one older
tutorials cite), so fetch it live instead:

```bash
THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com \
  -connect token.actions.githubusercontent.com:443 -showcerts 2>/dev/null \
  | python3 -c "
import re, sys, ssl, hashlib
data = sys.stdin.read()
certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', data, re.S)
der = ssl.PEM_cert_to_DER_cert(certs[-1])
print(hashlib.sha1(der).hexdigest())
")
echo "$THUMBPRINT"; echo -n "$THUMBPRINT" | wc -c   # must print 40
```

Run that from your own machine on a normal network connection, not through
a corporate VPN or proxy that intercepts TLS — if the issuer names printed
by a manual `openssl x509 -in ... -noout -issuer` look unfamiliar (anything
other than a real public CA), something between you and GitHub is
substituting its own certificate, and this thumbprint will be wrong.

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list "$THUMBPRINT"
```

If that errors with `EntityAlreadyExists`, it's already registered — that's
fine, continue.

**§3b — the role GitHub assumes to push images.** The two policy files in
`deploy/aws/` have `<ACCOUNT_ID>`, `<REGION>`, `<GITHUB_ORG>/<GITHUB_REPO>`
placeholders — generate filled-in copies rather than hand-editing the
committed files:

```bash
sed -e "s#<ACCOUNT_ID>#$ACCOUNT_ID#g" -e "s#<GITHUB_ORG>/<GITHUB_REPO>#$GH_REPO#g" \
  deploy/aws/github-oidc-trust-policy.json > /tmp/trust-policy.json

sed -e "s#<ACCOUNT_ID>#$ACCOUNT_ID#g" -e "s#<REGION>#$REGION#g" \
  deploy/aws/github-deploy-permissions-policy.json > /tmp/deploy-permissions.json

aws iam create-role \
  --role-name tasktails-github-deploy \
  --assume-role-policy-document file:///tmp/trust-policy.json

aws iam put-role-policy \
  --role-name tasktails-github-deploy \
  --policy-name tasktails-ecr-push \
  --policy-document file:///tmp/deploy-permissions.json

export GITHUB_DEPLOY_ROLE_ARN=$(aws iam get-role \
  --role-name tasktails-github-deploy --query Role.Arn --output text)
echo "$GITHUB_DEPLOY_ROLE_ARN"
```

Keep that ARN — it's a GitHub secret in §8.

**§3c — the role EC2 assumes to pull images.** Different mechanism (an
instance profile the box itself runs as, not something GitHub assumes):

```bash
sed -e "s#<ACCOUNT_ID>#$ACCOUNT_ID#g" -e "s#<REGION>#$REGION#g" \
  deploy/aws/ec2-ecr-pull-policy.json > /tmp/ec2-pull.json

aws iam create-role \
  --role-name tasktails-ec2-ecr-pull \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name tasktails-ec2-ecr-pull \
  --policy-name tasktails-ecr-pull \
  --policy-document file:///tmp/ec2-pull.json

aws iam create-instance-profile --instance-profile-name tasktails-ec2-ecr-pull
aws iam add-role-to-instance-profile \
  --instance-profile-name tasktails-ec2-ecr-pull \
  --role-name tasktails-ec2-ecr-pull
```

## §4 — RDS (the database)

This section is entirely in the AWS web console, not the terminal — RDS has
enough settings that a guided form beats CLI flags, especially the one
setting that actually matters for privacy (step 8 below).

**Two quick definitions**, since the console assumes you know them:
- **VPC** = an isolated private network inside your AWS account. Everything
  you launch (the database, the EC2 instance) lives inside one. You don't
  need to create one — every new AWS account already has a default VPC, and
  that's what you'll use.
- **Security group** = a firewall: a named list of "allow traffic from X on
  port Y" rules, attached to a resource. You'll create one for the database
  that, by the end of §5, allows connections *only* from the EC2 instance —
  nothing else on the internet can reach it.

**Before anything else, check the region.** Top right of the console, next
to your account name, there's a region dropdown — it needs to say
**Europe (Ireland)** (`eu-west-1`), matching `$REGION` from §0 and the ECR
repository §2 already created there. The console often defaults to whatever
region you last looked at, which may not be that one. If it says anything
else, click it and switch to Europe (Ireland) now — RDS and EC2 (§5) must
end up in the same region so they can be wired to the same VPC and see each
other's security groups.

**Steps:**

1. Go to **[console.aws.amazon.com](https://console.aws.amazon.com)** and
   sign in as the IAM user you created in §0 (not root).
2. In the search bar at the very top of the page, type `RDS` and click the
   **RDS** result (under Services).
3. You're now on the RDS dashboard. Click the small arrow on the orange
   **Create database** button (top right) to open its dropdown, and choose
   **Full configuration**. (This is the current console's name for what
   older versions called "Standard create" — it's the one that shows every
   setting, including the "Public access: No" toggle in step 8 below.
   **Express configuration** picks settings for you and can't be trusted to
   leave the database private, and **Restore from S3** is for restoring an
   existing backup, not relevant here.)
4. **Engine options**: click the **PostgreSQL** tile (it has an elephant
   logo). Below that, an **Engine Version** dropdown appears — pick the
   highest available **17.x** version (this matches the `postgres:17-alpine`
   version used in local development).
5. **Templates**: click **Free tier**. This automatically restricts the
   instance size and storage to what's covered by the AWS Free Tier — you
   don't need to touch those settings yourself, and shouldn't, or you risk
   picking something that costs money.
6. **Settings**:
   - **DB instance identifier**: type `tasktails`
   - **Master username**: type `tasktails`
   - **Credentials management**: leave on **Self managed**
   - **Master password** / **Confirm master password**: click into the
     password field — there's usually an **Auto generate a password**
     checkbox; leave it checked, or type your own. Either way, **click
     "Show" and copy the password somewhere safe right now** — the console
     stops showing it once you move to the next screen, and you'll need it
     in §7. Don't lose it; there's no way to retrieve it later, only reset
     it.
7. **Instance configuration**: leave whatever the Free Tier template already
   picked (should be `db.t3.micro` or `db.t4g.micro`) — don't change it.
8. **Connectivity** (this is the important one):
   - **Compute resource**: leave on "Don't connect to an EC2 compute
     resource" (you'll connect it yourself in §5, once the instance exists).
   - **Network type**: IPv4.
   - **Virtual private cloud (VPC)**: leave on the **Default VPC**.
   - **Public access**: click **No**. This is the setting that keeps the
     database unreachable from the open internet — required, not optional,
     since this database will hold real participant data.
   - **VPC security group**: choose **Create new**. In the **New VPC
     security group name** field that appears, type `tasktails-rds-sg`.
     Leave it with no inbound rules for now — you'll add exactly one, from
     the EC2 instance, in §5, once that instance's own security group
     exists to reference.
9. Scroll down to **Additional configuration**, click to expand it, and
   under **Initial database name** type `tasktails`. (Everything else in
   this section — backups, encryption, maintenance — is fine left at its
   default for a 2-week study.)
10. Scroll to the bottom and click the orange **Create database** button.
11. You're redirected to the RDS instance list. Your `tasktails` database
    shows a status like **Creating** — this takes a few minutes. Refresh
    (circular arrow icon, top right of the list) until it says
    **Available**.
12. Click on the `tasktails` database name to open its details page. Under
    the **Connectivity & security** tab, find **Endpoint** — a long hostname
    like `tasktails.c9akciq32.eu-west-1.rds.amazonaws.com`. Copy it.

Back in your terminal:

```bash
# Paste the endpoint (step 12) and password (step 6) from the console:
export RDS_ENDPOINT=<paste-endpoint-here>
export RDS_PASSWORD=<paste-password-here>

# The CA bundle DATABASE_URL's sslmode=verify-full needs — RDS's cert chains
# to Amazon's own CA, not a publicly-trusted one (the SSL trap documented in
# .env.example). You'll scp this to the instance in §7.
curl -o rds-global-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

## §5 — EC2 (the instance)

First, one terminal command — this creates an SSH key pair AWS will let you
use to log into the instance later (in §7), and downloads the private half
of it to a file on your machine:

```bash
aws ec2 create-key-pair --key-name tasktails-deploy --region "$REGION" \
  --query 'KeyMaterial' --output text > tasktails-deploy.pem
chmod 400 tasktails-deploy.pem
```

`ls tasktails-deploy.pem` should now show that file in your current
directory. Guard it like a password — anyone with it can log into the
server.

**Now the console — launching the instance itself:**

1. In the AWS console search bar, type `EC2` and click the **EC2** result.
2. Click the orange **Launch instance** button.
3. **Name**: type `tasktails`.
4. **Application and OS Images (Amazon Machine Image)**: the first tile,
   **Amazon Linux**, should already be selected — make sure the dropdown
   below it says **Amazon Linux 2023 AMI**. Leave everything else in this
   box as-is.
5. **Instance type**: click the dropdown and choose (or type to search)
   **t3.micro** — it should be marked "Free tier eligible".
6. **Key pair (login)**: click the dropdown and select **tasktails-deploy**
   — the one you just created above. (If it's not in the list, refresh the
   page; the console sometimes needs a moment to notice a key pair created
   via CLI.)
7. **Network settings**: click the **Edit** button on the right of this
   section to expand it.
   - **VPC**: leave on the Default VPC (same one RDS used in §4).
   - **Firewall (security groups)**: select **Create security group**.
   - **Security group name**: type `tasktails-ec2-sg`.
   - Under **Inbound security groups rules**, there's already one rule for
     SSH. Set its **Source type** to **My IP** (the console fills in your
     current IP automatically) — this restricts SSH access to only your
     current internet connection.
   - Click **Add security group rule** twice more:
     - Type **HTTP**, Source type **Anywhere** (`0.0.0.0/0`)
     - Type **HTTPS**, Source type **Anywhere** (`0.0.0.0/0`)
   - Leave outbound rules untouched (default allows everything out).
8. **Configure storage**: leave the default 8 GiB gp3 volume — plenty for
   this image (~316 MB per INF-15).
9. Click to expand **Advanced details** near the bottom of the page, scroll
   down within it to **IAM instance profile**, and select
   **tasktails-ec2-ecr-pull** (the role you created in §3c). This is what
   lets the box `docker login` to ECR later with zero stored AWS
   credentials on the instance itself.
10. Everything else can stay default. Click the orange **Launch instance**
    button, bottom right.
11. Click the instance ID link on the confirmation screen (or go to
    **Instances** in the left sidebar) to watch it start — **Instance
    state** goes from `Pending` to `Running` after a minute or so.
12. Click into the instance and copy its **Instance ID** (looks like
    `i-0abc123def456789`).

Back in your terminal, give the instance a stable public IP address (by
default EC2's IP changes if you ever stop/start it — an Elastic IP fixes
that, which matters since your domain needs to point somewhere permanent):

```bash
export INSTANCE_ID=<paste-instance-id-from-step-12>

aws ec2 allocate-address --region "$REGION" --domain vpc \
  --query '[AllocationId,PublicIp]' --output text
# prints two values on one line, separated by a tab — paste them:
export ALLOC_ID=<paste-the-first-value-eipalloc-...>
export ELASTIC_IP=<paste-the-second-value-an-ip-address>

aws ec2 associate-address --region "$REGION" \
  --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID"

echo "$ELASTIC_IP"
```

**One more console step:** now that `tasktails-ec2-sg` exists, open the
database to it. Go to **EC2 → Security Groups** (left sidebar) →
click **tasktails-rds-sg** → **Inbound rules** tab → **Edit inbound rules**
→ **Add rule**:
- Type: **PostgreSQL** (this fills in port 5432 for you)
- Source: click the source field, and instead of typing an IP address,
  start typing `tasktails-ec2-sg` and select it from the dropdown that
  appears (searching by security group, not by IP address, is what makes
  this rule mean "only this specific EC2 instance," not "everyone")

Click **Save rules**.

## §6 — DNS

An **A record** is the DNS rule that says "this domain name points at this
IP address" — it's how a browser turns `tasktails.co.za` into the actual
server to connect to.

```bash
echo "$ELASTIC_IP"   # if this prints nothing, you're in a new terminal —
                      # re-run §0's export block, then §5's IP export lines
```

Log into whichever registrar/panel you bought `tasktails.co.za` through,
find its DNS settings (often called "DNS management" or "DNS records"), and
add an A record: host/name `@` (some registrars want the full
`tasktails.co.za` instead — use whichever the UI's placeholder text
suggests), value = the IP address `echo` just printed, TTL can be left
default.

Give it a few minutes to propagate — §7's Caddy step needs `tasktails.co.za`
to actually resolve to this IP before it can request a certificate. Check
with:

```bash
dig +short tasktails.co.za
```

Don't move on to §7 until that prints your Elastic IP.

## §7 — Set up the instance

```bash
ssh -i tasktails-deploy.pem ec2-user@$ELASTIC_IP
```

Everything below this line runs **on the instance**, over that SSH session.

```bash
# Docker + the compose plugin
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# then exit and `ssh` back in once, for the group change to take effect

mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version

# AWS CLI (needed so the box can `docker login` to ECR — see deploy.yml)
sudo dnf install -y aws-cli

sudo mkdir -p /opt/tasktails
sudo chown ec2-user:ec2-user /opt/tasktails
```

Back on **your machine** (a new terminal tab, not the SSH session — re-export
`$ELASTIC_IP` there first if it's a fresh shell), copy the three files the
instance needs:

```bash
scp -i tasktails-deploy.pem docker-compose.prod.yml Caddyfile rds-global-bundle.pem \
  ec2-user@$ELASTIC_IP:/opt/tasktails/
```

Generate the session secret locally (this repo already has the tooling):

```bash
npx auth secret
```

Back in the **SSH session**, create `/opt/tasktails/.env` — this file never
leaves the box and is never in git; it's read both for compose's own
`${...}` substitution and, via `env_file`, injected into the containers:

```bash
cat > /opt/tasktails/.env <<EOF
AUTH_SECRET=
DATABASE_URL=postgresql://tasktails:@:5432/tasktails?schema=public&sslmode=verify-full&sslrootcert=/app/certs/rds-global-bundle.pem
AUTH_URL=https://tasktails.co.za
DOMAIN=tasktails.co.za
ECR_REGISTRY=

# Optional — leave blank to hide the Google sign-in button
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
EOF
chmod 600 /opt/tasktails/.env
cd /opt/tasktails && ls
# expect: Caddyfile  docker-compose.prod.yml  rds-global-bundle.pem  .env
```

`sslrootcert=/app/certs/rds-global-bundle.pem` is a path *inside the
container* — `docker-compose.prod.yml` already mounts the file you `scp`'d up
at that exact path for both `migrate` and `app`, read-only. Nothing left to
do here; you can `exit` the SSH session now.

## §8 — GitHub: secrets and variables

This section is entirely on **github.com**, in your browser — no terminal.
You're giving the `deploy.yml` workflow (§9) the handful of values it can't
know on its own: which AWS role to assume, which server to SSH into, and
the key to get in with.

GitHub has two separate lists for this — **Secrets** (values are write-only;
once saved, nobody, including you, can view them again in the UI, only
overwrite them — for anything sensitive) and **Variables** (plain values you
*can* see again later — for things that aren't sensitive, like a region
name). You'll add 4 secrets and 2 variables.

**Get there:**

1. Go to your repo on github.com (`github.com/SaskiaSteyn/tasktails`).
2. Click the **Settings** tab (top of the repo, near the top right — you
   need to be logged in as the repo owner to see this tab at all).
3. In the left sidebar, find **Secrets and variables** and click it — it
   expands to show a few sub-items.
4. Click **Actions** underneath it.
5. You'll land on a page with two tabs near the top: **Secrets** and
   **Variables**. You'll use both.

**Add the 4 secrets** (make sure the **Secrets** tab is selected):

For each row below: click the green **New repository secret** button, type
the **Name** exactly as shown (case-sensitive, no spaces), paste the
**Value** into the box underneath, then click **Add secret**. Repeat 4 times.

| Name (type exactly) | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | The ARN from §3b. If you don't have it saved, get it again by running this locally: `aws iam get-role --role-name tasktails-github-deploy --query Role.Arn --output text` |
| `EC2_HOST` | `3.251.41.182` |
| `EC2_SSH_USER` | `ec2-user` |
| `EC2_SSH_KEY` | The full contents of `tasktails-deploy.pem`. Locally, run `cat tasktails-deploy.pem` and copy **everything** it prints, including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines — leaving either out breaks it. |

**Add the 2 variables:** click the **Variables** tab (next to Secrets, same
page). Same process — **New repository variable** button, exact **Name**,
**Value**, **Add variable** — twice:

| Name (type exactly) | Value |
|---|---|
| `AWS_REGION` | `eu-west-1` |
| `ECR_REGISTRY` | `184353711080.dkr.ecr.eu-west-1.amazonaws.com` |

**When you're done**, the Secrets tab should list 4 names (you won't be able
to see their values again, just the names — that's normal and expected for
secrets) and the Variables tab should list the 2 above with their actual
values visible. That's §8 complete.

## §9 — First deploy

```bash
git checkout main
git merge dev   # or however this branch's work lands on main
git push origin main
```

Watch the **Actions** tab on GitHub: `CI` runs first; once it's green,
`Deploy` starts automatically (it's gated on `CI` succeeding — see the
architecture note above), builds both image targets, pushes to ECR, then
SSHes to the instance and runs `docker compose -f docker-compose.prod.yml
pull && up -d`. The first run also pulls the Caddy image and requests the
Let's Encrypt certificate, so it'll take a little longer than later deploys.

## §10 — Verify

- `https://tasktails.co.za/login` loads over HTTPS with a valid, non-warning
  certificate.
- Register an account, sign in, land on an authenticated page — this
  confirms `AUTH_URL`/`AUTH_TRUST_HOST`/`src/proxy.ts`'s forwarded-header
  handling and the RDS connection all work end to end (the same check INF-15
  did against the local compose stack, now against the real thing).
- SSH back in and run `docker compose -f docker-compose.prod.yml ps` —
  `migrate` should show `Exited (0)`, `app` and `caddy` should show healthy/
  running.
- Push a trivial change to `main` and confirm `Deploy` picks it up with no
  manual step on the instance — that's the "auto-deploys on push to main"
  requirement, proven rather than assumed.

## Costs and the free-tier cliff

Free for 12 months from account creation (EC2 + RDS Free Tier), plus the
domain (~$12/yr) throughout. After 12 months: EC2 t3.micro ~$7.50/mo + RDS
db.t4g.micro ~$13/mo ≈ **$21/mo**. If the study has finished by then, just
terminate the EC2 instance and delete the RDS instance
(`aws rds delete-db-instance --db-instance-identifier tasktails
--skip-final-snapshot` — take a snapshot first if you want to keep the data)
rather than let them keep running.

If the free tier expires *during* the study, NFR-GEN-3's own fallback is
migrating `DATABASE_URL` to Neon (~$7/month) — a one-line change in the
instance's `.env`, no code or compose changes needed, per the recipe already
in `.env.example`.

## Rollback

Every deploy is tagged with its commit SHA in ECR (`runner-<sha>`,
`migrator-<sha>`), not just `-latest`. To roll back, SSH to the instance and:

```bash
cd /opt/tasktails
GOOD_SHA=<the commit sha you want to roll back to>
sed -i "s/runner-latest/runner-$GOOD_SHA/; s/migrator-latest/migrator-$GOOD_SHA/" docker-compose.prod.yml
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Once `main` is fixed, `git checkout docker-compose.prod.yml` (or manually
revert the `sed`) so the next normal deploy moves back to `-latest`.
