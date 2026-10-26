import Link from "next/link";
import { ArrowUpRight, Check, ChefHat, LayoutGrid, ReceiptText, Sprout, ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { BRAND } from "@/lib/brand";

const features = [
  { icon: ReceiptText, title: "From first order to final bill.", text: "A touch-friendly POS for dine-in, takeaway, and delivery. Modifiers, split payments, and receipts in one place." },
  { icon: ChefHat, title: "Keep the kitchen in the loop.", text: "Live tickets, kitchen stations, and clear preparation states help the front and back of house stay together." },
  { icon: LayoutGrid, title: "See the whole restaurant.", text: "Manage tables, reservations, stock, staff, and daily reports without jumping between disconnected tools." },
];

export default function HomePage() {
  return <div className="min-h-screen bg-background">
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 lg:px-10">
      <Link href="/" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Logo size={38} />Tablevora<span className="text-primary">.</span></Link>
      <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm font-medium">
        <a href="#product" className="hidden text-muted-foreground sm:block">The platform</a>
        <Link href="/docs" className="hidden text-muted-foreground sm:block">Resources</Link>
        <Link href="/login" className="rounded-full bg-primary px-5 py-2.5 text-primary-foreground">Open workspace <ArrowUpRight className="ml-1 inline size-4" /></Link>
      </nav>
    </header>
    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[1fr_1.05fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 px-3.5 py-2 text-xs font-semibold uppercase tracking-[.15em] text-primary"><Sprout className="size-4" /> Room for better service</div>
          <h1 className="max-w-xl text-5xl font-medium leading-[1.06] tracking-[-.04em] sm:text-6xl lg:text-7xl">A calmer service.<br /><span className="text-primary">A smarter restaurant.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">Less juggling. More hospitality. Bring your orders, kitchen, tables, and billing together with Tablevora.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3.5 font-medium text-primary-foreground">Explore the workspace <ArrowRight className="size-4" /></Link>
            <a href="#product" className="rounded-full border border-border bg-card px-6 py-3.5 font-medium">Take a closer look</a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Built on open source. Configured for your restaurant.</p>
        </div>
        <div className="relative rounded-[2rem] bg-[#123E32] p-5 sm:p-9">
          <div className="mb-8 flex items-center justify-between text-sm text-[#D7EBDD]"><span className="font-medium">A good service starts here.</span><span className="flex items-center gap-2 text-xs"><span className="size-1.5 rounded-full bg-[#A9E8C8]" /> Workspace preview</span></div>
          <div className="rounded-2xl bg-[#F7F5EF] p-5 text-[#182D26] shadow-2xl sm:p-7">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#527363]">The Greenhouse · Demo restaurant</p><h2 className="mt-2 text-2xl font-medium">Ready for the dinner rush.</h2></div><Logo size={34} /></div>
            <div className="my-6 grid grid-cols-3 gap-2 border-y border-[#DDE4DA] py-5">{[["12", "Tables"], ["08", "Open orders"], ["04", "In the kitchen"]].map(([value,label])=><div key={label}><div className="font-heading text-3xl font-medium">{value}</div><div className="mt-1 text-[10px] text-[#527363] sm:text-xs">{label}</div></div>)}</div>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold"><span>Kitchen at a glance</span><span className="text-[#527363]">Illustrative preview</span></div>
            {[["Table 04", "2 × Grilled chicken bowl", "Preparing", "#E5EEDB"], ["Table 08", "1 × Margherita · 2 × Lemonade", "Ready to serve", "#CDEBD9"], ["Takeaway #12", "2 × Garden sandwich", "New order", "#EEE8DA"]].map(([table,items,status,color])=><div key={table} className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#E2E7DD] bg-white p-3.5"><div><p className="text-xs font-semibold">{table}</p><p className="mt-1 text-[10px] text-[#527363] sm:text-xs">{items}</p></div><span className="shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-medium" style={{backgroundColor:color}}>{status}</span></div>)}
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#D7EBDD]"><Check className="size-4 text-[#A9E8C8]" /> One shared view, from the floor to the kitchen.</div>
        </div>
      </section>
      <section id="product" className="border-y border-border bg-card/60 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Made for the everyday</p><h2 className="mt-4 max-w-2xl text-4xl font-medium tracking-tight">Your whole service.<br />Working together.</h2><div className="mt-12 grid gap-10 md:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title}><div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="size-6" /></div><h3 className="text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></article>)}</div></div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 py-20 md:flex-row md:items-center lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Your restaurant. Your way.</p><h2 className="mt-4 text-3xl font-medium">Software, setup, and a human to help.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">Run on your local server or choose a managed deployment. Menu setup, workflow customization, staff training, and support are available as services.</p></div><Link href="/docs" className="inline-flex shrink-0 items-center gap-3 self-start rounded-full border border-border px-6 py-3 text-sm font-medium">Explore the documentation <ArrowUpRight className="size-4" /></Link></section>
    </main>
    <footer className="border-t border-border px-6 py-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-xs text-muted-foreground sm:flex-row"><span>Tablevora · Customized and maintained by Faizan.</span><div className="flex flex-wrap gap-5"><Link href="/about">Credits & license</Link><a href={BRAND.sourceUrl}>Source code</a><a href={BRAND.supportUrl}>Support</a></div></div></footer>
  </div>;
}
