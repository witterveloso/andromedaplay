import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, PlayCircle, Layers, Users, BarChart3, Lock,
  Video, Sparkles, Rocket, ShieldCheck, Globe, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Andromeda Play — Plataforma premium de cursos online" },
      { name: "description", content: "Hospede, organize e entregue cursos online com experiência moderna, visual tecnológico e área de membros profissional." },
      { property: "og:title", content: "Andromeda Play" },
      { property: "og:description", content: "Sua plataforma premium para cursos, treinamentos e formações online." },
    ],
  }),
  component: HomePage,
});

function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 75% 65%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #BFC6D6, transparent), radial-gradient(1px 1px at 85% 15%, #00B8FF, transparent), radial-gradient(1px 1px at 10% 70%, #6C4DFF, transparent), radial-gradient(1.5px 1.5px at 60% 40%, #fff, transparent)",
          backgroundSize: "600px 600px",
        }}
      />
    </div>
  );
}

function HomePage() {
  const { session, isAdmin, isExpert, isStudent } = useAuth();
  const inAppDest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : "/login";

  const features = [
    { icon: Video, title: "Hospedagem de cursos", desc: "Upload e streaming fluido de aulas em vídeo com qualidade premium." },
    { icon: Users, title: "Área de membros", desc: "Portal exclusivo para seus alunos acompanharem a jornada." },
    { icon: Layers, title: "Módulos e aulas", desc: "Organize conteúdo em estruturas claras e progressivas." },
    { icon: BarChart3, title: "Dashboard administrativo", desc: "Métricas, gestão de alunos e visão completa do produto." },
    { icon: Lock, title: "Controle de acesso", desc: "Defina quem entra, quando entra e a quê tem direito." },
    { icon: PlayCircle, title: "Streaming de aulas", desc: "Player moderno, responsivo e otimizado para qualquer dispositivo." },
    { icon: Sparkles, title: "Visual premium", desc: "Identidade tecnológica e futurista que valoriza sua marca." },
    { icon: Rocket, title: "Escalável", desc: "Cresça em cursos, alunos e produtos sem dores de cabeça." },
  ];

  const benefits = [
    { icon: ShieldCheck, title: "Experiência profissional", desc: "Seus alunos sentem que estão em uma plataforma de outro nível." },
    { icon: Layers, title: "Gestão organizada", desc: "Conteúdo estruturado, fácil de navegar e atualizar." },
    { icon: Globe, title: "Acesso centralizado", desc: "Tudo em um só lugar — sem fragmentar a jornada do aluno." },
    { icon: Zap, title: "Identidade forte", desc: "Marca premium que comunica autoridade desde o primeiro clique." },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cosmic-navy)", color: "var(--color-soft-white)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md" style={{ background: "rgba(10,15,29,0.7)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <AndromedaLogo />
          <nav className="hidden items-center gap-8 text-sm text-stellar-silver md:flex">
            <a href="#inicio" className="transition hover:text-soft-white">Início</a>
            <a href="#recursos" className="transition hover:text-soft-white">Recursos</a>
            <a href="#beneficios" className="transition hover:text-soft-white">Benefícios</a>
            <a href="#sobre" className="transition hover:text-soft-white">Sobre a plataforma</a>
          </nav>
          <Link
            to={session ? inAppDest : "/login"}
            className="rounded-md px-5 py-2 text-sm font-semibold text-soft-white transition hover:opacity-90"
            style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
          >
            {session ? "Acessar plataforma" : "Login"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden">
        <StarField />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-stellar-silver">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00B8FF" }} />
              Seu universo de cursos, vídeos e formações
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-cosmic)" }}>
                ANDROMEDA
              </span>
              <span className="block text-soft-white">PLAY</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stellar-silver md:text-xl">
              Sua plataforma premium para hospedar, organizar e entregar cursos online com experiência moderna,
              visual tecnológico e área de membros profissional.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={session ? inAppDest : "/login"}
                className="inline-flex items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold text-soft-white transition hover:scale-[1.02]"
                style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
              >
                Acessar plataforma <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-soft-white transition hover:bg-white/10"
              >
                Conheça os recursos
              </a>
            </div>
          </div>

          {/* Mockup-ish preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div
              className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "var(--gradient-cosmic)", opacity: 0.25 }}
            />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0F] shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <div className="ml-4 text-xs text-stellar-silver/70">andromeda.play / dashboard</div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-0">
                <div className="border-r border-white/5 p-4 space-y-1.5 text-xs text-stellar-silver">
                  {["Início", "Meus cursos", "Biblioteca", "Comunidade", "Certificados"].map((i) => (
                    <div key={i} className="rounded px-2 py-1.5 hover:bg-white/5">{i}</div>
                  ))}
                </div>
                <div className="p-6">
                  <div className="font-display text-sm tracking-widest text-stellar-silver">CONTINUE ASSISTINDO</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                        <div className="aspect-video relative" style={{ background: "var(--gradient-cosmic)", opacity: 0.85 }}>
                          <PlayCircle className="absolute inset-0 m-auto h-10 w-10 text-soft-white/90" />
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-semibold">Aula {i} · Composição</div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                            <div className="h-1.5 rounded-full" style={{ width: `${30 * i}%`, background: "var(--gradient-cosmic)" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="font-display text-xs tracking-[0.4em] text-electric-blue">SOBRE A PLATAFORMA</div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">
            Uma nova órbita para o conhecimento
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stellar-silver">
            O Andromeda Play é uma plataforma moderna para hospedagem e entrega de cursos, treinamentos,
            aulas em vídeo e experiências de aprendizagem online. Ideal para criadores, especialistas,
            empresas e projetos educacionais que desejam uma experiência premium para seus alunos.
          </p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-display text-xs tracking-[0.4em] text-electric-blue">RECURSOS</div>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">Tudo que sua entrega precisa</h2>
            <p className="mt-4 text-stellar-silver">Construído para escalar formações, comunidades e produtos digitais.</p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20"
              >
                <div
                  className="absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100"
                  style={{ background: "radial-gradient(400px circle at center, rgba(108,77,255,0.18), transparent 60%)" }}
                />
                <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: "var(--gradient-cosmic)" }}>
                  <f.icon className="h-5 w-5 text-soft-white" />
                </div>
                <div className="mt-5 font-display text-base font-semibold">{f.title}</div>
                <div className="mt-2 text-sm text-stellar-silver">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="font-display text-xs tracking-[0.4em] text-electric-blue">BENEFÍCIOS</div>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">
                Construa autoridade.<br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-cosmic)" }}>
                  Entregue um universo.
                </span>
              </h2>
              <p className="mt-6 text-stellar-silver">
                Mais que hospedar vídeos, o Andromeda Play eleva a percepção do seu produto e da sua marca.
                Cada detalhe foi pensado para que a experiência do aluno seja memorável.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10" style={{ background: "rgba(0,184,255,0.1)" }}>
                    <b.icon className="h-5 w-5 text-electric-blue" />
                  </div>
                  <div className="mt-4 font-display text-sm font-semibold">{b.title}</div>
                  <div className="mt-1.5 text-sm text-stellar-silver">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/5 py-24">
        <StarField />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">
            Pronto para transformar sua entrega de cursos em uma{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-cosmic)" }}>
              experiência premium?
            </span>
          </h2>
          <div className="mt-10">
            <Link
              to={session ? inAppDest : "/login"}
              className="inline-flex items-center gap-2 rounded-md px-8 py-4 text-base font-semibold text-soft-white transition hover:scale-[1.02]"
              style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
            >
              Acessar o Andromeda Play <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-4">
            <AndromedaLogo />
          </div>
          <p className="max-w-md text-center text-xs text-stellar-silver md:text-left">
            Tecnologia. Conhecimento. Evolução. — © {new Date().getFullYear()} Andromeda Play
          </p>
          <Link to="/login" className="text-sm text-stellar-silver transition hover:text-soft-white">
            Acessar login →
          </Link>
        </div>
      </footer>
    </div>
  );
}
