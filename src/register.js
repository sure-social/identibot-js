

import sqlite3                      from 'better-sqlite3';
import Discord                      from 'discord.js';
import * as env                     from 'env';
import fs                           from 'fs';
import fetch                        from 'cross-fetch';
import URL                          from 'url';
import _                            from 'lodash';

const commands = [
    {
        name: 'identify',
        description: 'Check yout SURE.social identity and add roles.',
        options: [
            {
                'name':         'tag',
                'description':  'Your SURE tag for this server.',
                'type':         3, // STRING
                'required':     true,
            },
        ],
    },
    {
        name: 'forget',
        description: 'Remove identity-based roles.',
        options: [],
    },
    {
        name: 'snoop',
        description: `Get a user's last registered SURE tag and fingerprint.`,
        options: [
            {
                'name':         'user',
                'description':  'A user you want to snoop.',
                'type':         9, // MENTIONABLE
                'required':     true,
            },
        ],
    },
];

const rest = new Discord.REST ().setToken ( env.BOT_TOKEN );

( async () => {
    try {
        const result = await rest.put (
            Discord.Routes.applicationCommands ( env.CLIENT_ID ),
            { body: commands },
        );
        console.log ( result );
    } catch ( error ) {
        console.error ( error );
    }
})();
