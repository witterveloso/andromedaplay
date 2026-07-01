import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  Camera,
  BookOpen,
} from "lucide-react";

// Troque este link pelo checkout externo real quando estiver disponível.
const external_checkout_url = "#";

export const Route = createFileRoute("/produtos/comunica-pascom")({
  head: () => ({
    meta: [
      { title: "Comunica Pascom — Formação em Comunicação Paroquial | Andromeda Play" },
      {
        name: "description",
        content:
          "Curso completo para comunicadores de pastorais e paróquias. Aprenda a evangelizar nas redes com propósito, técnica e identidade católica.",
      },
      { property: "og:title", content: "Comunica Pascom — Comunicação a serviço da fé" },
      {
        property: "og:description",
        content:
          "Formação prática para Pascom, comunicadores paroquiais e voluntários de mídia. Redes sociais, transmissões, design e narrativa evangelizadora.",
      },
    ],
  }),
  component: ComunicaPascomPage,
});

function CheckoutButton({
  children,
  size = "lg",
}: {
  children: React.ReactNode;
  size?: "default" | "lg";
}) {
  return (
    <Button
      asChild
      size={size}
      className="group bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_40px_-10px_rgba(139,92,246,0.7)] hover:opacity-95"
    >
      <a href={external_checkout_url} target="_blank" rel="noopener noreferrer">
        {children}
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </Button>
  );
}

function ComunicaPascomPage() {
  const benefits = [
    {
      icon: Camera,
      title: "Fotografia e vídeo com celular",
      desc: "Capte celebrações, eventos e testemunhos com qualidade profissional usando o que você já tem em mãos.",
    },
    {
      icon: Radio,
      title: "Transmissões ao vivo sem travar",
      desc: "Passo a passo para transmitir missas e encontros com áudio limpo e imagem estável.",
    },
    {
      icon: MessageCircle,
      title: "Redes sociais com propósito",
      desc: "Planejamento editorial católico, calendário litúrgico e linha visual coerente com sua paróquia.",
    },
    {
      icon: Video,
      title: "Edição rápida e eficiente",
      desc: "Fluxos de trabalho para publicar cortes, reels e vídeos institucionais em minutos.",
    },
    {
      icon: BookOpen,
      title: "Narrativa evangelizadora",
      desc: "Aprenda a contar histórias que tocam, sem cair no marketing raso — comunicação a serviço do Evangelho.",
    },
    {
      icon: ShieldCheck,
      title: "Ética, direitos e boas práticas",
      desc: "Uso de imagens, LGPD na paróquia, direitos autorais e cuidados pastorais na comunicação.",
    },
  ];

  const audience = [
    "Coordenadores e voluntários da Pascom",
    "Padres, seminaristas e religiosos(as) que querem comunicar melhor",
    "Comunicadores paroquiais que cuidam de redes sociais e transmissões",
    "Movimentos, pastorais e comunidades que querem profissionalizar sua presença digital",
    "Leigos apaixonados por evangelização digital",
  ];

  const testimonials = [
    {
      name: "Ana Beatriz",
      role: "Pascom — Paróquia São José",
      text: "Nossas transmissões deixaram de travar e a comunidade voltou a acompanhar as missas online. Mudou tudo.",
    },
    {
      name: "Diácono Rafael",
      role: "Comunicação Diocesana",
      text: "Finalmente um curso pensado para a realidade da paróquia — direto ao ponto e com espiritualidade.",
    },
    {
      name: "Marina Alves",
      role: "Voluntária Pascom",
      text: "Aprendi a editar reels em minutos. Nosso Instagram triplicou de alcance em dois meses.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#06060f] text-foreground">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(108,77,255,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,184,255,0.16), transparent 60%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(236,72,153,0.10), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent)",
          backgroundSize: "600px 600px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm tracking-[0.3em] text-white/70 hover:text-white">
          ANDROMEDA
        </Link>
        <Link
          to="/produtos"
          className="text-xs uppercase tracking-widest text-white/60 hover:text-white"
        >
          ← Catálogo
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-20 md:pt-16 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
            <Sparkles className="h-3 w-3" /> Formação Pascom · Turma 2026
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Comunica{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              Pascom
            </span>
          </h1>
          <p className="mt-5 text-lg text-white/75 md:text-xl">
            Formação completa para comunicadores de pastorais e paróquias que querem evangelizar
            nas redes com propósito, técnica e identidade católica.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CheckoutButton>Quero garantir minha vaga</CheckoutButton>
            <a
              href="#beneficios"
              className="text-xs uppercase tracking-[0.28em] text-white/60 hover:text-white"
            >
              Ver o que você aprende
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> +2.000 comunicadores formados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Garantia de 7 dias
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" /> 4.9/5 de avaliação
            </span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-400/10 p-1 backdrop-blur">
          <div className="grid aspect-[21/9] w-full place-items-center rounded-[calc(1.5rem-4px)] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.25),transparent_70%)]">
            <div className="text-center">
              <Radio className="mx-auto h-10 w-10 text-white/70" />
              <p className="mt-3 text-xs uppercase tracking-[0.32em] text-white/60">
                Comunicação a serviço do Evangelho
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
            O que você vai aprender
          </div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Da técnica ao propósito — tudo para sua paróquia comunicar bem
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-white">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quem é */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
              Para quem é
            </div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Feito para quem comunica a fé no mundo digital
            </h2>
            <p className="mt-4 text-white/65">
              Se você cuida da comunicação da sua paróquia, movimento ou pastoral — este curso foi
              desenhado para acelerar seus resultados com uma linguagem católica e profissional.
            </p>
          </div>

          <ul className="space-y-3">
            {audience.map((a) => (
              <li
                key={a}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
                <span className="text-white/85">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
            Depoimentos
          </div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Comunidades que já transformaram sua comunicação
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex gap-0.5 text-cyan-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-white/80">
                "{t.text}"
              </blockquote>
              <figcaption className="mt-5">
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-white/55">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Garantia */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8 text-center md:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-indigo-500/25">
            <ShieldCheck className="h-7 w-7 text-cyan-200" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold md:text-3xl">
            Garantia incondicional de 7 dias
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Assista às primeiras aulas com calma. Se sentir que o curso não é para você, basta
            enviar um e-mail dentro de 7 dias e devolvemos 100% do valor investido. Sem
            burocracia, sem perguntas.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-fuchsia-500/20 to-cyan-400/20 p-10 text-center md:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,255,255,0.15), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              Sua paróquia merece comunicar melhor
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Entre na próxima turma do Comunica Pascom e leve a mensagem do Evangelho mais longe,
              com técnica e propósito.
            </p>
            <div className="mt-8 flex justify-center">
              <CheckoutButton>Quero me inscrever agora</CheckoutButton>
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-white/55">
              Pagamento único · Acesso imediato · Garantia de 7 dias
            </p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Andromeda Play · Comunica Pascom
      </footer>
    </main>
  );
}
