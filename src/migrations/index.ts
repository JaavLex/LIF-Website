import * as migration_20260329_084817 from './20260329_084817';
import * as migration_20260331_185031_add_rp_rules_password from './20260331_185031_add_rp_rules_password';

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
];
