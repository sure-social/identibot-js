// Copyright (c) 2022 Fall Guy LLC All Rights Reserved.

process.on ( 'uncaughtException', function ( err ) {
    console.log ( err );
    process.exit ( 1 );
});

import sqlite3                      from 'better-sqlite3';
import Discord                      from 'discord.js';
import * as env                     from 'env';
import fs                           from 'fs';
import fetch                        from 'cross-fetch';
import URL                          from 'url';
import _                            from 'lodash';
import * as sure                    from 'sure';

const db = new sqlite3 ( env.SQLITE_FILE );

db.prepare (`
    CREATE TABLE IF NOT EXISTS members (
        id              INTEGER         PRIMARY KEY,
        user_id         TEXT            NOT NULL,
        guild_id        TEXT            NOT NULL,
        tag             TEXT            NOT NULL DEFAULT '',
        fingerprint     TEXT            NOT NULL DEFAULT '',
        UNIQUE ( user_id, guild_id )
    )
`).run ();

const ROLE_NAMES = {
    PRETEND:            'pretend',
    VERIFIED:           'verified',
    OVER_18:            '18+',
    FULL_RECOURSE:      'full recourse',
}

const ALL_ROLES = [ ...Object.values ( ROLE_NAMES )];

const client = new Discord.Client ({ intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
]});

client.once ( Discord.Events.ClientReady, ( client ) => {
    console.log ( `Logged in as ${ client.user.tag }!` );
});

client.login ( env.BOT_TOKEN );

client.on ( Discord.Events.InteractionCreate, async ( interaction ) => {
    if ( !interaction.isChatInputCommand ()) return;

    switch ( interaction.commandName ) {

        case 'identify': {
            await identify ( interaction );
            break;
        }

        case 'forget': {
            await setRoles ( interaction.member );
            interaction.reply ( 'OK, I removed all your SURE.social server profile roles.' );
            break;
        }

        case 'snoop': {
            snoop ( interaction );
            break;
        }
    }
});

//----------------------------------------------------------------//
async function identify ( interaction ) {

    const guildID = interaction.member.guild.id;
    const userID = interaction.member.user.id;

    const record = db.prepare ( `SELECT * FROM members WHERE guild_id IS ? AND user_id IS ? LIMIT 1` ).get ( guildID, userID );

    const tag = interaction.options.getString ( 'tag' );
    const components = sure.tag.toComponents ( tag )

    if ( !sure.tag.isValid ( components )) {
        interaction.reply ( `That doesn't appear to be a valid SURE tag.` );
        return;
    }

    const username = interaction.member.user.username;

    if ( components.community !== 'discord' ) {
        interaction.reply ( `That community name did't match what I was expecting. It should be 'discord'.` );
        return;
    }

    if ( components.username !== username ) {
        interaction.reply ( `That username didn't match your global Discord username. It should be '${ username }'.` );
        return;
    }

    try {

        const hash = sure.tag.hash ( components );
        const url = `${ env.SERVICE_URL }oai?hash=${ hash }`;
        const result = await ( await fetch ( url )).json ();
        const identity = result.identity;

        await setRoles ( interaction.member );

        if ( !identity ) {
            interaction.reply ( 'Sorry, I couldn\'t find an identity matching your SURE tag.' );
            return;
        }

        const roles = [];

        switch ( identity.status ) {

            case 'INVALID':
                 interaction.reply ( 'Looks like that tag is invalid.' );
                break;

            case 'REVOKED':
                 interaction.reply ( 'Looks like that identity was revoked.' );
                break;

            case 'PRETEND':
                roles.push ( ROLE_NAMES.PRETEND  );
                break;

            case 'RECOURSE':
                roles.push ( ROLE_NAMES.FULL_RECOURSE  );
                // fall through

            case 'VALID':
                roles.push ( ROLE_NAMES.VERIFIED  );
                if ( identity.minimumAge && ( identity.minimumAge >= 18 )) {
                    roles.push ( ROLE_NAMES.OVER_18 );
                }
                break;
        }

        if ( roles.length ) {
            interaction.reply ( `I found your identity and added the following roles to your server profile: ${ roles.join ( ', ' )}` );
        }
        await setRoles ( interaction.member, roles );

        if ( record ) {
            db.prepare (
                `UPDATE members SET tag = ?, fingerprint = ? WHERE id = ?`
            ).run ( tag, identity.aliasID, record.id );
        }
        else {
            db.prepare (
                `INSERT INTO members ( guild_id, user_id, tag, fingerprint ) VALUES ( ?, ?, ?, ? )`
            ).run ( guildID, userID, tag, identity.aliasID );
        }
    }
    catch ( error ) {
        console.log ( error );
    }
}

//----------------------------------------------------------------//
async function setRoles ( member, addRoles ) {

    const userRolesByName = {};

    member.roles.cache.forEach (( role ) => {
        if ( !ALL_ROLES.includes ( role.name )) {
            userRolesByName [ role.name ] = role;
        }
    });

    if ( addRoles && addRoles.length ) {
        member.guild.roles.cache.forEach (( role ) => {
            if ( addRoles.includes ( role.name )) {
                userRolesByName [ role.name ] = role;
            }
        });
    }

    await member.roles.set ( Object.values ( userRolesByName ));
}

//----------------------------------------------------------------//
async function snoop ( interaction ) {

    const user = interaction.options.getUser ( 'user' );

    const guildID = interaction.member.guild.id;
    const userID = user.id;

    const record = db.prepare ( `SELECT * FROM members WHERE guild_id IS ? AND user_id IS ? LIMIT 1` ).get ( guildID, userID );
    if ( !record ) {
        interaction.reply ( `I couldn't find a SURE.social identity for that user.` );
        return;
    }

    const info = [];

    info.push ( user.username );
    info.push ( record.tag );
    info.push ( record.fingerprint );

    try {

        const url = `${ env.SERVICE_URL }oai?uuid=${ record.fingerprint }`;
        const result = await ( await fetch ( url )).json ();
        const identity = result.identity;

        if ( identity ) {

            switch ( identity.status ) {

                case 'INVALID':
                    info.push ( 'INVALID' );
                    break;

                case 'REVOKED':
                    info.push ( 'REVOKED' );
                    break;

                case 'PRETEND':
                    info.push ( 'PRETEND' );
                    break;

                case 'RECOURSE':
                    info.push ( 'FULL RECOURSE' );
                    // fall through

                case 'VALID':
                    info.push ( 'VERIFIED' );
                    if ( identity.minimumAge && ( identity.minimumAge >= 18 )) {
                        info.push ( '18+' );
                    }
                    break;
            }
        }
    }
    catch ( error ) {
        console.log ( error );
    }

    interaction.reply ( info.join ( '\n' ));
}
