const CUSTOM_PLAYER_MODELS = [
  'arctic',
  'gign',
  'gsg9',
  'guerilla',
  'leet',
  'sas',
  'terror',
  'urban',
  'vip',
];

function buildModelOverrideManifest() {
  const manifest = {};
  for (const model of CUSTOM_PLAYER_MODELS) {
    const gameKey = `/rez/models/player/${model}/${model}.mdl`;
    manifest[gameKey] =
      `models/cstrike/models/player/${model}/${model}.mdl`;
  }
  return manifest;
}
