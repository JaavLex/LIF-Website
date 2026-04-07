import * as migration_20260329_084817 from './20260329_084817';
import * as migration_20260331_185031_add_rp_rules_password from './20260331_185031_add_rp_rules_password';
import * as migration_20260406_180000_add_callsign from './20260406_180000_add_callsign';
import * as migration_20260407_120000_add_comms from './20260407_120000_add_comms';
import * as migration_20260407_130000_comms_locked_documents_rels from './20260407_130000_comms_locked_documents_rels';
import * as migration_20260407_140000_comms_replies_anon_mentions from './20260407_140000_comms_replies_anon_mentions';
import * as migration_20260407_150000_backfill_callsigns from './20260407_150000_backfill_callsigns';
import * as migration_20260407_160000_add_main_faction from './20260407_160000_add_main_faction';
import * as migration_20260407_170000_add_unit_selector_fields from './20260407_170000_add_unit_selector_fields';

export const migrations = [
  {
    up: migration_20260329_084817.up,
    down: migration_20260329_084817.down,
    name: '20260329_084817',
  },
  {
    up: migration_20260331_185031_add_rp_rules_password.up,
    down: migration_20260331_185031_add_rp_rules_password.down,
    name: '20260331_185031_add_rp_rules_password'
  },
  {
    up: migration_20260406_180000_add_callsign.up,
    down: migration_20260406_180000_add_callsign.down,
    name: '20260406_180000_add_callsign',
  },
  {
    up: migration_20260407_120000_add_comms.up,
    down: migration_20260407_120000_add_comms.down,
    name: '20260407_120000_add_comms',
  },
  {
    up: migration_20260407_130000_comms_locked_documents_rels.up,
    down: migration_20260407_130000_comms_locked_documents_rels.down,
    name: '20260407_130000_comms_locked_documents_rels',
  },
  {
    up: migration_20260407_140000_comms_replies_anon_mentions.up,
    down: migration_20260407_140000_comms_replies_anon_mentions.down,
    name: '20260407_140000_comms_replies_anon_mentions',
  },
  {
    up: migration_20260407_150000_backfill_callsigns.up,
    down: migration_20260407_150000_backfill_callsigns.down,
    name: '20260407_150000_backfill_callsigns',
  },
  {
    up: migration_20260407_160000_add_main_faction.up,
    down: migration_20260407_160000_add_main_faction.down,
    name: '20260407_160000_add_main_faction',
  },
  {
    up: migration_20260407_170000_add_unit_selector_fields.up,
    down: migration_20260407_170000_add_unit_selector_fields.down,
    name: '20260407_170000_add_unit_selector_fields',
  },
];
