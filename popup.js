const sizeInput = document.getElementById('popup-size');
const sizeVal = document.getElementById('size-val');
const thicknessInput = document.getElementById('popup-thickness');
const thicknessVal = document.getElementById('thickness-val');
const colorInput = document.getElementById('popup-color');
const bindingsContainer = document.getElementById('bindings-container');

async function initPopup() {
  const settings = await loadSettings();

  // Populate initial values
  sizeInput.value = settings.pointerSize;
  sizeVal.textContent = settings.pointerSize;

  thicknessInput.value = settings.pointerThickness;
  thicknessVal.textContent = settings.pointerThickness;

  colorInput.value = settings.pointerColor;

  // Function to save new crosshair values
  const updateSettings = async () => {
    // Reload settings first so we don't overwrite buy-binds that just changed
    const currentSettings = await loadSettings(); 
    
    currentSettings.pointerSize = parseInt(sizeInput.value, 10);
    currentSettings.pointerThickness = parseInt(thicknessInput.value, 10);
    currentSettings.pointerColor = colorInput.value;

    sizeVal.textContent = currentSettings.pointerSize;
    thicknessVal.textContent = currentSettings.pointerThickness;

    await saveSettings(currentSettings);
  };

  // Add event listeners for real-time updates on crosshair
  sizeInput.addEventListener('input', updateSettings);
  thicknessInput.addEventListener('input', updateSettings);
  colorInput.addEventListener('input', updateSettings);

  // Dynamically generate binding inputs
  BINDING_TEMPLATES.forEach(template => {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = template.name;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = settings.bindings[template.id] || '';
    input.placeholder = 'No binding...';
    
    // Save binding on input
    input.addEventListener('input', async (e) => {
      const currentSettings = await loadSettings();
      currentSettings.bindings[template.id] = e.target.value;
      await saveSettings(currentSettings);
    });

    group.appendChild(label);
    group.appendChild(input);
    bindingsContainer.appendChild(group);
  });
}

document.addEventListener('DOMContentLoaded', initPopup);