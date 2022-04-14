/* eslint-disable no-whitespace-before-property */

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


export const BOT_PREFIX = 'identibot,'

export const BOT_COMMANDS = {
    IDENTIFY:               'identify',
    FORGET:                 'forget',
    HELP:                   'help',
}

const HELP_TEXT = `
    ${ BOT_PREFIX } ${ BOT_COMMANDS.IDENTIFY } - look up your Gamercert identity and update roles.
    ${ BOT_PREFIX } ${ BOT_COMMANDS.FORGET } - forget your Gamercert identity and remove roles.
    ${ BOT_PREFIX } ${ BOT_COMMANDS.HELP } - display again this very message.
`

const ROLE_NAMES = {
    PRETEND:            'pretend',
    VERIFIED:           'verified',
    OVER_18:            '18+',
    FULL_RECOURSE:      'full recourse',
}

const ALL_ROLES = [ ...Object.values ( ROLE_NAMES )];

//----------------------------------------------------------------//
function formatURL ( url, path, query ) {

    url             = URL.parse ( url );
    path            = path || '/';

    url.pathname    = `${ url.path }${ path.replace ( /^\//, '' )}`;
    url.query       = query || {};

    url = URL.format ( url );
    return url;
}

//================================================================//
// Identibot
//================================================================//
class Identibot {

    //----------------------------------------------------------------//
    constructor () {

        this.client = new Discord.Client ();
        this.client.on ( 'message',     ( message ) => { this.onMessage ( message )});
        this.client.on ( 'ready',       () => { this.onReady ()});
    
        this.client.login ( env.BOT_TOKEN );
    }

    //----------------------------------------------------------------//
    async identify ( message, addressOrMagic ) {

        if ( !addressOrMagic ) {
            message.reply ( `I need an identity address or a magic number to identify you.` );
            return;
        }

        const components = addressOrMagic.split ( '::' );

        const community     = env.COMMUNITY_NAME;
        const username      = message.member.user.tag;
        let magic           = '';

        if ( components.length === 3 ) {

            if ( community !== components [ 0 ]) {
                message.reply ( `That community name did't match what I was expecting. I should be '${ community }'.` );
                return;
            }

            if ( username !== components [ 1 ]) {
                message.reply ( `That username did't match what I was expecting. I should be '${ username }'.` );
                return;
            }

            magic = components [ 2 ];
        }
        else if ( components.length === 1 ) {
            magic = components [ 0 ];
        }

        if ( !magic ) {
            message.reply ( 'I need your magic number to find your identity. Please provide it when you call this command.' );
            return;
        }

        const url = formatURL ( env.SERVICE_URL, 'oai', {
            community:      env.COMMUNITY_NAME,
            username:       message.member.user.tag,
            salt:           magic,
            fmt:            'json',
        });

        const result = await ( await fetch ( url )).json ();
        if ( !( result.oai && result.oai.aliasID )) {
            message.reply ( 'sorry, I couldn\'t find a profile matching your Discord tag and magic number.' );
            return;
        }

        const claims = result.oai.claims;
        const roles = [];

        roles.push ( claims.pretend ? ROLE_NAMES.PRETEND : ROLE_NAMES.VERIFIED );

        if (( claims.age.type === 'MINIMUM_AGE' ) && ( claims.age.value.minimumAge >= 18 )) {
            roles.push ( ROLE_NAMES.OVER_18 );
        }

        if ( claims.recourse.type === 'FULL' ) {
            roles.push ( ROLE_NAMES.FULL_RECOURSE );
        }

        message.reply ( `I found your profile and am adding the following Gamercert roles: ${ roles.join ( ', ' )}` );

        this.setRoles ( message.member, roles );
    }

    //----------------------------------------------------------------//
    async onMessage ( message ) {

        if ( message.author.bot ) return;
        if ( !message.content.length ) return;

        const content       = message.content;
        const tokens        = content.split ( ' ' );
        const prefix        = ( tokens.shift () || '' ).toLowerCase ();

        if ( prefix != BOT_PREFIX ) return;

        if ( message.channel.id !== env.CHANNEL_ID ) {
            message.reply ( `sorry, I am not accepting commands in this channel.` );
            return;
        }

        const command       = ( tokens.shift () || '' ).toLowerCase ();

        if ( !command ) {
            message.reply ( `I need a command, an identity address or a magic number.` );
            return;
        }

        switch ( command ) {

            case BOT_COMMANDS.IDENTIFY: {
                await this.identify ( message, tokens [ 0 ]);
                break;
            }

            case BOT_COMMANDS.FORGET: {
                this.setRoles ( message.member );
                message.reply ( 'OK, I removed all your Gamercert roles.' );
                break;
            }

            case BOT_COMMANDS.HELP: {
                message.reply ( `\`\`\`${ HELP_TEXT }\`\`\`` );
                break;
            }

            default: {
                message.reply ( `I don't recognize that command.` );
                break;
            }
        }
    }

    //----------------------------------------------------------------//
    async onReady ( message ) {
        console.log ( `Logged in as ${ this.client.user.tag }!` );
    }

    //----------------------------------------------------------------//
    setRoles ( member, addRoles ) {

        const userRolesByName = {};

        member.roles.cache.forEach (( role ) => {
            if ( !ALL_ROLES.includes ( role.name )) {
                userRolesByName [ role.name ] = role;
            }
        });

        if ( addRoles ) {
            member.guild.roles.cache.forEach (( role ) => {
                if ( addRoles.includes ( role.name )) {
                    userRolesByName [ role.name ] = role;
                }
            });
        }

        member.roles.set ( Object.values ( userRolesByName ));
    }
}

const identibot = new Identibot ();
