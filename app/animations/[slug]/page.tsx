import Link from "next/link"
import { notFound } from "next/navigation"
import { animationComponentMap } from "@/components/animations/animation-component-map"
import { animationRegistry } from "@/lib/animations/registry"
import { AnimationPlayer } from "@/components/animations/animation-player"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = animationRegistry.find((a) => a.slug === slug);
  return {
    title: meta ? `Animación: ${meta.title}` : "Animación",
  };
}

type Slug = keyof typeof animationComponentMap

export default async function AnimationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = animationRegistry.find((a) => a.slug === slug)

  if (!meta || !(slug in animationComponentMap)) notFound()

  const AnimationComponent = animationComponentMap[slug as Slug]

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="gap-2 border-border/50">
          <Link href="/animations">
            <ArrowLeft className="size-4" />
            Volver a animaciones
          </Link>
        </Button>
        <ThemeToggle />
      </div>
      <AnimationPlayer steps={meta.steps} title={meta.title}>
        <AnimationComponent />
      </AnimationPlayer>
    </div>
  )
}

export function generateStaticParams() {
  return animationRegistry.map((a) => ({ slug: a.slug }))
}
