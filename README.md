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

It also works in node.js too (though audio playback is unsupported):

```javascript
var meSpeak = require("mespeak")
meSpeak.loadVoice(require("mespeak/voices/en/en-us.json"))
process.stdout.write(meSpeak.speak("hello world", {rawdata: "buffer"}))
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

The `options` argument takes the following parameters:

* amplitude: How loud the voice will be (default: 100)
* pitch:     The voice pitch (default: 50)
* speed:     The speed at which to talk (words per minute) (default: 175)
* voice:     Which voice to use (default: last voice loaded or defaultVoice, see below)
* wordgap:   Additional gap between words in 10 ms units (default: 0)
* volume:    volume relative to the global volume (number, 0..1, default: 1)
             Note: the relative volume has no effect on the export using option 'rawdata'.
* rawdata:    do not play, return data only.
  The type of the returned data is derived from the value (case-insensitive) of 'rawdata':
  - `buffer`: A node.js buffer containing a wav file
  - 'base64': returns a base64-encoded string.
  - 'mime':   returns a base64-encoded data-url (including the MIME-header).
              (synonyms: 'data-url', 'data-uri', 'dataurl', 'datauri')
  - 'array':  returns a plain Array object with uint 8 bit data.
  - default (any other value): returns the generated wav-file as an ArrayBuffer (8-bit unsigned).

**Note:** The value of 'rawdata' must evaluate to boolean 'true' in order to be recognized.


### `meSpeak.loadConfig(json | url[, callback])`
Loads a configuration for mespeak.  By default uses `mespeak/mespeak_config.json`  There are two forms.

* `json` Synchronously loads a configuration JSON object.  This can be done using `require("filename.json")`

The other option is to load the config asynchronously via http:

* `url` is the url of the config file
* `callback` is called once the config is loaded


### `meSpeak.isConfigLoaded()`
Checks if mespeak is configured


### `meSpeak.loadVoice(json | url[, callback] )`
Loads a voice for mespeak.  You can either specify a url and a callback, or a JSON object.  A list of voices are included in the `voices/` directory.  For example, to load an english voice you can do:

```javascript
meSpeak.loadVoice(require("mespeak/voices/en/en-us.json"))`
```

The other form is the same as in `meSpeak.loadConfig` and takes two arguments:

* `url` which is the url of the voice to load
* `callback` which is an optional callback-handler. The callback will receive two arguments:
    - a boolean flag for success
    - either the id of the voice, or a reason for errors ('network error', 'data error', 'file error')

### `meSpeak.setDefaultVoice(str)`
Sets the default voice to use.  The default voice is always the the last voice loaded.

### `meSpeak.isVoiceLoaded()`
Checks if a voice is loaded

### `meSpeak.getDefaultVoice()`
Returns the default voice.

### `meSpeak.setVolume(volume)`
Sets the volume of playback globally.

* `volume` is the volume represented as a float

This update happens immediately and is applied relatively

### `meSpeak.getVolume()`
Returns playback volume.

### `meSpeak.play(stream[, relativeVolume])`
Plays a sound.  You can use this to cache previously generated voices and play them back at run time by setting the

* `stream` is a sound to play
* `relativeVolume` is the relative loudness of the sound

### `meSpeak.resetQueue()`
Clears playback queue, stops all currently playing sounds.

### `meSpeak.canPlay()`
Checks if mespeak can play a sound.

# Credits
(c) 2011-2013 Norbert Landsteiner.  GPL License

NPM entry currently maintained by Mikola Lysenko
