# Tablevora: launch and client-service workflow

## 1. Brand and source — implemented

Use Tablevora, the forest/cream/mint palette, and Outfit/Geist typography in the brand guide. Keep the existing AGPL license, NOTICE, upstream credit, and a working source link in deployed installations. Describe your work as customization, security improvements, deployment, and ongoing service. Do not imply that you authored the entire upstream product.

The public repository is https://github.com/M-FaizanAli/tablevora. Publish only reviewed code and fictional sample data. Keep credentials in the host's secret settings.

## 2. Complete the hosted demo

Deploy the API on Render Free and use Neon Free PostgreSQL through Vercel Marketplace; the Render blueprint intentionally expects an externally configured database URL. Configure the Vercel frontend with that API URL before building; use the polling transport through the same-origin proxy. Set the API CORS origin to the final frontend URL and enable secure cookies. Use dedicated demo credentials and the demo guard. The shared demo API and database can cold-start; no paid resources are configured.

Before sharing, verify HTTPS, sign-in, table selection, item modifiers, kitchen receipt, payment recording, logout, tenant isolation, and blocked administrative actions on the hosted environment. Confirm that the API/database plan remains active and that the cold-start behavior is suitable for demonstrations. Keep one API replica initially.

## 3. Prepare a truthful portfolio

Capture the landing page, POS, kitchen, and dashboard with sample data. Record a short walkthrough: restaurant problem → order → kitchen → payment → report. On GitHub and LinkedIn, explain the open-source foundation and identify your changes. Link the demo and repository. Present it as a restaurant service you customize and maintain, without claiming production adoption, certification, payment processing, or features that have not been validated.

Suggested positioning: “I customize and deploy restaurant POS workflows under my Tablevora brand, built on the AGPL OrderRestro foundation.” No social post is published as part of this setup.

## 4. Package the service

Offer three clearly scoped services: setup and training; workflow customization; and managed hosting/maintenance. Quote after discovering the client's branches, terminals, menu size, tax rules, receipt printers, migration needs, and support hours. Separate one-time implementation work from recurring hosting and support. State response times, excluded work, data ownership, source delivery, and exit/export arrangements in the proposal.

## 5. Pilot one restaurant

Create a separate client environment with DEMO_MODE=false and unique credentials. Import an approved menu and opening inventory; configure tax/currency with the client. Test their actual printer, drawer, network, and receipts. Validate refunds, closing reports, permissions, backup restoration, and loss-of-internet behavior. Train staff and obtain acceptance against the agreed workflow before replacing their current till.

## 6. Operate and improve

Keep release notes and versioned deployments. Test upgrades in staging; back up before migrations and define a recovery procedure. Monitor uptime and failed jobs. Review dependencies routinely and schedule maintenance. Prioritize offline terminal-write synchronization, printer failover, per-seat billing, and multi-replica coordination only when required by paying clients; these are not completed features of this launch.
