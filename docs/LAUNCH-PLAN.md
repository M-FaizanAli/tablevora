# Tablevora: launch and client-service workflow

## Launch status (10 November 2026)

The public workspace is a **sample demo**, not a client production service. The separate production-mode Platform Admin and self-signup service has not been provisioned. Multi-currency work on `codex/tablevora-launch` is still in progress. During this review, the direct API health check timed out, while the proxied health check and demo sign-in subsequently succeeded. Recheck the full order-to-bill workflow before sending a prospect to the demo.

**No paid infrastructure is authorized.** Vercel [limits Hobby to personal or noncommercial use](https://vercel.com/docs/plans/hobby), and Render [says not to use Free instances for production applications](https://render.com/docs/free). Do not use the current Vercel/Render free demo as a commercial client production service. Netlify [permits commercial projects on its Free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/) and has a [hard free-plan spending limit](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/); it is a candidate for the public sales site after a separate deployment and flow test. For the first restaurant customer, sell configuration, deployment, training, and support on a **client-owned** server/account with suitable production hosting. Quote infrastructure separately and have the client pay its provider directly.

The product is AGPL-3.0-only. Keep attribution and a prominent working source link in network deployments. The [AGPL network-use clause](https://www.gnu.org/licenses/agpl-3.0.en.html#section13) applies to modified versions.

## Fast first-client sequence

1. **Prepare the proof:** Verify the demo sign-in, order, kitchen, payment, report, and logout after the API wakes. Capture a two-minute screen walkthrough with fictional data. Do not use the existing `brag-output` video without updating its old menu, currency, and subscription claims.
2. **Publish a truthful offer:** Present Tablevora as your customization and support service built on the credited open-source foundation. The sales branch landing page has a WhatsApp inquiry link for `+923066493090`; deploy the commercial landing to a host whose free terms allow commercial use, then smoke-test the new URL. Do not enable public tenant signups until the separate service is provisioned and verified.
3. **Find ten relevant restaurants:** Start with independent cafés and restaurants with one to three branches. Look for visible order handoff, table tracking, or reporting pain. Use referrals, local visits, and individual LinkedIn messages. Record the contact, pain, date, next step, and result in a simple lead sheet.
4. **Run discovery before quoting:** Ask about branches, daily orders, menu size, kitchen stations, tax rules, currency, printers, network reliability, existing software, staff roles, data migration, and support hours. Demonstrate only the matching workflow; do not imply offline write sync, payment gateway processing, or tax compliance is already included.
5. **Offer a scoped pilot:** Agree on one location, a small menu, one order-to-bill workflow, training, acceptance criteria, support window, data ownership, and exit/export terms. The customer owns the production infrastructure. Price your implementation and support after discovery; no hosting expense is incurred in your account.
6. **Go live only after acceptance:** Apply migrations to the isolated database, take and restore a backup, check actual receipt hardware and taxes, verify staff permissions, rehearse rollback, and obtain written acceptance. Keep the public demo separate.

Example first message: “Hi [name], I customize Tablevora for restaurant order, kitchen, table, and billing workflows. I noticed [specific observation]. Would a 15-minute walkthrough of how your team handles that step be useful? I can show a sample workflow and discuss a one-location pilot.”

Track qualified conversations, demos booked, pilots agreed, pilot completion, and support renewals. These are targets to measure, not claims of existing customers or proven savings.

## 1. Brand and source — implemented

Use Tablevora, the forest/cream/mint palette, and Outfit/Geist typography in the brand guide. Keep the existing AGPL license, NOTICE, upstream credit, and a working source link in deployed installations. Describe your work as customization, security improvements, deployment, and ongoing service. Do not imply that you authored the entire upstream product.

The public repository is https://github.com/M-FaizanAli/tablevora. Publish only reviewed code and fictional sample data. Keep credentials in the host's secret settings.

## 2. Complete the hosted demo

The existing sample API uses Render Free and Neon Free PostgreSQL through Vercel Marketplace; the Render blueprint intentionally expects an externally configured database URL. Configure the frontend with that API URL before building; use the polling transport through the same-origin proxy. Set the API CORS origin to the final frontend URL and enable secure cookies. Use dedicated demo credentials and the demo guard. The shared demo API and database can cold-start; no paid resources are configured. Check provider terms before promoting or using this deployment for commercial sales.

Before sharing, verify HTTPS, sign-in, table selection, item modifiers, kitchen receipt, payment recording, logout, tenant isolation, and blocked administrative actions on the hosted environment. Confirm that the API/database plan remains active and that the cold-start behavior is suitable for demonstrations. Keep one API replica initially.

## 3. Prepare a truthful portfolio

Capture the landing page, POS, kitchen, and dashboard with sample data. Record a short walkthrough: restaurant problem → order → kitchen → payment → report. On GitHub and LinkedIn, explain the open-source foundation and identify your changes. Link the demo and repository. Present it as a restaurant service you customize and maintain, without claiming production adoption, certification, payment processing, or features that have not been validated.

Suggested positioning: “I customize and deploy restaurant POS workflows under my Tablevora brand, built on the AGPL OrderRestro foundation.” No social post is published as part of this setup.

## 4. Package the service

Offer three clearly scoped services: setup and training; workflow customization; and maintenance/support. Quote after discovering the client's branches, terminals, menu size, tax rules, receipt printers, migration needs, and support hours. Separate one-time implementation work from recurring support and client-paid hosting. State response times, excluded work, data ownership, source delivery, and exit/export arrangements in the proposal.

## 5. Pilot one restaurant

Create a separate client environment with DEMO_MODE=false and unique credentials. Import an approved menu and opening inventory; configure tax/currency with the client. Test their actual printer, drawer, network, and receipts. Validate refunds, closing reports, permissions, backup restoration, and loss-of-internet behavior. Train staff and obtain acceptance against the agreed workflow before replacing their current till.

## 6. Operate and improve

Keep release notes and versioned deployments. Test upgrades in staging; back up before migrations and define a recovery procedure. Monitor uptime and failed jobs. Review dependencies routinely and schedule maintenance. Prioritize offline terminal-write synchronization, printer failover, per-seat billing, and multi-replica coordination only when required by paying clients; these are not completed features of this launch.
