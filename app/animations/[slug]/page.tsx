import { notFound } from "next/navigation"
import { animationRegistry } from "@/lib/animations/registry"
import { AnimationPlayer } from "@/components/animations/animation-player"
import { ArpAnimation } from "@/components/animations/arp-animation"

const animationMap = {
  arp: ArpAnimation,
} as const

type Slug = keyof typeof animationMap

export default async function AnimationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = animationRegistry.find((a) => a.slug === slug)

  if (!meta || !(slug in animationMap)) notFound()

  const AnimationComponent = animationMap[slug as Slug]

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <AnimationPlayer steps={meta.steps} title={meta.title}>
        <AnimationComponent />
      </AnimationPlayer>
    </div>
  )
}

export function generateStaticParams() {
  return animationRegistry.map((a) => ({ slug: a.slug }))
}
