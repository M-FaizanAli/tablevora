import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/layout/logo";

export const metadata = { title: "About & source — Tablevora" };

export default function AboutPage() {
  return <main className="mx-auto max-w-3xl px-6 py-20">
    <Link href="/" className="inline-flex items-center gap-3 text-xl font-semibold"><Logo size={36} />Tablevora</Link>
    <h1 className="mt-12 text-4xl font-semibold">Restaurant software, with roots.</h1>
    <p className="mt-6 leading-8 text-muted-foreground">Tablevora is a customized restaurant POS and operations platform maintained by Faizan. It builds on Nodedr OrderRestro by Nodedr Infotech Private Limited and Raktim Ranjit. The original authors retain copyright in their contributions.</p>
    <p className="mt-5 leading-8 text-muted-foreground">Tablevora modifications include the brand identity, deployment configuration, and security improvements documented in the repository. The software is licensed under the GNU Affero General Public License, version 3 only (AGPL-3.0-only). You may copy, modify, and redistribute it under that license. It comes without warranty, except where a separate service agreement provides one.</p>
    <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-primary">
      <a href={BRAND.sourceUrl}>Get the corresponding source</a>
      <a href="https://github.com/M-FaizanAli/tablevora/blob/master/LICENSE">Read the license</a>
      <a href="https://github.com/Raktim94/nodedr-restaurant-pos">Original project</a>
      <a href={BRAND.supportUrl}>Support & feedback</a>
    </div>
  </main>;
}
