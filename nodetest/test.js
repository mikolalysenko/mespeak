var mespeak = require("../mespeak.full.js")
mespeak.loadVoice(require("../voices/en/en-us.json"))
process.stdout.write(new Buffer(mespeak.speak("hello", {rawdata:"array"})))
