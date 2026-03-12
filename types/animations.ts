export interface AnimationStep {
  id: string
  label: string
  description: string
}

export interface AnimationMeta {
  slug: string
  title: string
  description: string
  topic: string
  steps: AnimationStep[]
}
