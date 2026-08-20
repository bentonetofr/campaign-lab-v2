import { ArrowRight, Dices, ScrollText, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: ScrollText,
    title: "Campanhas no lugar certo",
    description: "Sessões, fichas e histórias organizadas para o grupo inteiro."
  },
  {
    icon: Dices,
    title: "Rolagens sem interrupção",
    description: "Um dado rápido e sempre à mão, adaptado ao sistema da mesa."
  },
  {
    icon: ShieldCheck,
    title: "Cada pessoa no seu espaço",
    description: "Mestres e jogadores acessam exatamente o que precisam."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Swords size={20} />
          </div>
          <span className="font-heading text-xl tracking-[0.18em] text-primary">VORTERIUM</span>
        </div>
        <Button variant="outline" size="sm">Entrar</Button>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-36 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles size={14} />
            O coração da sua campanha
          </div>
          <h1 className="max-w-3xl font-heading text-5xl leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            A aventura começa quando a mesa se encontra.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            Vorterium reúne mestres e jogadores para cuidar do que importa: a história, a ficha e os próximos momentos inesquecíveis.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg">
              Criar minha campanha <ArrowRight size={18} />
            </Button>
            <Button variant="outline" size="lg">Conhecer o Vorterium</Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative rounded-3xl border border-border bg-card/90 p-5 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Campanha ativa</p>
                <h2 className="mt-2 font-heading text-2xl text-foreground">As Cinzas de Althera</h2>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary"><Dices size={21} /></div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Próxima sessão", "Sábado, 20h"],
                ["Sistema", "D&D 5e"],
                ["Aventureiros", "4 jogadores"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-muted/70 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-primary">
                <span>Última aventura</span><span>Cap. III</span>
              </div>
              <p className="mt-3 font-heading text-lg text-foreground">O sussurro sob a montanha</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 border-t border-border px-6 py-14 sm:grid-cols-3 lg:px-8">
        {pillars.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border border-border/70 bg-card/40 p-6">
            <Icon className="text-primary" size={22} />
            <h3 className="mt-5 font-heading text-lg text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
