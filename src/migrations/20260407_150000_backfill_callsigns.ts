import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Backfill characters that are missing a callsign (legacy rows from before the
 * field became mandatory). Assigns a unique "WORD-NN" style military callsign.
 * Users can edit it afterwards.
 */
const WORDS = [
  'ECHO', 'BRAVO', 'ALPHA', 'DELTA', 'FOX', 'RAVEN', 'WOLF', 'GHOST',
  'VIPER', 'HAWK', 'EAGLE', 'COBRA', 'TIGER', 'BEAR', 'LYNX', 'FALCON',
  'PHANTOM', 'STORM', 'BLADE', 'STEEL', 'IRON', 'NOVA', 'ORION', 'TITAN',
  'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO',
  'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU',
]

function generate(): string {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)]
  const n = Math.floor(Math.random() * 90 + 10)
  return `${w}-${n}`
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const result: any = await db.execute(sql`
    SELECT id FROM "characters"
    WHERE "callsign" IS NULL OR "callsign" = '';
  `)
  const rows: Array<{ id: number }> = result.rows ?? result ?? []

  // Load all existing callsigns so we can avoid collisions in-memory
  const existingResult: any = await db.execute(sql`
    SELECT "callsign" FROM "characters" WHERE "callsign" IS NOT NULL AND "callsign" <> '';
  `)
  const existingRows: Array<{ callsign: string }> = existingResult.rows ?? existingResult ?? []
  const taken = new Set<string>(existingRows.map((r) => r.callsign))

  for (const row of rows) {
    let candidate = generate()
    let tries = 0
    while (taken.has(candidate) && tries < 20) {
      candidate = generate()
      tries++
    }
    if (taken.has(candidate)) {
      candidate = `${generate()}-${Date.now().toString().slice(-4)}`
    }
    taken.add(candidate)
    await db.execute(sql`
      UPDATE "characters" SET "callsign" = ${candidate} WHERE "id" = ${row.id};
    `)
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: we can't know which callsigns were auto-generated vs user-set.
}
