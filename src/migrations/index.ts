import * as migration_20260329_084817 from './20260329_084817';
import * as migration_20260331_185031_add_rp_rules_password from './20260331_185031_add_rp_rules_password';
import * as migration_20260406_180000_add_callsign from './20260406_180000_add_callsign';
import * as migration_20260407_120000_add_comms from './20260407_120000_add_comms';

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
];
