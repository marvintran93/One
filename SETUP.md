# Setup guide — zero to live

This walks you through getting the storefront onto the internet with no prior coding knowledge. Plan for **2–3 hours** the first time. Everything in the "required" stack has a free tier; you only pay Stripe a percentage of sales once you go live.

Estimated cost while testing: **$0.** Estimated cost once live: only Stripe's 2.9% + 30¢ per card sale (plus a few dollars a month for SMS if you turn on Twilio).

---

## 0. What you're going to set up

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Holds the code | Free |
| **Vercel** | Hosts the live website | Free for this scale |
| **Supabase** | Database, user accounts, photo storage | Free for ~50 users |
| **Stripe** | Card payments | Free until you sell; then 2.9% + 30¢ |
| **Google Maps** | Distance lookup for delivery fee | Free credit covers thousands of orders |
| **SendGrid** (optional) | Sends emails | Free up to 100/day |
| **Twilio** (optional) | Sends SMS | ~$1/month + $0.008/text |

You can launch with just the first five. SendGrid and Twilio can be added later.

---

## 1. Sign up for accounts (15 minutes)

Open each of these in a new tab and create an account:

1. **GitHub** — https://github.com (you already have one — `marvintran93`)
2. **Vercel** — https://vercel.com → "Sign up with GitHub"
3. **Supabase** — https://supabase.com → "Start your project" → "Sign in with GitHub"
4. **Stripe** — https://stripe.com → "Start now"
5. **Google Cloud** — https://console.cloud.google.com (use any Google account)

Set passwords aside in a password manager. You'll need to log back into these.

---

## 2. Get the code on the main branch (5 minutes)

Right now the code lives on a branch called `claude/private-delivery-storefront-i67vi`. You need to merge it into `main` so Vercel deploys it.

1. Go to https://github.com/marvintran93/one
2. You'll see a yellow banner saying "claude/private-delivery-storefront-i67vi had recent pushes" with a green **Compare & pull request** button. Click it.
3. Title: `Initial storefront build`. Click **Create pull request**.
4. On the PR page, scroll down and click the green **Merge pull request** button → **Confirm merge**.
5. Now `main` has all the code.

---

## 3. Set up Supabase (20 minutes)

This is the database where your products, orders, and accounts live.

### 3a. Create the project

1. Log into https://supabase.com.
2. Click **New project**.
3. Name it anything (e.g. `local-delivery`). Pick a strong database password and **save it in your password manager**. Region: pick the one closest to Houston (`us-east-1` is fine).
4. Click **Create new project** and wait ~2 minutes for it to provision.

### 3b. Run the database schema

1. In the left sidebar, click the SQL icon (looks like `<>`), then **New query**.
2. Open this file in another tab: https://github.com/marvintran93/one/blob/main/supabase/schema.sql
3. Click the "raw" button in the top right of that file. Select everything (Ctrl/Cmd-A), copy it (Ctrl/Cmd-C).
4. Paste it into the Supabase SQL editor and click **Run** (bottom right). You should see "Success. No rows returned."

### 3c. Create the photo storage bucket

1. Sidebar → **Storage** → **New bucket**.
2. Name: `delivery-photos`. Make sure **Public bucket** is **OFF** (it must be private).
3. Click **Save**.

### 3d. Configure auth URLs

1. Sidebar → **Authentication** → **URL Configuration**.
2. **Site URL**: leave as `http://localhost:3000` for now — we'll update it after deploying.
3. **Redirect URLs**: add `http://localhost:3000/auth/callback`. We'll add the live URL later.

### 3e. Copy the API keys

1. Sidebar → **Project Settings** (gear icon) → **API**.
2. Open a notes app or a text file and copy these three values, each on its own line:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string)
   - **service_role** key (another long string — keep this one private)

---

## 4. Set up Stripe (15 minutes)

### 4a. Stay in test mode for now

In the top-right of Stripe, there's a toggle for **Test mode**. Make sure it's **ON** while you set up. You'll flip it off later when you're ready for real sales.

### 4b. Get your keys

1. Click **Developers** (top nav) → **API keys**.
2. Copy these into your notes file:
   - **Publishable key** (starts with `pk_test_…`)
   - **Secret key** (starts with `sk_test_…` — click **Reveal**)

### 4c. Set your statement descriptor

1. **Settings** (gear icon) → **Business settings** → **Public details**.
2. Set **Statement descriptor** to whatever generic name you want on customer card statements (e.g. `LDC HOUSTON`). Keep it under 22 characters.
3. Save.

(The webhook comes later, after you have a live URL.)

---

## 5. Set up Google Maps Distance Matrix (10 minutes)

1. Log into https://console.cloud.google.com.
2. Top bar → project dropdown → **New project**. Name it `local-delivery`. Click **Create**.
3. Once it's the active project, top bar → search **"Distance Matrix API"** → click it → **Enable**.
4. Left sidebar → **APIs & Services** → **Credentials** → **+ Create credentials** → **API key**.
5. Copy the key into your notes file.
6. (Recommended) Click **Restrict key** → under **API restrictions** pick **Restrict key** → check **Distance Matrix API** → Save.
7. Set up billing: top-left menu → **Billing** → add a card. Google gives you $200/month free credit which is way more than you'll use.

---

## 6. Deploy to Vercel (15 minutes)

This is what turns the code into a real website with a URL.

1. Log into https://vercel.com.
2. Click **Add New…** → **Project**.
3. Find your `marvintran93/one` repo and click **Import**.
4. Don't change any build settings. Scroll down to **Environment Variables**.
5. Add each of these one by one (name on the left, value on the right). Copy the values from your notes file:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now — we'll fill it in after first deploy |
   | `NEXT_PUBLIC_BRAND_NAME` | whatever you want shown (e.g. `Local Delivery Co.`) |
   | `NEXT_PUBLIC_BILLING_DESCRIPTOR` | same value you set in Stripe (e.g. `LDC`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `SUPABASE_DELIVERY_PHOTO_BUCKET` | `delivery-photos` |
   | `STRIPE_SECRET_KEY` | Stripe `sk_test_…` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe `pk_test_…` |
   | `STRIPE_WEBHOOK_SECRET` | leave blank for now — set in step 8 |
   | `GOOGLE_MAPS_API_KEY` | Google Maps key |
   | `STORE_ORIGIN_ADDRESS` | your store address (e.g. `1234 Main St, Houston, TX 77002`) |

6. Click **Deploy**. Wait ~3 minutes.
7. When it's done you'll see a confetti animation and a URL like `local-delivery-xyz.vercel.app`. **Copy this URL** — that's your live site.

### 6a. Fill in the site URL and redeploy

1. In Vercel, go to your project → **Settings** → **Environment Variables**.
2. Edit `NEXT_PUBLIC_SITE_URL` and paste your live URL (e.g. `https://local-delivery-xyz.vercel.app`).
3. Top nav → **Deployments** → click the **⋯** on the latest one → **Redeploy**.

---

## 7. Tell Supabase about the live URL (2 minutes)

1. Back in Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: change to your Vercel URL (e.g. `https://local-delivery-xyz.vercel.app`).
3. **Redirect URLs**: add `https://local-delivery-xyz.vercel.app/auth/callback`.
4. Save.

---

## 8. Set up the Stripe webhook (5 minutes)

The webhook is how Stripe tells your site "this order was paid."

1. In Stripe (still in test mode) → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**: `https://your-vercel-url.vercel.app/api/webhook/stripe`
3. **Events to send**: click **Select events** → search and check:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
4. **Add endpoint**.
5. On the endpoint page, find **Signing secret** and click **Reveal**. Copy the value (starts with `whsec_…`).
6. Back in Vercel → **Settings** → **Environment Variables**.
7. Edit `STRIPE_WEBHOOK_SECRET` and paste the value.
8. **Deployments** → redeploy.

---

## 9. Make yourself the admin (5 minutes)

Right now nobody can log in. You need to sign up as a user, then mark yourself as admin in the database.

1. Open your Vercel URL in a browser.
2. Click **Request access**, fill in the signup form with your real email, your phone, your DOB, and check both boxes. Submit.
3. Check your email for a confirmation link from Supabase. Click it.
4. Back in Supabase → **SQL editor** → **New query**. Paste this (replace `you@example.com` with the email you signed up with):

   ```sql
   update public.profiles
   set role = 'admin', status = 'approved', approved_at = now()
   where email = 'you@example.com';
   ```

5. Click **Run**.
6. Go back to your Vercel URL, sign in. You should land on the **Admin dashboard**.

You are now the admin. 🎉

---

## 10. Add your first product (2 minutes)

1. In the admin nav, click **Products** → **Add product**.
2. Fill in name (e.g. `Charcoal Tee`), description, color accent, and the price for each size (in dollars — the form handles the conversion).
3. Tick **Available** for the sizes you stock.
4. Save.
5. Sign out, sign up as a fake customer in an incognito window, approve them from your admin account, and try placing an order.

To test card payment in test mode, use card number `4242 4242 4242 4242`, any future expiration, any CVC, any ZIP. Stripe will treat it as successful and your webhook will mark the order paid.

---

## 11. Turn on email and SMS (optional, do anytime)

### 11a. SendGrid for transactional email

1. Sign up at https://sendgrid.com (free).
2. **Settings** → **Sender Authentication** → verify a single sender email (your business email).
3. **Settings** → **API Keys** → **Create API Key** → **Full Access** → copy the key (starts with `SG.…`).
4. In Vercel, set:
   - `SENDGRID_API_KEY` = the key
   - `SENDGRID_FROM_EMAIL` = the verified email
   - `SENDGRID_FROM_NAME` = your brand name
5. Redeploy.

If you also want **Supabase's** email-verification messages (the confirmation link people click after signing up) to come from your domain instead of Supabase's, in Supabase: **Authentication → Emails → SMTP Settings** → enable custom SMTP → use `smtp.sendgrid.net` port `587` with `apikey` as username and your SendGrid key as the password.

### 11b. Twilio for SMS

1. Sign up at https://twilio.com.
2. Buy a phone number (~$1/month) and complete A2P 10DLC registration if you're sending to US numbers — this is required and can take a few days to be approved.
3. **Account info** → copy **Account SID** and **Auth Token**.
4. In Vercel:
   - `TWILIO_ACCOUNT_SID` = SID
   - `TWILIO_AUTH_TOKEN` = token
   - `TWILIO_FROM_NUMBER` = the Twilio number you bought (in `+15551234567` format)
5. Redeploy.

### 11c. Get notified when something happens

In Vercel, set:
- `ADMIN_ALERT_EMAILS` = your email (comma-separated for multiple)
- `ADMIN_ALERT_PHONES` = your phone in `+15551234567` format

You'll get pinged on new account requests and new paid orders.

---

## 12. Going live (when you're ready)

1. In Stripe, complete **Business activation** (the orange banner on the dashboard). This unlocks live mode.
2. Flip Stripe out of **Test mode** (toggle top-right).
3. **Developers → API keys**: copy your **live** publishable + secret keys.
4. **Developers → Webhooks**: create the same webhook again, this time in live mode, copy the new `whsec_…`.
5. In Vercel, update the three Stripe env vars with the **live** values.
6. Redeploy.

---

## Customize the look

The aesthetic is **organic / luxury** by default: warm sand background, espresso ink, hairline borders, Cormorant Garamond serif headings, Inter body text. You can adjust it without writing code, or ask me to make bigger changes.

### Change the brand name

Vercel → **Settings → Environment Variables** → edit `NEXT_PUBLIC_BRAND_NAME` → redeploy.

### Upload your logo

The fastest way:

1. Save your logo as a PNG, JPG, or SVG. **Transparent PNG** or **SVG** works best. Aim for roughly 600×200 px (or any tall-rectangle ratio that crops cleanly).
2. On GitHub, go to https://github.com/marvintran93/one → **public** folder → **Add file → Upload files** → drag your logo in → name it `logo.png` (or whatever extension matches) → **Commit changes** at the bottom.
3. In Vercel → **Settings → Environment Variables** → set `NEXT_PUBLIC_LOGO_URL` to `/logo.png` (with the leading slash) → redeploy.

Your logo will now appear in the nav, on the sign-in screen, and on the sign-up / pending-approval screens — replacing the text brand name. Leave `NEXT_PUBLIC_LOGO_URL` blank to revert to the typographic version.

If you'd rather host the logo externally (e.g. in Supabase Storage or a CDN), put the full URL in `NEXT_PUBLIC_LOGO_URL` instead of `/logo.png`. The image must be publicly accessible.

### Change the billing descriptor

That's the short name that appears on customer card statements. Set `NEXT_PUBLIC_BILLING_DESCRIPTOR` in Vercel **and** match it in **Stripe → Settings → Public details → Statement descriptor**. Keep it under 22 characters.

### Want bigger style changes?

These require a code change (one commit, one redeploy — I'll do it for you, just describe what you want):

- **A different palette** — e.g. cream + oxblood, off-black + champagne, sage + bone, all-black with a single jewel-tone accent.
- **A different font pairing** — e.g. Fraunces + Manrope (modern luxury), Playfair + Lato (classic), all-sans Söhne-style.
- **A landing/hero section** above the catalog with imagery and a short statement.
- **Product image uploader in the admin** so you can attach real photos instead of the placeholder block (this needs to be built; ask).
- **A custom email template** for SendGrid notifications so they match the site.
- **Tighter or more spacious layout**, sharper or softer corners, with-shadows or flat.

Just tell me the direction and I'll ship it.

---

## Custom domain (optional)

Vercel gives you a `.vercel.app` URL by default. To use your own domain:

1. Buy the domain (Namecheap, Cloudflare, Google Domains — any registrar).
2. In Vercel → project → **Settings** → **Domains** → add your domain. Vercel will show you DNS records to add at your registrar.
3. Once it goes green, update in Vercel env vars: `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com`.
4. Update the Supabase site URL + redirect URL to the new domain.
5. Update the Stripe webhook endpoint URL to the new domain.
6. Redeploy.

---

## Troubleshooting

**"I signed up but the confirmation email never came."** Check spam. If still missing, in Supabase → **Authentication** → **Users** → find your user → click the three-dot menu → **Confirm user** to bypass email verification once.

**"Stripe says the webhook signature is wrong."** The `STRIPE_WEBHOOK_SECRET` env var doesn't match the webhook you created. Re-copy it from Stripe and redeploy.

**"Delivery quote says 'could not look up address'."** The Google Maps key isn't restricted correctly, or Distance Matrix API isn't enabled. Go back to step 5.

**"I made changes in Vercel and the site still shows the old version."** You need to redeploy. Vercel → Deployments → ⋯ on the latest → Redeploy.

**"Someone other than me logged in and went straight to the storefront without being approved."** Check Supabase → Authentication → Users — they must have confirmed their email AND have `status='approved'` in the `profiles` table. The admin approval queue is at `/admin/approvals` on your live site.

**"I want to delete a product but the button just deactivates it."** That's intentional — products that have been ordered can't be hard-deleted without breaking the order history. They're hidden from the storefront when inactive.

---

## What to do next

Once you've got a live site with at least one product and you've placed a successful test order end-to-end:

1. Add the rest of your real products with real photos (upload images to Supabase Storage and paste the URL in the product's image field — that part needs to be added to the admin UI; right now the image block is a placeholder).
2. Decide whether you want to require ID-based age verification (Stripe Identity or Persona) or stick with the DOB checkbox.
3. Buy a domain and wire it up.
4. Go live in Stripe and process your first real order.
