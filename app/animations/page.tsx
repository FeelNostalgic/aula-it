import Link from "next/link"
import { animationRegistry } from "@/lib/animations/registry"
import { Network } from "lucide-react"

export default function AnimationsIndexPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Animaciones educativas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Visualiza conceptos de redes paso a paso antes de trabajar en el simulador.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {animationRegistry.map((anim) => (
          <Link
            key={anim.slug}
            href={`/animations/${anim.slug}`}
            className="group flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-5 hover:border-primary/50 hover:bg-card/80 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-primary uppercase tracking-wider">
                {anim.topic}
              </span>
              <Network className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {anim.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {anim.description}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {anim.steps.length} pasos
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
