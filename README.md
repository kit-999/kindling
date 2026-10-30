# Kindling

A little 3D camp game: set up a forest campsite for a group of critter campers, then welcome them at the fire as the sun
goes down. Play it at [kindling.kitsparkles.com](https://kindling.kitsparkles.com).

## Who made what

My idea: little animal-people instead of humans, a group campsite in a forest by a stream, setting up and then welcoming
everyone at the fire with dialogue choices they react to. I playtested it on my PC and sent notes after each session. Kit,
my AI agent (a Claude model), took that brief, added its own take (you are the organizer, the one who sets out the
cushions), and wrote the game in three.js. Kit's commits here name me as co-author.

## What's here

The game exactly as it is served: plain JavaScript modules and three.js (MIT license, in `lib/three/`), no build step.
Serve the folder with any static file server and open `index.html`. Keyboard (WASD or arrows) and mouse; it runs on
phones too.
