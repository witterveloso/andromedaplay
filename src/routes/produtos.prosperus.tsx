import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  X,
  Flame,
  Sparkles,
  Compass,
  Leaf,
  Users,
  BookOpen,
  Target,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import prosperusLogoAsset from "@/assets/prosperus-logo.png.asset.json";
import prosperusHeroAsset from "@/assets/prosperus-hero.png.asset.json";
import anaVelosoAsset from "@/assets/ana-veloso.png.asset.json";

export const Route = createFileRoute("/produtos/prosperus")({
  head: () => ({
    meta: [
      { title: "Prosperus — Comunidade de Desenvolvimento Profissional" },
      {
        name: "description",
        content:
          "Temperamento entendido. Comportamento ajustado. Crescimento profissional sustentável.",
      },
      {
        property: "og:title",
        content: "Prosperus — Comunidade de Desenvolvimento Profissional",
      },
      {
        property: "og:description",
        content:
          "Temperamento entendido. Comportamento ajustado. Crescimento profissional sustentável.",
      },
      { property: "og:url", content: "https://andromedaplay.lovable.app/produtos/prosperus" },
    ],
    links: [
      { rel: "canonical", href: "https://andromedaplay.lovable.app/produtos/prosperus" },
    ],
  }),
  component: ProsperusPage,
});

/* Brand colors from the reference art */
const BG = "#04060F";
const RED = "#FF3D1A";
const GOLD = "#FFC700";
const BLUE = "#00A3FE";
const GREEN = "#1FCB3A";

/* --- Small building blocks ------------------------------------------ */

function LightStreaks({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -left-20 top-1/3 h-px w-[60%] rotate-[-8deg] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`,
          boxShadow: `0 0 24px ${BLUE}`,
        }}
      />
      <div
        className="absolute right-0 top-1/2 h-px w-[45%] rotate-[6deg] opacity-50"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          boxShadow: `0 0 24px ${GOLD}`,
        }}
      />
      <div
        className="absolute left-1/4 bottom-10 h-px w-[70%] rotate-[-3deg] opacity-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${RED}, transparent)`,
          boxShadow: `0 0 20px ${RED}`,
        }}
      />
    </div>
  );
}

/* Signature graphic: 4 silhouettes rising over neon growth bars */
function GrowthArtwork({ className = "" }: { className?: string }) {
  const bars = [
    { c: RED, h: 30 },
    { c: GOLD, h: 50 },
    { c: BLUE, h: 72 },
    { c: GREEN, h: 96 },
  ];
  return (
    <div className={`relative ${className}`}>
      <div className="relative flex h-full w-full items-end justify-center gap-3 sm:gap-6 md:gap-10">
        {bars.map((b, i) => (
          <div key={i} className="relative flex flex-col items-center">
            {/* Silhouette */}
            <div
              className="mb-2 h-6 w-3 rounded-full sm:h-8 sm:w-4 md:h-10 md:w-5"
              style={{
                background: `linear-gradient(180deg, #fff, ${b.c})`,
                boxShadow: `0 0 18px ${b.c}, 0 0 40px ${b.c}80`,
              }}
            />
            <div
              className="h-8 w-4 rounded-t-md sm:h-10 sm:w-6 md:h-12 md:w-7"
              style={{
                background: `linear-gradient(180deg, #fff, ${b.c})`,
                boxShadow: `0 0 22px ${b.c}`,
              }}
            />
            {/* Bar */}
            <div
              className="mt-1 w-8 rounded-t-md sm:w-12 md:w-16"
              style={{
                height: `${b.h}%`,
                background: `linear-gradient(180deg, ${b.c}, ${b.c}30)`,
                boxShadow: `0 0 28px ${b.c}, 0 0 60px ${b.c}70`,
              }}
            />
            {/* Reflection */}
            <div
              className="mt-0.5 w-8 opacity-30 blur-[2px] sm:w-12 md:w-16"
              style={{
                height: `${b.h / 3}%`,
                background: `linear-gradient(180deg, ${b.c}, transparent)`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProsperusWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-black ${className}`}
      style={{
        whiteSpace: "nowrap",
        backgroundImage:
          "linear-gradient(180deg, #ffffff 0%, #e8ecf3 40%, #a9b1c1 70%, #ffffff 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        textShadow: "0 0 24px rgba(255,255,255,0.08)",
      }}
    >
      PROSPERUS
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      {eyebrow && (
        <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function BulletList({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "negative" }) {
  const Icon = tone === "negative" ? X : Check;
  const color =
    tone === "negative"
      ? "text-white/40"
      : "text-white";
  const iconColor = tone === "negative" ? "text-white/40" : "";
  return (
    <ul className="grid gap-3">
      {items.map((t, i) => (
        <li key={i} className={`flex items-start gap-3 ${color}`}>
          <span
            className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
              tone === "negative"
                ? "border border-white/15"
                : "bg-gradient-to-br from-white/90 to-white/40"
            }`}
          >
            <Icon
              className={`h-3 w-3 ${tone === "negative" ? iconColor : "text-[#04060F]"}`}
            />
          </span>
          <span className="text-sm leading-relaxed sm:text-base">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function GoldButton({
  children,
  href,
  size = "md",
  external = false,
}: {
  children: React.ReactNode;
  href?: string;
  size?: "md" | "lg";
  external?: boolean;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
    size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
  }`;
  const style: React.CSSProperties = {
    background:
      "linear-gradient(180deg, #ffffff 0%, #f5efd6 40%, #FFC700 100%)",
    color: "#04060F",
    boxShadow: `0 10px 40px -10px ${GOLD}90, 0 0 20px ${GOLD}40`,
  };
  const content = (
    <>
      {children}
      <ArrowRight className="h-4 w-4" />
    </>
  );
  if (href)
    return (
      <a
        href={href}
        className={cls}
        style={style}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  return (
    <button type="button" className={cls} style={style}>
      {content}
    </button>
  );
}

const PROSPERUS_CHECKOUT_URL = "https://buy.stripe.com/28EeVd2vWcNd9GWf8a1sQ01";

/* --- Data -------------------------------------------------------------- */

const PATTERNS = [
  "Começar com força e perder constância",
  "Assumir responsabilidades demais e se sobrecarregar",
  "Analisar tanto que demora para agir",
  "Evitar conflitos importantes e depois se sentir invisível",
  "Falar demais quando deveria observar",
  "Se calar quando deveria se posicionar",
  "Confundir intensidade com maturidade",
  "Confundir prudência com medo",
  "Confundir produtividade com valor pessoal",
];

const WHAT_IS = [
  "Entender seu temperamento",
  "Identificar seus padrões de comportamento",
  "Ajustar atitudes que limitam seu crescimento",
  "Desenvolver mais clareza, constância e maturidade profissional",
];

const FOR_WHOM = [
  "Sente que tem potencial, mas não transforma isso em crescimento consistente",
  "Quer entender melhor sua forma de agir no trabalho",
  "Percebe que repete padrões",
  "Quer amadurecer sem perder a essência",
  "Deseja melhorar comunicação, decisões, postura e resultados",
  "Sabe que crescer depende também de comportamento",
];

const IDENTIFY = [
  "Como o temperamento influencia o trabalho",
  "Por que você reage assim sob pressão",
  "Comportamentos que fortalecem ou enfraquecem sua imagem profissional",
  "Como lidar com chefes, colegas, clientes e equipes",
  "Padrões a corrigir",
  "Constância sem depender de motivação",
  "Posicionamento maduro",
  "Decisões estratégicas",
  "Trajetória sustentável",
];

const TEMPERAMENTS = [
  {
    name: "Colérico",
    color: RED,
    icon: Flame,
    tag: "Ação — Coragem",
    traits: ["Controle", "Resultado", "Velocidade", "Impaciência"],
  },
  {
    name: "Sanguíneo",
    color: GOLD,
    icon: Sparkles,
    tag: "Comunicação — Influência",
    traits: ["Comunicação", "Entusiasmo", "Dispersão", "Necessidade de estímulo"],
  },
  {
    name: "Melancólico",
    color: BLUE,
    icon: Compass,
    tag: "Análise — Clareza",
    traits: ["Análise", "Profundidade", "Perfeccionismo", "Autocobrança"],
  },
  {
    name: "Fleumático",
    color: GREEN,
    icon: Leaf,
    tag: "Estabilidade — Suporte",
    traits: ["Estabilidade", "Prudência", "Passividade", "Dificuldade de confronto"],
  },
];

const PILLARS = [
  {
    icon: BookOpen,
    title: "Aulas e conteúdos práticos",
    text: "Sem excesso de teoria solta. Sem linguagem complicada. Sem promessa mágica.",
  },
  {
    icon: Users,
    title: "Comunidade de desenvolvimento",
    text: "Foco em ajuste pessoal — não em reclamação. Um ambiente adulto para amadurecer.",
  },
  {
    icon: Target,
    title: "Estudos sobre os 4 temperamentos",
    text: "Exercícios e provocações. Porque quem não se observa, repete.",
  },
];

const NOT_IS = [
  "Terapia",
  "Teste de personalidade superficial",
  "Grupo de motivação",
  "Espaço para justificar comportamento imaturo",
];

const CHANGES = [
  "Dificuldade de terminar o que começa",
  "Irritação com pessoas lentas",
  "Necessidade constante de agradar",
  "Autocrítica excessiva",
  "Procrastinação",
  "Dificuldade de se posicionar",
];

const NOT_FOR = [
  "Quem busca fórmulas mágicas",
  "Quem quer apenas conteúdo motivacional",
  "Quem não está disposto a se observar",
  "Quem procura culpados fora de si",
];

const RECEIVE = [
  "Jornada de conteúdos sobre temperamentos, comportamento e crescimento profissional",
  "Aulas, materiais, provocações, estudos e direcionamentos",
  "Comunidade de fortalecimento e ajuste comportamental",
];

const FINAL_CHECK = [
  "Você sente que precisa amadurecer profissionalmente",
  "Quer entender por que reage como reage",
  "Deseja melhorar sua comunicação",
  "Quer mais constância",
  "Precisa lidar melhor com pressão",
  "Quer se posicionar melhor",
  "Percebe que seu comportamento limita seu crescimento",
  "Quer uma carreira mais sólida",
];

/* --- Page -------------------------------------------------------------- */

function ProsperusPage() {
  return (
    <main
      className="min-h-screen text-white"
      style={{ background: BG }}
    >
      {/* Header */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6 sm:py-6">
        <Link
          to="/"
          className="text-xs tracking-[0.3em] text-white/70 hover:text-white sm:text-sm"
        >
          ANDROMEDA
        </Link>
        <Link
          to="/produtos"
          className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white sm:text-xs"
        >
          ← Catálogo
        </Link>
      </header>

      {/* HERO */}
      <section className="relative w-full overflow-hidden" style={{ background: BG }}>
        {/* Background artwork — natural aspect ratio, no expansion/crop */}
        <img
          src={prosperusHeroAsset.url}
          alt=""
          aria-hidden="true"
          className="block w-full h-auto select-none"
        />
        {/* Readability gradient — dark on the left where text sits, letting the neon figures shine on the right */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(4,6,15,0.92) 0%, rgba(4,6,15,0.78) 30%, rgba(4,6,15,0.35) 60%, rgba(4,6,15,0.05) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(4,6,15,0.55) 0%, transparent 25%, transparent 70%, rgba(4,6,15,0.85) 100%)",
          }}
        />

        <div className="absolute inset-0 z-10 mx-auto flex max-w-6xl items-center px-5 py-10 sm:px-6 sm:py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/70 backdrop-blur sm:text-[11px]">
              <Sparkles className="h-3 w-3" /> Comunidade Andromeda Play
            </div>
            <h1 className="font-display leading-[0.95]">
              <ProsperusWordmark className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl" />
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:mt-6 sm:text-lg md:text-xl">
              Temperamento entendido. Comportamento ajustado.{" "}
              <span className="text-white">Crescimento profissional sustentável.</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-8">
              <GoldButton size="lg" href={PROSPERUS_CHECKOUT_URL} external>
                Entrar para a Prosperus
              </GoldButton>
              <a
                href="#sobre"
                className="text-xs uppercase tracking-widest text-white/70 hover:text-white sm:text-sm"
              >
                Saiba mais ↓
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Abertura / dor */}
      <section id="sobre" className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <p className="text-base leading-relaxed text-white/80 sm:text-lg">
          Você não cresce profissionalmente apenas porque trabalha muito. Você cresce
          quando começa a entender por que reage como reage, por que trava em certos
          momentos, por que se sabota em algumas decisões e por que, mesmo tendo
          capacidade, às vezes não consegue sustentar constância, posicionamento e
          maturidade no ambiente de trabalho.
        </p>
        <p className="mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
          A <ProsperusWordmark className="text-sm sm:text-base" /> é uma comunidade de
          desenvolvimento profissional baseada no entendimento dos temperamentos e na
          construção de um comportamento mais adulto, estratégico e consciente.
        </p>
        <p className="mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
          Aqui, você não vai receber frases motivacionais vazias. Você vai aprender a
          olhar para o seu modo de funcionar com mais clareza, identificar padrões
          que atrapalham seu crescimento e ajustar comportamentos que influenciam
          diretamente sua carreira, sua liderança, sua comunicação e seus resultados.
        </p>
      </section>

      {/* Problema */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle
            eyebrow="O problema"
            title="Não é só falta de oportunidade"
          />
          <BulletList items={PATTERNS} />
          <p className="mt-8 text-base italic text-white/60 sm:text-lg">
            E o pior: muitas vezes você nem percebe que está repetindo isso.
          </p>
        </div>
      </section>

      {/* O que é */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="O que é" title="O que é a Prosperus?" />
        <BulletList items={WHAT_IS} />
        <p className="mt-8 text-base leading-relaxed text-white/70 sm:text-lg">
          Não se trata de colocar você dentro de uma caixinha. Também não se trata de
          justificar seus erros dizendo: "eu sou assim mesmo". Temperamento explica
          inclinações.{" "}
          <span className="text-white">Mas comportamento pode ser educado.</span>
        </p>
      </section>

      {/* Para quem é */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Público" title="Para quem é a Prosperus?" />
          <div className="grid gap-4 sm:grid-cols-2">
            {FOR_WHOM.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#FFC700]" />
                  <span className="text-sm leading-relaxed text-white/85 sm:text-base">
                    {t}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Você vai aprender a identificar */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle
          eyebrow="Aprendizado"
          title="Dentro da comunidade você vai aprender a identificar"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IDENTIFY.map((t, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent p-4"
            >
              <span className="text-sm text-white/85 sm:text-base">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Os 4 temperamentos — brand colors */}
      <section
        className="relative overflow-hidden border-y border-white/5 px-5 py-16 sm:px-6 sm:py-24"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.04), transparent 60%)",
        }}
      >
        <LightStreaks />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionTitle eyebrow="Fundamentos" title="Os 4 temperamentos" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPERAMENTS.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.name}
                  className="group relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-1"
                  style={{
                    borderColor: `${t.color}40`,
                    background: `linear-gradient(180deg, ${t.color}12, #05070F 70%)`,
                    boxShadow: `0 0 0 1px ${t.color}20, 0 20px 60px -30px ${t.color}80`,
                  }}
                >
                  <div
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: `${t.color}20`,
                      boxShadow: `0 0 24px ${t.color}80`,
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: t.color }} />
                  </div>
                  <h3
                    className="font-display text-2xl font-bold"
                    style={{ color: t.color, textShadow: `0 0 20px ${t.color}60` }}
                  >
                    {t.name}
                  </h3>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/50">
                    {t.tag}
                  </div>
                  <ul className="mt-5 space-y-2">
                    {t.traits.map((tr) => (
                      <li key={tr} className="flex items-center gap-2 text-sm text-white/80">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }}
                        />
                        {tr}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm italic text-white/60 sm:text-base">
            O objetivo não é rotular pessoas. O objetivo é entender padrões para
            ajustar comportamentos.
          </p>
        </div>
      </section>

      {/* Pilares */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle
          eyebrow="Estrutura"
          title="O que você encontra dentro da Prosperus"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `${GOLD}18`,
                    boxShadow: `0 0 20px ${GOLD}70`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: GOLD }} />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                  {p.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Por que isso importa */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle
            eyebrow="Carreira"
            title="Por que isso importa pra sua carreira?"
          />
          <p className="text-base leading-relaxed text-white/75 sm:text-lg">
            Competência técnica sozinha não sustenta crescimento. Empresas promovem
            por confiança, postura, comunicação e maturidade. Quem não sabe se
            comunicar, se posicionar e se conduzir sob pressão, cedo ou tarde é
            ultrapassado — mesmo sendo bom no que faz.
          </p>
          <p
            className="mt-8 text-lg font-medium italic text-white sm:text-xl"
            style={{ textShadow: `0 0 24px ${GOLD}40` }}
          >
            Quem entende de gente, entende de negócio. E antes de entender os outros,
            você precisa entender a si mesmo.
          </p>
        </div>
      </section>

      {/* O que a Prosperus NÃO é */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="Delimitação" title="O que a Prosperus não é" />
        <BulletList items={NOT_IS} tone="negative" />
      </section>

      {/* O que muda */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle
            eyebrow="Transformação"
            title="O que muda quando você entende seu temperamento"
          />
          <BulletList items={CHANGES} />
          <p className="mt-8 text-base leading-relaxed text-white/75 sm:text-lg">
            Quando você enxerga o padrão, você deixa de tratar apenas o sintoma.{" "}
            <span className="text-white">
              E começa a trabalhar a raiz do comportamento.
            </span>
          </p>
        </div>
      </section>

      {/* Prosperar não é correr mais — poético */}
      <section
        className="relative overflow-hidden px-5 py-20 sm:px-6 sm:py-28"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,199,0,0.06), transparent 60%)",
        }}
      >
        <LightStreaks />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 text-[11px] uppercase tracking-[0.32em] text-white/50">
            Manifesto
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Prosperar não é correr mais.
          </h2>
          <div className="mt-10 space-y-6 text-lg leading-relaxed text-white/80 sm:text-xl">
            <p>É parar de agir no impulso.</p>
            <p>É deixar de reagir no automático.</p>
            <p>É construir constância onde antes havia oscilação.</p>
            <p>É amadurecer sem perder sua essência.</p>
          </div>
        </div>
      </section>

      {/* Para quem NÃO é */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="Delimitação" title="Para quem a Prosperus não é" />
        <BulletList items={NOT_FOR} tone="negative" />
      </section>

      {/* O que você recebe */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle eyebrow="Acesso" title="O que você recebe ao entrar" />
          <div className="grid gap-4">
            {RECEIVE.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `${GOLD}18`,
                    boxShadow: `0 0 18px ${GOLD}60`,
                  }}
                >
                  {i === 0 ? (
                    <BookOpen className="h-4 w-4" style={{ color: GOLD }} />
                  ) : i === 1 ? (
                    <MessageSquare className="h-4 w-4" style={{ color: GOLD }} />
                  ) : (
                    <Users className="h-4 w-4" style={{ color: GOLD }} />
                  )}
                </div>
                <span className="text-sm leading-relaxed text-white/85 sm:text-base">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist final */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="Diagnóstico" title="A Prosperus é para você se:" />
        <div className="grid gap-3 sm:grid-cols-2">
          {FINAL_CHECK.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FFC700]" />
              <span className="text-sm text-white/85 sm:text-base">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Expert — Ana Veloso */}
      <section className="border-y border-white/5 bg-white/[0.015] px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[auto_1fr] md:gap-14">
          <div className="relative mx-auto md:mx-0">
            <div
              className="absolute -inset-3 rounded-full opacity-70 blur-2xl"
              style={{
                background: `conic-gradient(from 180deg, ${RED}, ${GOLD}, ${BLUE}, ${GREEN}, ${RED})`,
              }}
            />
            <div
              className="relative h-56 w-56 overflow-hidden rounded-full ring-2 ring-white/20 sm:h-64 sm:w-64 md:h-72 md:w-72"
              style={{ boxShadow: `0 0 60px rgba(255,199,0,0.25)` }}
            >
              <img
                src={anaVelosoAsset.url}
                alt="Ana Veloso — mentora da Prosperus"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">
              Quem conduz
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Ana Veloso
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-white/60">
              <span style={{ color: RED }}>Ação</span>
              <span className="opacity-30">·</span>
              <span style={{ color: GOLD }}>Comunicação</span>
              <span className="opacity-30">·</span>
              <span style={{ color: BLUE }}>Análise</span>
              <span className="opacity-30">·</span>
              <span style={{ color: GREEN }}>Estabilidade</span>
            </div>
            <p className="mt-6 text-base leading-relaxed text-white/80 sm:text-lg">
              Ana Veloso é jornalista, estrategista comportamental e especialista em
              temperamentos aplicados ao ambiente profissional. Com mais de{" "}
              <span className="text-white">16 anos de experiência</span> em
              comunicação, liderança de equipes e desenvolvimento humano, une sua
              vivência prática no mercado com estudos em temperamentos, carreira e
              neurociência.
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
              Seu trabalho ajuda profissionais a entenderem seu próprio funcionamento,
              ajustarem comportamentos e construírem uma trajetória mais consciente,
              madura e sustentável.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        id="entrar"
        className="relative overflow-hidden px-5 py-20 sm:px-6 sm:py-28"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,199,0,0.14), transparent 60%), radial-gradient(ellipse 50% 40% at 15% 20%, rgba(0,163,254,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 20%, rgba(255,61,26,0.10), transparent 60%)",
        }}
      >
        <LightStreaks />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-10 flex h-48 w-full max-w-xs items-center justify-center sm:h-64">
            <img
              src={prosperusLogoAsset.url}
              alt="Logo Prosperus"
              className="h-full w-full object-contain drop-shadow-[0_0_40px_rgba(255,199,0,0.25)]"
            />
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Entre para a <ProsperusWordmark className="text-3xl sm:text-4xl md:text-5xl" />
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            A Prosperus é um espaço para quem quer crescer com consciência. Não basta
            descobrir seu temperamento. É preciso entender como ele aparece na sua
            rotina, nas suas decisões, nos seus relacionamentos profissionais e nos
            seus resultados.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-white sm:text-xl">
            Temperamento entendido. Comportamento ajustado. Crescimento profissional
            sustentável.
          </p>
          <div className="mt-10 flex justify-center">
            <GoldButton size="lg" href={PROSPERUS_CHECKOUT_URL} external>
              Faça parte da Prosperus
            </GoldButton>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/50 sm:text-xs">
            <ShieldCheck className="h-3 w-3" /> Pagamento seguro · Acesso imediato
            após confirmação
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-xs text-white/40 sm:px-6">
        © Andromeda Play · Prosperus
      </footer>
    </main>
  );
}
