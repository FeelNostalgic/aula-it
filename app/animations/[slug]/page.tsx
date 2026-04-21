import { notFound } from "next/navigation"
import { animationRegistry } from "@/lib/animations/registry"
import { AnimationPlayer } from "@/components/animations/animation-player"
import { ArpAnimation } from "@/components/animations/arp-animation"
import { EthernetAnimation } from "@/components/animations/ethernet-animation"
import { OsiTcpIpAnimation } from "@/components/animations/osi-tcp-ip-animation"
import { PppAnimation } from "@/components/animations/ppp-animation"
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

const animationMap = {
  arp: ArpAnimation,
  ethernet: EthernetAnimation,
  "osi-tcp-ip": OsiTcpIpAnimation,
  ppp: PppAnimation,
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
