const SETTINGS_STORAGE_KEY = 'play-cs-extension-settings';

const DEFAULT_POINTER_SIZE = 6;
const DEFAULT_POINTER_THICKNESS = 1;
const DEFAULT_POINTER_COLOR = '#8b0000';
const DEFAULT_BRIGHTNESS = 100;
const DEFAULT_CONTRAST = 100;
const DEFAULT_SATURATION = 100;
const DEFAULT_SOUND_WHEN_NOT_PLAYING = 100;

// These serve as the baseline templates for first-time loads
const BINDING_TEMPLATES = [
  { id: 'b43b62b64', name: 'Counter Terrorist Standard', sequence: 'b43b62b64', defaultKeys: '9' },
  { id: 'b42b62b64', name: 'Terrorist Standard', sequence: 'b42b62b64', defaultKeys: '0' },
  { id: 'b14b62b64', name: 'Deagle template', sequence: 'b14b62b64', defaultKeys: '=' },
  { id: 'b32b62b64b65', name: 'Quick template', sequence: 'b32b62b64b65', defaultKeys: '-' },
  { id: 'b64\\\\4', name: 'Grenade only', sequence: 'b64\\\\4', defaultKeys: '>' },
  { id: 'b7b8', name: 'Protection only', sequence: 'b7b8', defaultKeys: ']' },
];

function getDefaultSettings() {
  const bindings = {};
  for (const template of BINDING_TEMPLATES) {
    bindings[template.id] = template.defaultKeys;
  }
  return {
    pointerSize: DEFAULT_POINTER_SIZE,
    pointerThickness: DEFAULT_POINTER_THICKNESS,
    pointerColor: DEFAULT_POINTER_COLOR,
    brightness: DEFAULT_BRIGHTNESS,
    contrast: DEFAULT_CONTRAST,
    saturation: DEFAULT_SATURATION,
    soundWhenNotPlaying: DEFAULT_SOUND_WHEN_NOT_PLAYING,
    doubleSpace: false,
    customModels: false,
    bindings,
    templates: [...BINDING_TEMPLATES] 
  };
}

function splitCharacters(str) {
  return [...(str || '')];
}

function mergeSettings(stored) {
  const defaults = getDefaultSettings();
  if (!stored) return defaults;

  // Migration & Fallback: Ensure templates is always an array
  let templates = stored.templates;
  if (!Array.isArray(templates)) {
    const legacyCustom = Array.isArray(stored.customTemplates) ? stored.customTemplates : [];
    templates = [...BINDING_TEMPLATES, ...legacyCustom];
  }

  const bindings = {};
  if (stored.bindings) {
    for (const template of templates) {
      if (typeof stored.bindings[template.id] === 'string') {
        bindings[template.id] = stored.bindings[template.id];
      } else {
        bindings[template.id] = ''; 
      }
    }
  }

  const pointerSize = typeof stored.pointerSize === 'number' && stored.pointerSize >= 1 && stored.pointerSize <= 50
      ? stored.pointerSize
      : defaults.pointerSize;

  const pointerThickness = typeof stored.pointerThickness === 'number' && stored.pointerThickness >= 1 && stored.pointerThickness <= 10
      ? stored.pointerThickness
      : defaults.pointerThickness;
      
  const pointerColor = typeof stored.pointerColor === 'string'
      ? stored.pointerColor
      : defaults.pointerColor;

  const brightness = typeof stored.brightness === 'number' 
      ? stored.brightness 
      : defaults.brightness;

  const contrast = typeof stored.contrast === 'number' 
      ? stored.contrast 
      : defaults.contrast;

  const saturation = typeof stored.saturation === 'number' 
      ? stored.saturation 
      : defaults.saturation;

  const soundWhenNotPlaying = typeof stored.soundWhenNotPlaying === 'number' &&
      stored.soundWhenNotPlaying >= 0 && stored.soundWhenNotPlaying <= 100
      ? stored.soundWhenNotPlaying
      : defaults.soundWhenNotPlaying;

  const doubleSpace = typeof stored.doubleSpace === 'boolean'
      ? stored.doubleSpace
      : defaults.doubleSpace;

  const customModels = typeof stored.customModels === 'boolean'
      ? stored.customModels
      : defaults.customModels;

  return { pointerSize, pointerThickness, pointerColor, brightness, contrast, saturation, soundWhenNotPlaying, doubleSpace, customModels, bindings, templates };
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_STORAGE_KEY, (result) => {
      resolve(mergeSettings(result[SETTINGS_STORAGE_KEY]));
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings }, resolve);
  });
}
