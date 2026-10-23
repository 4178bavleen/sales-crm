import { prisma } from '../../src/config/database.js'
import { StageKind } from '../../src/generated/prisma/client.js'

export const pipelineStages: { name: string; position: number; kind: StageKind }[] = [
  { name: 'Qualified', position: 1, kind: StageKind.OPEN },
  { name: 'Meeting/Demo', position: 2, kind: StageKind.OPEN },
  { name: 'Proposal', position: 3, kind: StageKind.OPEN },
  { name: 'Negotiation', position: 4, kind: StageKind.OPEN },
  { name: 'Won', position: 5, kind: StageKind.WON },
  { name: 'Lost', position: 6, kind: StageKind.LOST },
]

export async function seedPipelineStages(): Promise<void> {
  for (const stage of pipelineStages) {
    await prisma.pipelineStage.upsert({
      where: { name: stage.name },
      update: {
        position: stage.position,
        kind: stage.kind,
        isActive: true,
      },
      create: {
        name: stage.name,
        position: stage.position,
        kind: stage.kind,
        isActive: true,
      },
    })
  }

  console.log('Pipeline stages seeded successfully')
}
