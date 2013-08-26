mespeak
=======
A CommonJS wrapper over Norbert Landsteiner [mespeak](http://www.masswerk.at/mespeak/) text-to-speech library.  Works in browserify.  More

# Example
Here is a simple example showing how to use mespeak:

```javascript
var meSpeak = require("mespeak")

//Select english/american voice
meSpeak.loadVoice(require("mespeak/voices/en/en-us.json"))

//Play a sound
meSpeak.speak("hello world")
```

# Install

    npm install mespeak


# API
The API is identical to that on Landsteiner's web page

```javascript
var meSpeak = require("mespeak")
```

### `meSpeak.speak(str[, options])`
Says a string.

* `str` is a string to say
* `options` is a list of options to pass to the speech synthesizer.  For more info, see [here](http://www.masswerk.at/mespeak/).

### `meSpeak.loadConfig([url | json])`
Loads a configuration for mespeak.  By default uses `mespeak/mespeak_config.json`

### `meSpeak.loadVoice(json | url[, callback] )`
Loads a voice for mespeak.  You can either specify a url and a callback, or a JSON object.  A list of voices are included in the `voices/` directory.  For example, to load an english voice you can do:

```javascript
meSpeak.loadVoice(require("mespeak/voices/en/en-us.json"))`
```

### `meSpeak.setDefaultVoice(str)`
Sets the default voice to use.

### `meSpeak.getDefaultVoice()`
Returns the default voice.  Note that this is set to the first loaded voice initially.

### `meSpeak.setVolume()`
Sets the volume of playback

### `meSpeak.getVolume()`
Returns playback volume

### `meSpeak.play()`
Plays a sound

### `meSpeak.isConfigLoaded()`
Checks if mespeak is configured

### `meSpeak.isVoiceLoaded()`
Checks if a voice is loaded

### `meSpeak.resetQueue()`
Clears playback queue

### `meSpeak.canPlay()`
Checks if mespeak can play a sound

# Credits
(c) 2011-2013 Norbert Landsteiner.  GPL License

NPM entry currently maintained by Mikola Lysenko
