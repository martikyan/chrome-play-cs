(function () {
  const LOG = '[CS Macro][Game Sound]';
  const ENABLED_ATTRIBUTE = 'data-cs-macro-game-sound-enabled';
  const VOLUME_ATTRIBUTE = 'data-cs-macro-game-sound-volume';
  const VOLUME_EVENT = '__csMacroGameSoundVolumeChanged';

  if (window.__csMacroGameSoundInstalled) return;
  window.__csMacroGameSoundInstalled = true;

  let volumeMultiplier = 1;
  let controlEnabled = false;
  let internalConnection = false;
  const masterGains = new Map();
  const destinationConnections = [];
  const mediaElements = new Set();
  const mediaBaseVolumes = new WeakMap();
  const webAudioMedia = new WeakSet();

  const audioNodePrototype = window.AudioNode?.prototype;
  const nativeConnect = audioNodePrototype?.connect;
  const nativeDisconnect = audioNodePrototype?.disconnect;
  const baseAudioContextPrototype = window.BaseAudioContext?.prototype;
  const nativeCreateGain = baseAudioContextPrototype?.createGain;

  function readRequestedVolume() {
    const rawValue = document.documentElement?.getAttribute(VOLUME_ATTRIBUTE);
    const percent = Number(rawValue);
    return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) / 100 : 1;
  }

  function setAudioParamValue(audioParam, value, context) {
    try {
      audioParam.cancelScheduledValues(context.currentTime);
      audioParam.setValueAtTime(value, context.currentTime);
    } catch (_) {
      audioParam.value = value;
    }
  }

  function createMasterGain(context, destination) {
    let masterGain = masterGains.get(context);
    if (masterGain) return masterGain;

    masterGain = nativeCreateGain
      ? nativeCreateGain.call(context)
      : context.createGain();
    setAudioParamValue(masterGain.gain, volumeMultiplier, context);
    masterGains.set(context, masterGain);

    internalConnection = true;
    try {
      nativeConnect.call(masterGain, destination);
    } finally {
      internalConnection = false;
    }

    return masterGain;
  }

  function rewireDestinationConnection(connection) {
    if (connection.rewired || !controlEnabled || !nativeDisconnect) return;

    const masterGain = createMasterGain(
      connection.source.context,
      connection.destination
    );

    try {
      nativeDisconnect.call(
        connection.source,
        connection.destination,
        connection.outputIndex,
        connection.inputIndex
      );
    } catch (_) {
      try {
        nativeDisconnect.call(connection.source, connection.destination);
      } catch (error) {
        console.warn(`${LOG} Could not attach master volume to an audio output.`, error);
        return;
      }
    }

    nativeConnect.call(connection.source, masterGain, connection.outputIndex, 0);
    connection.rewired = true;
  }

  function rewireAvailableAudioOutputs() {
    for (const connection of destinationConnections) {
      rewireDestinationConnection(connection);
    }
  }

  const mediaVolumeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'volume'
  );

  function setNativeMediaVolume(element, value) {
    mediaVolumeDescriptor.set.call(element, Math.min(1, Math.max(0, value)));
  }

  function registerMediaElement(element) {
    if (mediaElements.has(element)) return;
    mediaElements.add(element);
    mediaBaseVolumes.set(element, mediaVolumeDescriptor.get.call(element));

    if (controlEnabled && !webAudioMedia.has(element)) {
      setNativeMediaVolume(
        element,
        mediaBaseVolumes.get(element) * volumeMultiplier
      );
    }
  }

  function applyVolume() {
    const nextControlEnabled =
      document.documentElement?.getAttribute(ENABLED_ATTRIBUTE) === 'true';
    const nextMultiplier = nextControlEnabled ? readRequestedVolume() : 1;

    controlEnabled = nextControlEnabled;
    volumeMultiplier = nextMultiplier;

    if (controlEnabled && volumeMultiplier !== 1) {
      rewireAvailableAudioOutputs();
    }

    for (const [context, masterGain] of masterGains) {
      setAudioParamValue(masterGain.gain, volumeMultiplier, context);
    }

    for (const element of mediaElements) {
      if (webAudioMedia.has(element)) continue;
      const baseVolume = mediaBaseVolumes.get(element) ?? 1;
      setNativeMediaVolume(element, baseVolume * volumeMultiplier);
    }

    console.log(
      `${LOG} ${controlEnabled ? 'Applied' : 'Disabled'} master volume ` +
      `${Math.round(volumeMultiplier * 100)}%.`
    );
  }

  if (mediaVolumeDescriptor?.get && mediaVolumeDescriptor?.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: mediaVolumeDescriptor.configurable,
      enumerable: mediaVolumeDescriptor.enumerable,
      get() {
        return mediaBaseVolumes.has(this)
          ? mediaBaseVolumes.get(this)
          : mediaVolumeDescriptor.get.call(this);
      },
      set(value) {
        const numericValue = Math.min(1, Math.max(0, Number(value)));
        mediaElements.add(this);
        mediaBaseVolumes.set(this, numericValue);
        setNativeMediaVolume(
          this,
          controlEnabled && !webAudioMedia.has(this)
            ? numericValue * volumeMultiplier
            : numericValue
        );
      },
    });

    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      registerMediaElement(this);
      return nativePlay.apply(this, arguments);
    };
  }

  if (nativeConnect && window.AudioDestinationNode) {
    audioNodePrototype.connect = function (destination) {
      const result = nativeConnect.apply(this, arguments);

      if (!internalConnection && destination instanceof AudioDestinationNode) {
        const connection = {
          source: this,
          destination,
          outputIndex: arguments.length > 1 ? arguments[1] : 0,
          inputIndex: arguments.length > 2 ? arguments[2] : 0,
          rewired: false,
        };
        destinationConnections.push(connection);

        if (controlEnabled && volumeMultiplier !== 1) {
          setTimeout(() => rewireDestinationConnection(connection), 1000);
        }
      }

      return result;
    };
  }

  const contextPrototypes = new Set([
    window.AudioContext?.prototype,
    window.webkitAudioContext?.prototype,
  ]);

  for (const prototype of contextPrototypes) {
    if (!prototype || typeof prototype.createMediaElementSource !== 'function') continue;
    const nativeCreateMediaElementSource = prototype.createMediaElementSource;

    prototype.createMediaElementSource = function (element) {
      registerMediaElement(element);
      webAudioMedia.add(element);
      setNativeMediaVolume(element, mediaBaseVolumes.get(element) ?? 1);
      return nativeCreateMediaElementSource.apply(this, arguments);
    };
  }

  document.addEventListener(VOLUME_EVENT, applyVolume);
  console.log(`${LOG} Waiting for the game audio system to become available.`);
})();
