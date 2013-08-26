var mespeak = require("../mespeak.full.js")
mespeak.loadVoice(require("../voices/en/en-us.json"))
process.stdout.write(mespeak.speak("hello", {rawdata:"array"})))
