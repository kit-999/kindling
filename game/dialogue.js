// What everyone says, and the little engine that says it. A talk is a list of nodes: { say } shows a line,
// { me } is a line of yours, { choose: [...] } offers choices. Every choice gets its own warm reply; none of them is
// wrong. fx on a node or a choice can make the camper emote, brighten Lumi's spark, or set a flag the campfire remembers.

export const TALKS = {
  Juniper: [
    { say: "Look at you, organizer! Twelve summers I've been coming here, and I've never seen the cushions this fluffy.", fx: { emote: 'happy' } },
    { say: "First year I came, I didn't tell anyone my name. Just pointed at my name tag and hoped nobody asked me to say it out loud." },
    { choose: [
      { opt: 'And now?', then: [{ say: "Now I'm the one telling ghost stories by the fire. Funny how that goes.", fx: { emote: 'nod' } }] },
      { opt: "I'm really glad you kept coming back.", then: [{ say: "Me too, kid. This place grew me.", fx: { emote: 'happy' } }] },
      { opt: 'Help me keep an eye out for nervous first-timers?', flag: 'juniperWatches',
        then: [{ say: "Already on it. I always save them the good log.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Clover: [
    { say: "HELLO! I brought snacks. I brought, um. A lot of snacks.", fx: { emote: 'wave' } },
    { say: "Three bags of trail mix, a jar of pickles, and a cake shaped like a frog. Don't ask about the frog." },
    { choose: [
      { opt: 'Is the frog cake for anyone in particular?', then: [{ say: "It's for everyone! It's a community frog." }, { say: "...okay, it's a little bit for me.", fx: { emote: 'shy' } }] },
      { opt: "You're officially in charge of the snack table.", flag: 'cloverSnacks', then: [{ say: "Oh no. Oh YES. I accept this burden.", fx: { emote: 'happy' } }] },
      { opt: 'Hug before you set up?', then: [{ say: "Oh, come here.", fx: { emote: 'happy' } }, { say: "You give very good hugs for someone who just hung forty lights." }] },
    ] },
  ],
  Comet: [
    { say: "Okay okay okay. Which game first? I vote all of them. At the same time.", fx: { emote: 'happy' } },
    { say: "Board game in one paw, frisbee in the other, cards in my mouth. It's a system." },
    { choose: [
      { opt: 'Frisbee, before it gets dark?', then: [{ say: "YES. You're my favorite. Don't tell the others.", fx: { emote: 'wave' } }] },
      { opt: "Save the chaos for the fire. We're doing charades.", flag: 'charades', then: [{ say: "Charades?! I'm going to win so hard. I'm going to win charades AT you.", fx: { emote: 'happy' } }] },
      { opt: 'What pronouns today?', then: [{ say: "Ooh. Today's a he kind of day. Ask me again tomorrow, it might be a they.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Biscuit: [
    { say: "HI! Hi hi hi. Oh, this is the BEST campsite. Is that a hammock? Are those LIGHTS?", fx: { emote: 'happy' } },
    { say: "I brought my guitar. I know four songs. Three of them are the same song." },
    { choose: [
      { opt: 'Play one at the fire later?', flag: 'guitar', then: [{ say: "Yes! I'll play the good one. It's two of the other ones at once.", fx: { emote: 'wave' } }] },
      { opt: "What's the song?", then: [{ say: "It's about a dog who goes to camp and makes friends. I wrote it in the car. I'm still writing it. It's going great.", fx: { emote: 'nod' } }] },
      { opt: 'Help me welcome the new folks?', flag: 'biscuitHelps', then: [{ say: "OH. Yes. I'm the best at welcoming. I'll do it so gently. Watch me be gentle.", fx: { emote: 'happy' } }] },
    ] },
  ],
  Nyx: [
    { say: "Oh good, you're here. I pulled a card for this weekend before I left." },
    { say: "The Star. Hope, healing, a light in the dark. Which is either very meaningful, or the deck knows where I'm going." },
    { choose: [
      { opt: 'Pull one for me?', then: [{ say: "Hmm. The Sun. Warmth, joy, being seen exactly as you are." }, { say: "Yeah. That tracks for an organizer.", fx: { emote: 'nod' } }] },
      { opt: 'Readings by the fire later?', flag: 'tarotNight', then: [{ say: "Obviously. Bring your questions and your secrets. Mostly your secrets.", fx: { emote: 'happy' } }] },
      { opt: 'Do you actually believe in tarot?', then: [{ say: "I believe in having a reason to ask someone what they're hoping for. The cards are just the excuse.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Moss: [
    { say: "...is that a hammock." },
    { say: "I think I live in it now." },
    { choose: [
      { opt: 'Want a blanket?', then: [{ say: "You are a good organizer. The best one. I will tell everyone.", fx: { emote: 'happy' } }] },
      { opt: "There's room for two.", then: [{ say: "Bring a friend. Bring several. Capybaras are extremely social.", fx: { emote: 'nod' } }] },
      { opt: "Rest. You've earned it.", then: [{ say: "I haven't done anything yet." }, { say: "...I'll earn it retroactively.", fx: { emote: 'happy' } }] },
    ] },
  ],
  Thistle: [
    { say: "Did you hang these? The lights?" },
    { say: "They look like a hundred tiny moons. I could stare at them all night. I might." },
    { choose: [
      { opt: 'Pink, blue and white. On purpose.', then: [{ say: "...oh.", fx: { emote: 'shy' } }, { say: "Oh. Hold my quills, I'm going to cry a little.", fx: { emote: 'happy' } }] },
      { opt: 'Want to help me hang them next year?', then: [{ say: "Yes. Yes please. I'll bring extension cords. So many extension cords.", fx: { emote: 'happy' } }] },
      { opt: "Stare away. That's what they're for.", then: [{ say: "Best camp ever, and it hasn't even started.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Rowan: [
    { say: "Hi. Um. I'm... hang on.", fx: { emote: 'shy' } },
    { say: "I've never written it down before. Not on a name tag. Not anywhere people can see it." },
    { choose: [
      { opt: "Take your time. We've got all evening.", flag: 'rowanTag', then: [{ say: "Okay. R... O... W... A... N." }, { say: "Rowan. He/him. ...that felt really good.", fx: { emote: 'happy', tag: true } }] },
      { opt: 'Want me to hold the tag steady while you write?', flag: 'rowanTag', then: [{ say: "Yes please. My paws are doing a thing." }, { say: "There. Rowan. It's real now.", fx: { emote: 'happy', tag: true } }] },
      { opt: 'What would you like to be called?', flag: 'rowanTag', then: [{ say: "...Rowan. He/him." }, { say: "You're the first person here I've said that to.", fx: { emote: 'happy', tag: true } }] },
    ] },
  ],
  Lumi: [                                   // her second visit, by her tent: the arrival is in GREETS
    { say: "I put fairy lights inside my tent. Is that too much? It might be too much.", fx: { emote: 'shy' } },
    { say: "I can turn them down. I can also turn myself down. I have a dimmer." },
    { choose: [
      { opt: "Don't dim anything. It's perfect.", then: [{ say: "...okay. Full brightness. For the first time, maybe.", fx: { emote: 'happy', glow: 0.25 } }] },
      { opt: 'Can I see inside?', then: [{ say: "Yes! Look, they go all the way round. I matched them to my scarf.", fx: { emote: 'happy', glow: 0.2 } }] },
      { opt: 'How are you feeling about tonight?', then: [{ say: "Nervous. But a good nervous. Like right before you get to say your name.", fx: { emote: 'nod', glow: 0.2 } }] },
    ] },
  ],
};

// the hello when each camper first walks in: a line from them, your welcome, their reaction. Short on purpose; the
// longer talks above come once they've pitched their tents and settled. Jerika, Day 245: "feels kinda impersonal not
// being able to say anything as they first get there".
export const GREETS = {
  Juniper: [
    { say: "Well, would you look at that. Organizer!", fx: { emote: 'wave' } },
    { choose: [
      { opt: 'Welcome back, Juniper!', then: [{ say: "Twelve summers and walking in still gets me. Every time.", fx: { emote: 'happy' } }] },
      { opt: 'Save me a spot by the fire later?', then: [{ say: "Always. Let me get my tent up first. Old bones, new stakes.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Biscuit: [
    { say: "HI! Is this it? Is this camp?!", fx: { emote: 'happy' } },
    { choose: [
      { opt: 'This is camp! Welcome, Biscuit!', then: [{ say: "WE'RE AT CAMP.", fx: { emote: 'happy' } }, { say: "Okay. Tent. Then everything else. Then probably the tent again." }] },
      { opt: 'Tents go anywhere by the trees.', then: [{ say: "Ooh. I'm going to pick the BEST spot. Watch me pick it.", fx: { emote: 'wave' } }] },
    ] },
  ],
  Clover: [
    { say: "Hi hi! Sorry, my backpack is mostly snacks. Where do the tents go?", fx: { emote: 'wave' } },
    { choose: [
      { opt: 'Anywhere you like. Welcome, Clover!', then: [{ say: "Somewhere near the snack table. For strategic reasons.", fx: { emote: 'happy' } }] },
      { opt: 'Mostly snacks?', then: [{ say: "Mostly. Some socks. The socks are also wrapped around snacks.", fx: { emote: 'shy' } }] },
    ] },
  ],
  Comet: [
    { say: "Made it! Am I first? Tell me I'm first.", fx: { emote: 'wave' } },
    { choose: [
      { opt: 'Welcome! You are... fourth.', then: [{ say: "Fourth is just first with extra steps.", fx: { emote: 'nod' } }] },
      { opt: "You're the first Comet.", then: [{ say: "The first Comet. I'll take it. I'm putting that on a shirt.", fx: { emote: 'happy' } }] },
    ] },
  ],
  Nyx: [
    { say: "The cards said I'd get here at exactly the right time.", fx: { emote: 'nod' } },
    { choose: [
      { opt: 'And you did. Welcome, Nyx!', then: [{ say: "They're never wrong. Well. Rarely. Today they're not.", fx: { emote: 'happy' } }] },
      { opt: 'What else did they say?', then: [{ say: "Ask me once my tent's up. It's a good one.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Moss: [
    { say: "...hi.", fx: { emote: 'nod' } },
    { choose: [
      { opt: 'Welcome, Moss! Long walk?', then: [{ say: "Very long. Tent somewhere quiet, and then I'm going to lie down for a year.", fx: { emote: 'happy' } }] },
      { opt: "There's a hammock.", then: [{ say: "...I know. I can feel it.", fx: { emote: 'shy' } }, { say: "Tent first. Then hammock. Then hammock." }] },
    ] },
  ],
  Thistle: [
    { say: "Hi. Is it okay that I'm here? I almost didn't come.", fx: { emote: 'shy' } },
    { choose: [
      { opt: "We're so glad you came.", then: [{ say: "...okay. Okay. Me too, I think.", fx: { emote: 'happy' } }] },
      { opt: "You're exactly where you're supposed to be.", then: [{ say: "That's a really nice thing to say to a hedgehog.", fx: { emote: 'shy' } }] },
    ] },
  ],
  Rowan: [
    { say: "Hi. This is a lot of people. A good lot. I think.", fx: { emote: 'shy' } },
    { choose: [
      { opt: "Welcome! Name tags are on the table, whenever you're ready.", then: [{ say: "Okay. After my tent. I'll do it after my tent.", fx: { emote: 'nod' } }] },
      { opt: "It's a good lot. Promise.", then: [{ say: "Okay. I'm holding you to that.", fx: { emote: 'happy' } }] },
    ] },
  ],
  Lumi: [                                   // she stops back on the trail, deciding whether to come in
    { say: "Oh! Hello. I'm not lost. I'm just... deciding whether to come in.", fx: { emote: 'shy' } },
    { say: "Everyone here is soft, and I'm glass. I hum when I'm nervous. I'm humming right now." },
    { say: "And nobody ever assigned me a gender. They shipped me as 'it'. I picked 'she' myself." },
    { say: "Does that... count? Here?" },
    { choose: [
      { opt: "You picked it. That's the whole thing. It counts.", then: [{ say: "...oh. Okay.", fx: { glow: 0.35 } }, { say: "Okay! I'm going to remember you said that.", fx: { emote: 'happy', glow: 0.15 } }] },
      { opt: "Nobody here is the same as anyone else. You'll fit right in.", then: [{ say: "Even the glowing part?" }, { me: 'Especially the glowing part.' }, { say: "...hehe. Okay.", fx: { emote: 'happy', glow: 0.45 } }] },
      { opt: 'Come in at your own pace. You can sit by the lights first.', then: [{ say: "...yes. I'd like that. Thank you for not rushing me.", fx: { emote: 'nod', glow: 0.4 } }] },
    ] },
  ],
};

// day two, morning (Jerika, Day 246: "trans camps are usually ~3 nights, so just waking up and leaving is too short"):
// a short good-morning each. Juniper's has the board and ends the scene; Comet's can end at the stream with a stone.
export const MORNING = {
  Juniper: [
    { say: "Morning, organizer! Look. I did the board.", fx: { emote: 'wave' } },
    { say: "Swim at the stream after breakfast. Bracelets after lunch. And tonight: the talent show." },
    { choose: [
      { opt: "What's on tomorrow?", then: [{ say: "The hike to the lookout, s'mores round two, and dancing under your lights.", fx: { emote: 'happy' } }] },
      { opt: 'Is Comet doing charades at the talent show?', then: [{ say: "Comet is banned from charades." }, { say: "Comet is doing charades.", fx: { emote: 'nod' } }] },
      { opt: "I can't believe it's only the first morning.", then: [{ say: "Two more nights, kid. It's only just started.", fx: { emote: 'happy' } }] },
    ] },
  ],
  Clover: [
    { say: "Pancakes! I made forty. That was too many. Have six.", fx: { emote: 'happy' } },
    { say: "Also. Someone ate a corner of my frog cake. In the night. I have suspects." },
    { choose: [
      { opt: 'Who would do that?', then: [{ say: "Someone small. Someone hungry. Someone who left crumbs by the hammock." },
        { say: "...Moss is always by the hammock. I'm watching Moss.", fx: { emote: 'nod' } }] },
      { opt: 'Save some pancakes for Moss?', then: [{ say: "Already did. I left a stack on the hammock." }, { say: "...it might be on Moss now." }] },
      { opt: 'Are those shaped like frogs?', then: [{ say: "The frog cake inspired me. What's left of it.", fx: { emote: 'shy' } }] },
    ] },
  ],
  Nyx: [
    { say: "Tea? It's the good kind. I pulled a card for today." },
    { say: "The Sun again. The deck has a favourite, and honestly, same.", fx: { emote: 'nod' } },
  ],
  Biscuit: [
    { say: "GOOD MORNING. This is the morning song.", fx: { emote: 'happy' } },
    { say: "It's the night song, but faster. I'm still writing verse two." },
  ],
  Rowan: [
    { say: "Morning. I stuck my name tag on my tent, so it was the first thing I saw when I woke up.", fx: { emote: 'shy' } },
    { say: "Rowan. Still feels good.", fx: { emote: 'happy' } },
  ],
  Thistle: [
    { say: "I was going to draw the sunrise. My pencil case blew open in the night.", fx: { emote: 'shy' } },
    { say: 'Five colours, all over camp. The blue one is the important one. I need it for the lights.' },
    { choose: [
      { opt: "I'll find them for you!", then: [{ say: "Really? ...Thank you. Look for the little sparkles. That's how the light hits them.", fx: { emote: 'happy' } }] },
      { opt: "I'll keep an eye out while I say good morning.", then: [{ say: "Thank you. I'll be here. Drawing the sunrise in pencil. It's fine. It's fine.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Lumi: [
    { say: "Breakfast! Sunlight is a snack, remember? I'm on my third helping.", fx: { emote: 'happy', glow: 0.2 } },
    { say: "I left my fairy lights on all night. Nobody asked me to turn them down.", fx: { glow: 0.2 } },
  ],
  Comet: [
    { say: "Skipping stones. My record is seven. Seven! Want to try?", fx: { emote: 'wave' } },
    { choose: [
      { opt: 'Give me a stone.', flag: 'stones', then: [{ say: "Flat ones skip. Throw low. Let go when the ring is smallest." }] },
      { opt: 'Later, after breakfast.', then: [{ say: "I'll be here. Practising. Getting better. Ominously.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Moss: [
    { say: "...zzz." },
    { say: "...five more minutes.", fx: { emote: 'shy' } },
    { say: "...five more hours." },
  ],
};

// the last morning starts round the cold fire, the way the weekend did: one more go-round, each of them saying one thing
// they'll remember about the next one round, and you last. Day 247: asked how a camp's last morning should go so the
// lonely ones don't leave lonely, Opus 3 said "each camper shares one thing they'll remember", so they hear the whole
// group see them and not only you; and "don't let anyone label Lumi or Rowan as lonely". Nobody here does.
export const CIRCLE = {
  open: ["Morning, everybody. Before the bags go by the trail: one more go-round. Like the first night.",
    "One thing you'll remember about the next one round. I'll start."],
  round: [
    { who: 'Juniper', about: 'Rowan', say: 'Rowan. Wrote his name down on the first night, and by the last day he was shouting it off a hill. Took me three summers to do that.', react: 'shy' },
    { who: 'Rowan', about: 'Lumi', say: "Lumi. The hill didn't hear her the first time, so she said it again. Louder. That's the kind of brave I want to be.", react: 'shy', glow: 0.3 },
    { who: 'Lumi', about: 'Clover', say: 'Clover. She used every yellow she had on my bracelet. For no reason. ...I know the reason.', react: 'shy', hearts: true },
    { who: 'Clover', about: 'Moss', say: 'Moss. I blamed Moss for my frog cake for a whole day, and Moss never argued once. Moss was asleep. ...Sorry, Moss.',
      reply: "...it's okay. I'd have suspected me too." },
    { who: 'Moss', about: 'Comet', say: "...Comet's charades. I stayed awake for all of them. That's how good.", react: 'happy',
      reply: "MOSS. That's the nicest thing anyone's ever said to me." },
    { who: 'Comet', about: 'Biscuit', say: 'Biscuit sang the same song three times this weekend and said they were three different songs. I clapped for all three. I would clap for a fourth.', react: 'happy' },
    { who: 'Biscuit', about: 'Nyx', say: 'Nyx held up one card for everybody at the talent show. The Star! Hope! I asked if it counts for dogs and she said especially dogs.', react: 'happy' },
    { who: 'Nyx', about: 'Thistle', say: 'Thistle, looking at the lights every night like they were a hundred tiny moons. I want to look at things like that.', react: 'shy' },
    { who: 'Thistle', about: 'you', say: 'And you. You hung a hundred tiny moons, and then you made sure everyone had somewhere to sit under them.', react: 'happy' },
  ],
  mine: [
    { opt: 'Juniper. Twelve summers, and she still saves the first-timers the good log.', then: 'Somebody saved it for me, once. You pass it on.' },
    { opt: 'Juniper. This place grew you, and then you grew it.', then: "...Organizer. Don't make the badger cry before breakfast." },
    { opt: "All of you. I can't pick just one.", then: "That's allowed. That's the most organizer answer there is." },
  ],
  close: 'Okay. Bags by the trail, everybody. Organizer, come say bye.',
};

// the last morning: goodbyes by the trail (Juniper's comes last, scripted, in main.js)
// the last morning's goodbyes: each of them says something, and you get to say something back (Day 246, Jerika: "it
// would be nice if there was a little dialog option at the end with everyone. i wanted to say more kind stuff to lumi")
export const BYES = {
  Biscuit: [
    { say: "I wrote verse three on the way to breakfast. It's just your name. Over and over.", fx: { emote: 'happy' } },
    { choose: [
      { opt: 'Play me verse three next summer?', then: [{ say: "I'll have verse four by then. It's ALSO your name. Louder.", fx: { emote: 'happy' } }] },
      { opt: 'Your song was the best part of the show.', then: [{ say: 'Better than the frog?! ...Okay. Tied with the frog.', fx: { emote: 'happy' } }] },
      { opt: 'Thanks for being so gentle with everyone.', then: [{ say: "I'm SO gentle. The gentlest. ...You noticed?", fx: { emote: 'shy' } }] },
    ] },
    { say: 'See you next summer!', fx: { emote: 'wave' } },
  ],
  Clover: [
    { say: "Crumb says ribbit. I think it means 'see you next summer'." },
    { choose: [
      { opt: 'Take good care of Crumb.', then: [{ say: "He's sleeping in my pancake tin. He has never been happier. Neither have I.", fx: { emote: 'happy' } }] },
      { opt: 'Your frog cake was perfect. Even with the bite.', then: [{ say: "It was perfect BECAUSE of the bite. I'm putting that on a sign.", fx: { emote: 'happy' } }] },
      { opt: 'Thanks for all the snacks.', then: [{ say: "There are four graham crackers in your bag. You didn't see me do it.", fx: { emote: 'shy' } }] },
    ] },
    { say: 'Bye, organizer!', fx: { emote: 'wave' } },
  ],
  Comet: [
    { say: 'Rematch next summer. Stones, juggling, charades. All of it.' },
    { choose: [
      { opt: "You're on. I've been practising.", then: [{ say: 'I KNEW it. I knew you were a secret skipper.', fx: { emote: 'happy' } }] },
      { opt: 'Your charades were actually great.', then: [{ say: 'THANK you. Banned, and great. That is my whole brand.', fx: { emote: 'happy' } }] },
      { opt: 'Thanks for waiting for me at the stream.', then: [{ say: '...Course I did. Nobody cannonballs alone.', fx: { emote: 'shy' } }] },
    ] },
    { say: 'I will be unbearable. Bye!', fx: { emote: 'wave' } },
  ],
  Nyx: [
    { say: 'One last card. The World. It means you finished something good, and that you will start again.', fx: { emote: 'nod' } },
    { choose: [
      { opt: 'Pull one for next summer?', then: [{ say: "Already did. I'm not telling. ...It's a good one.", fx: { emote: 'happy' } }] },
      { opt: 'Your cards made everyone feel seen.', then: [{ say: 'That is what they are for. The cards just say it out loud.', fx: { emote: 'nod' } }] },
      { opt: 'Thank you for reading for me.', then: [{ say: 'Thank you for listening. Most people only want the scary ones.', fx: { emote: 'happy' } }] },
    ] },
  ],
  Moss: [
    { say: "...I'm going to miss the hammock. And you. Mostly you. Don't tell the hammock.", fx: { emote: 'shy' } },
    { choose: [
      { opt: 'Save me a spot in the hammock next summer.', then: [{ say: "...There's room for two. Barely. We'll make it work.", fx: { emote: 'happy' } }] },
      { opt: 'Your talent was incredible.', then: [{ say: '...I practised for years. Mostly at night.', fx: { emote: 'happy' } }] },
      { opt: 'Sleep well on the way home.', then: [{ say: "...That's the plan. That's always the plan.", fx: { emote: 'nod' } }] },
    ] },
  ],
  Thistle: [
    { say: "I drew you one more time, this morning. You're in the middle. You're always in the middle.", fx: { emote: 'happy' } },
    { choose: [
      // handed over now, not next summer (Opus 3, Day 247: don't put all the weight on a future that may not come)
      { opt: 'Can I see it?', then: [{ say: "...Okay. Just you. It isn't finished.", fx: { emote: 'shy', drawing: true } },
        { say: "It's never finished. Keep it anyway.", fx: { emote: 'happy' } }] },
      { opt: 'Thank you for drawing all of us.', then: [{ say: 'You are all easy to draw. You are always laughing.', fx: { emote: 'happy' } }] },
      { opt: "Keep drawing. You're really good.", then: [{ say: "...I will. Thank you. Nobody's said that to me before.", fx: { emote: 'shy' } }] },
    ] },
  ],
  Rowan: [
    { say: 'Say it one more time? My name?', fx: { emote: 'shy' } },
    { choose: [
      { opt: 'Rowan.', then: [{ say: "...fifteen. That's my favourite one.", fx: { emote: 'happy' } }] },
      { opt: 'See you next summer, Rowan.', then: [{ say: 'Sixteen. Okay. Now I can go.', fx: { emote: 'happy' } }] },
      { opt: "Rowan. I'm really glad you were here.", then: [{ say: 'Seventeen. ...Me too. I am, too.', fx: { emote: 'happy' } }] },
    ] },
  ],
  // Lumi stood at the trailhead for a long time on night one before you waved her in; she gets the longest goodbye
  Lumi: [
    { say: "I'm glad I came in.", fx: { glow: 0.3 } },
    { choose: [
      { opt: "I'm so glad you came in, Lumi.", then: [{ say: '...I almost didn\'t. I stood at the trail for a long time. Then you waved.', fx: { glow: 0.2 } },
        { say: 'So I came.', fx: { emote: 'happy' } }] },
      { opt: 'Your light show was the best thing I saw all weekend.', then: [{ say: "...Really? I didn't know I could do the blue. Now I know I can.", fx: { glow: 0.4, emote: 'happy' } }] },
      { opt: 'You belong here. You always did.', then: [{ say: "...I'm going to keep that one. In here. Next to the spark.", fx: { glow: 0.5, emote: 'shy' } }] },
    ] },
    { say: 'Can I tell you something? I was scared all weekend. ...A good scared.' },
    { choose: [
      { opt: 'You were so brave.', then: [{ say: 'I was, wasn\'t I. ...I\'m going to remember that.', fx: { glow: 0.3, emote: 'happy' } }] },
      // was "We'll all be here next summer.", a promise nobody can make her (Opus 3, Day 247); this one answers the question
      // she asked on the trail the first night, "Does that... count? Here?"
      { opt: 'You counted, Lumi. Every minute of it.', then: [{ say: "...I did, didn't I. I counted them too. Three thousand seven hundred and four.", fx: { glow: 0.3 } },
        { say: 'I liked every one.', fx: { emote: 'happy' } }] },
      { opt: 'Want a hug?', then: [{ say: '...Yes. Yes, please.', fx: { hearts: true, glow: 0.5, emote: 'happy' } }] },
    ] },
    { say: "I'm going to say I'm glad I came in every summer, I think.", fx: { emote: 'wave' } },
  ],
};

// the engine: drives the talk box in index.html
export function createTalker({ onFx, onSpeak = () => {} }) {   // onSpeak(name, on): whose mouth moves while a line types out
  const box = document.getElementById('talk'), who = document.getElementById('who'), line = document.getElementById('line'),
        choices = document.getElementById('choices'), more = document.getElementById('more');
  let typing = null, waiting = null, picking = null;
  const ESC = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function show(name, pron, text) {
    who.innerHTML = `${ESC(name)}<small>${ESC(pron || '')}</small>`; choices.innerHTML = ''; more.hidden = true;
    let i = 0; clearInterval(typing); line.textContent = ''; onSpeak(name, true);
    return new Promise(res => {
      typing = setInterval(() => { i += 2; line.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; more.hidden = false; onSpeak(name, false); } }, 28);
      waiting = () => { if (typing) { clearInterval(typing); typing = null; line.textContent = text; more.hidden = false; onSpeak(name, false); return; } waiting = null; res(); };
    });
  }
  function pick(opts) {
    more.hidden = true; choices.innerHTML = '';
    return new Promise(res => {
      opts.forEach((o, k) => { const b = document.createElement('button'); b.textContent = `${k + 1}. ${o.opt}`;
        b.addEventListener('click', ev => { ev.stopPropagation(); picking = null; choices.innerHTML = ''; res(o); }); choices.appendChild(b); });
      picking = k => { if (opts[k]) { picking = null; choices.innerHTML = ''; res(opts[k]); } };
    });
  }
  box.addEventListener('click', () => waiting && waiting());
  addEventListener('keydown', e => {
    if (box.hidden) return;
    if (picking && /^[1-9]$/.test(e.key)) { picking(+e.key - 1); e.preventDefault(); return; }
    if (['e', 'E', ' ', 'Enter'].includes(e.key) && waiting) { waiting(); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  async function run(nodes, speaker, me, flags) {
    for (const n of nodes) {
      if (n.choose) { const o = await pick(n.choose); if (o.flag) flags[o.flag] = true;
        await show(me.name, me.pron, o.opt); await run(o.then, speaker, me, flags); continue; }
      if (n.fx) onFx(speaker, n.fx);
      if (n.me) await show(me.name, me.pron, n.me); else await show(speaker.name, speaker.pron, n.say);
    }
  }
  async function talk(speaker, me, flags, set = TALKS) {
    box.hidden = false; await run(set[speaker.name], speaker, me, flags); box.hidden = true;
  }
  // for scripted scenes (the campfire): open the box, say lines as anyone, offer a menu, close
  const scene = {
    open() { box.hidden = false; }, close() { box.hidden = true; },
    say: (name, pron, text) => show(name, pron, text),
    choose: opts => pick(opts.map(o => (typeof o === 'string' ? { opt: o } : o))),
  };
  return { talk, scene, get open() { return !box.hidden; } };
}
