/* eslint-disable no-undef */
/*global require */
const Discord = require('discord.js');
const ping = require('minecraft-server-util');

require('dotenv').config();

const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

// Set update interval
const interval = process.env.INTERVAL;
let serverDown = false;
let onlinePlayers = [];

client.once('ready', () => {
    console.log('Beep boop! I am ready!');
    // Check every 15 seconds to see if anyone is online
    update();
    setInterval(() => {
        update();
    }, interval);
});

async function update() {
    const date = new Date(Date.now()).toUTCString();
    let serverData;

    // Ping minecraft server to get current online players
    //  or return if server is down
    try {
        serverData = await ping(process.env.MINECRAFT_SERVER, 25565);
    } catch(error) {
        if(!serverDown) {
            serverDown = true;
            // sendMessage('🧨💥 The server has crashed...');
            console.log(date, ':: Server is offline');
        }
        return;
    }

    // If the server was down before, but is now back online, send a message!
    if(serverDown) {
        serverDown = false;
        console.log(date, ':: Server is back online');
        // sendMessage('😁 the server is back online!');
    }

    // If no players are online, and no players were online on last check,
    //  then there is nothing to do
    if(serverData.onlinePlayers === 0 && onlinePlayers.length === 0) return;

    // Get an array of all players that are currently on the server
    let players = [];
    if (serverData.samplePlayers != null) {
        serverData.samplePlayers.forEach(player => {
            players.push(player.name);
        });
    }

    // If nobody has joined or left the server, do nothing
    if (arrayEquals(players, onlinePlayers)) return;

    const playersAdded = [];
    const playersRemoved = [];

    // If a player is online, but is not in the onlinePlayers, then
    //  that player has just joined
    players.forEach(player => {
        if(!onlinePlayers.includes(player)) {
            playersAdded.push(player)
        }
    });

    // Check to make sure that all players that were online last update,
    //  are still online. If not remove them from onlinePlayers
    onlinePlayers.forEach(player => {
        if(!players.includes(player)) {
            playersRemoved.push(player)
        }
    });

    addPlayers(playersAdded);
    removePlayers(playersRemoved);

    // Only log output if there was a change in player activity
    if(playersAdded.length > 0 || playersRemoved.length > 0) {
        console.log(date, ':: Online Players = ', onlinePlayers);
        const message = buildMessage(playersAdded, playersRemoved);
        if (message) {
            sendMessage(message);
        }
    }
}

// Handles adding a player to onlinePlayers array and sending player joined message
//  to discord server
function addPlayers(players) {
    if (players.length > 0) {
        onlinePlayers.push(...players);
    
        const date = new Date(Date.now());
        console.log(date.toUTCString(), `:: Players added: [${players}]`);
    }
}

// Handles removing a player from onlinePlayers array and sends a respective,
//  message to discord server
function removePlayers(players) {
    if (players.length > 0) {
        players.forEach((player) => {
            onlinePlayers.splice(onlinePlayers.indexOf(player), 1);
        })

        const date = new Date(Date.now());
        console.log(date.toUTCString(), `:: Players removed: [${players}]`);
    }
}

function buildMessage(playersAdded, playersRemoved) {
    const numPlayersAdded = playersAdded.length;
    const numPlayersRemoved = playersRemoved.length;
    const currentPlayerCount = onlinePlayers.length;

    const playerCountMessage = currentPlayerCount === 0
        ? "There is currently no one online."
        : currentPlayerCount === 1
        ? "There is currently 1 player online."
        : `There are currently ${currentPlayerCount} players online.`;

    if (numPlayersAdded && !numPlayersRemoved) {
        if (numPlayersAdded === 1) {
            return `🏳️‍🌈 ${playersAdded[0]} just joined the game! ${playerCountMessage}`
        } else if (numPlayersAdded == 2) {
            return `🏳️‍🌈 ${joinNames(playersAdded)} both just joined the game. Serendipitous! ${playerCountMessage}`
        } else {
            return `🏳️‍🌈 ${joinNames(playersAdded)} all just joined. Huzzah! ${playerCountMessage}`
        }
    } else if (numPlayersRemoved && !numPlayersAdded) {
        const emoji = isNight() ? "🥱" : "🙁"
        const playerRemovedMessage = isNight()
            ? currentPlayerCount > 0
            ? `Good night! ${playerCountMessage}`
            : `That's all folks, good night!`
            : playerCountMessage;
        if (numPlayersRemoved === 1) {
            return `${emoji} ${playersRemoved[0]} just left the game. ${playerRemovedMessage}`
        } else if (numPlayersRemoved == 2) {
            return `${emoji} ${joinNames(playersRemoved)}  both just left the game. ${playerRemovedMessage}`
        } else {
            return `${emoji} ${joinNames(playersRemoved)}  all just left the game. ${playerRemovedMessage}`
        }
    } else if (numPlayersAdded && numPlayersRemoved) {
        return `👁️👄👁️ ${joinNames(playersAdded)} just joined the game, but ${joinNames(playersRemoved)} just left — I smell drama! ${playerCountMessage}`;
    }
}

// Sends a message to channel specified in process.env.DISCORD_CHANNEL_NAME
async function sendMessage(message) {
    await client.channels.fetch(process.env.DISCORD_CHANNEL_NAME).then((channel) => {
        const date = new Date(Date.now());
        
        channel.send(message);
        console.log(date.toUTCString(), `:: Sent message: "${message}"`);
    });
}

function arrayEquals(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.forEach((el, index) => b[index] === el)
}

function isNight() {
    const date = new Date(Date.now());
    const hoursPDT = (date.getHours() + 24 - 7) % 24; 
    return hoursPDT < 5 || hoursPDT >= 22;
}

function joinNames(players) {
    if (players.length === 1) {
        return players[0]
    } else  {
        const copy = [...players];
        copy[copy.length - 1] = `and ${copy[copy.length - 1]}`
        return copy.join(players.length === 2 ? " " : ", ")
    }
}