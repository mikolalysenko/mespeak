var mespeak = require("../mespeak.full.js")
mespeak.loadVoice(require("../voices/en/en-us.json"))
mespeak.speak("hello world")