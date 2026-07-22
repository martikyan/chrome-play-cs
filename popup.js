const sizeInput = document.getElementById('popup-size');
const sizeVal = document.getElementById('size-val');
const thicknessInput = document.getElementById('popup-thickness');
const thicknessVal = document.getElementById('thickness-val');
const colorInput = document.getElementById('popup-color');
const doubleSpaceInput = document.getElementById('popup-double-space');
const fpsModelsInput = document.getElementById('popup-custom-models');
const bindingsContainer = document.getElementById('bindings-container');

const brightnessInput = document.getElementById('popup-brightness');
const brightnessVal = document.getElementById('brightness-val');
const contrastInput = document.getElementById('popup-contrast');
const contrastVal = document.getElementById('contrast-val');
const saturationInput = document.getElementById('popup-saturation');
const saturationVal = document.getElementById('saturation-val');
const soundWhenNotPlayingInput = document.getElementById('popup-sound-when-not-playing');
const soundWhenNotPlayingVal = document.getElementById('sound-when-not-playing-val');

const customNameInput = document.getElementById('custom-name');
const customSequenceInput = document.getElementById('custom-sequence');
const customTriggerInput = document.getElementById('custom-trigger');
const addBindingBtn = document.getElementById('add-binding-btn');

async function renderBindings() {
  bindingsContainer.innerHTML = '';
  const settings = await loadSettings();

  settings.templates.forEach(template => {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = template.name;

    // Row wrapper for input and delete button
    const row = document.createElement('div');
    row.className = 'binding-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = settings.bindings[template.id] || '';
    input.placeholder = 'No binding...';
    
    // Save key trigger updates on typing
    input.addEventListener('input', async (e) => {
      const currentSettings = await loadSettings();
      currentSettings.bindings[template.id] = e.target.value;
      await saveSettings(currentSettings);
    });

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = 'X';
    delBtn.title = 'Delete this binding';
    
    delBtn.addEventListener('click', async () => {
      const currentSettings = await loadSettings();
      // Remove from the templates array
      currentSettings.templates = currentSettings.templates.filter(t => t.id !== template.id);
      // Remove from bindings dictionary
      delete currentSettings.bindings[template.id];
      await saveSettings(currentSettings);
      await renderBindings();
    });

    row.appendChild(input);
    row.appendChild(delBtn);
    group.appendChild(label);
    group.appendChild(row);
    bindingsContainer.appendChild(group);
  });
}

async function initPopup() {
  const settings = await loadSettings();

  sizeInput.value = settings.pointerSize;
  sizeVal.textContent = settings.pointerSize;

  thicknessInput.value = settings.pointerThickness;
  thicknessVal.textContent = settings.pointerThickness;

  colorInput.value = settings.pointerColor;
  doubleSpaceInput.checked = settings.doubleSpace || false;
  fpsModelsInput.checked = settings.customModels || false;

  brightnessInput.value = settings.brightness;
  brightnessVal.textContent = settings.brightness;
  
  contrastInput.value = settings.contrast;
  contrastVal.textContent = settings.contrast;
  
  saturationInput.value = settings.saturation;
  saturationVal.textContent = settings.saturation;

  soundWhenNotPlayingInput.value = settings.soundWhenNotPlaying;
  soundWhenNotPlayingVal.textContent = settings.soundWhenNotPlaying;

  const updateSettings = async () => {
    const currentSettings = await loadSettings(); 
    
    currentSettings.pointerSize = parseInt(sizeInput.value, 10);
    currentSettings.pointerThickness = parseInt(thicknessInput.value, 10);
    currentSettings.pointerColor = colorInput.value;
    currentSettings.doubleSpace = doubleSpaceInput.checked;
    currentSettings.customModels = fpsModelsInput.checked;
    
    currentSettings.brightness = parseInt(brightnessInput.value, 10);
    currentSettings.contrast = parseInt(contrastInput.value, 10);
    currentSettings.saturation = parseInt(saturationInput.value, 10);
    currentSettings.soundWhenNotPlaying = parseInt(soundWhenNotPlayingInput.value, 10);

    sizeVal.textContent = currentSettings.pointerSize;
    thicknessVal.textContent = currentSettings.pointerThickness;
    brightnessVal.textContent = currentSettings.brightness;
    contrastVal.textContent = currentSettings.contrast;
    saturationVal.textContent = currentSettings.saturation;
    soundWhenNotPlayingVal.textContent = currentSettings.soundWhenNotPlaying;

    await saveSettings(currentSettings);
  };

  sizeInput.addEventListener('input', updateSettings);
  thicknessInput.addEventListener('input', updateSettings);
  colorInput.addEventListener('input', updateSettings);
  doubleSpaceInput.addEventListener('change', updateSettings);
  fpsModelsInput.addEventListener('change', updateSettings);
  
  brightnessInput.addEventListener('input', updateSettings);
  contrastInput.addEventListener('input', updateSettings);
  saturationInput.addEventListener('input', updateSettings);
  soundWhenNotPlayingInput.addEventListener('input', updateSettings);

  await renderBindings();

  addBindingBtn.addEventListener('click', async () => {
    const name = customNameInput.value.trim();
    const sequence = customSequenceInput.value.trim();
    const trigger = customTriggerInput.value.trim();

    if (!name || !sequence) {
      alert('Please fill out both Name and Sequence.');
      return;
    }

    const currentSettings = await loadSettings();
    const uniqueId = 'custom_' + Date.now();

    currentSettings.templates.push({
      id: uniqueId,
      name: name,
      sequence: sequence
    });

    currentSettings.bindings[uniqueId] = trigger;

    await saveSettings(currentSettings);

    customNameInput.value = '';
    customSequenceInput.value = '';
    customTriggerInput.value = '';

    await renderBindings();
  });
}

document.addEventListener('DOMContentLoaded', initPopup);
