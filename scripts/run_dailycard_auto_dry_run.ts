import { runDailycardAutoMapping } from '@/lib/providers/autoMapping/dailycardAutoMapper'

async function main() {
  const result = await runDailycardAutoMapping({
    mode: 'dry_run',
    targets: ['uc-pubg', 'free-fire-jewel', 'tiktok'],
  })

  const compact = result.report.map((row) => ({
    productName: row.productName,
    slug: row.slug,
    packageLabel: row.packageLabel,
    suggestedProviderProductId: row.suggestedProviderProductId,
    suggestedDailyCardName: row.suggestedDailyCardName,
    confidence: row.confidence,
    confidenceScore: row.confidenceScore,
    action: row.action,
    reason: row.reason,
  }))

  console.log(
    JSON.stringify(
      {
        summary: {
          mode: result.mode,
          targets: result.targets,
          providerRowsCount: result.providerRowsCount,
          scannedVariants: result.scannedVariants,
          mappedCount: result.mappedCount,
          reviewCount: result.reviewCount,
          unresolvedCount: result.unresolvedCount,
          appliedCount: result.appliedCount,
        },
        report: compact,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
