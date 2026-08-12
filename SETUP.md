# Northwest Premier Yacht Management — Setup Guide

## 1. GitHub account + Pages

1. Create a new GitHub account for the business, using `youremail+nwpym@gmail.com`
   as the sign-up email (Gmail's "+" trick — mail still lands in your normal
   inbox, but GitHub treats it as a unique address). Suggested username:
   `nwpyachtmanagement` or `nwp-yacht-management`.
2. Create a new repo, e.g. `nwpyachtmanagement.github.io` (this gives you the
   cleanest possible GitHub Pages URL with no extra path) — or a normal repo
   name if you'd rather keep the URL as `username.github.io/reponame`.
3. Upload `index.html` to the repo root (drag-and-drop in the GitHub web UI
   is more reliable than the mobile editor for larger files).
4. Repo → Settings → Pages → Deploy from branch → `main` / root. Your site
   will be live at `https://<username>.github.io/` (or `/<reponame>/`)
   within a minute or two.
5. When your brother picks a domain, point it at GitHub Pages with a CNAME
   file + DNS records — happy to walk through that when the time comes.

## 2. Contact form — Cloudflare Worker relay

The form posts JSON to a Worker, which emails it via **Resend**
(free tier, no card required, generous limit for a contact form).

**Set up Resend**
1. Create a free account at resend.com.
2. Grab an API key (Dashboard → API Keys → Create).
3. To send from your own address later, add and verify your domain in
   Resend (DNS records). Until then, `worker.js` sends from
   `onboarding@resend.dev`, which works immediately with no setup —
   replies still go to the person who filled out the form via `reply_to`.

**Deploy the Worker**
1. In the Cloudflare dashboard → Workers & Pages → Create → Create Worker.
2. Name it something like `nwpym-contact-relay`.
3. Paste in the contents of `worker.js`.
4. Settings → Variables → add a secret:
   - `RESEND_API_KEY` = your Resend API key (mark as "Encrypt")
   - Optional: `TO_EMAIL` (defaults to `nwpyachtmanagement@gmail.com`),
     `FROM_EMAIL`, `ALLOWED_ORIGIN` (set to your live site URL once you have
     one, to lock down who can call the relay)
5. Deploy. You'll get a URL like
   `https://nwpym-contact-relay.<your-subdomain>.workers.dev`.

**Wire it to the site**
1. Open `index.html`, find the line:
   ```js
   var RELAY_URL = "https://nwpym-contact-relay.YOUR-SUBDOMAIN.workers.dev";
   ```
2. Replace with your actual Worker URL, commit, push.
3. Submit a test inquiry on the live site and confirm it lands in the inbox.

## 3. Later: custom domain

Once your brother picks a domain:
- Point the domain's DNS at GitHub Pages (A/AAAA records or CNAME,
  depending on apex vs. subdomain) and add a `CNAME` file to the repo.
- Optionally move the domain's DNS to Cloudflare for easier management of
  both the site and the Worker route in one place.
- Update `ALLOWED_ORIGIN` on the Worker to the real domain for tighter CORS.

## 4. Editing content later

All copy, services, and pricing live directly in `index.html` — service
list items are in a small JS array near the bottom of the file
(`internalServices` / `vendorServices`) if those change often. Everything
else is plain HTML you can edit directly.
