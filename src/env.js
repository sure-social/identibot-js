// Copyright (c) 2022 Fall Guy LLC All Rights Reserved.

import { assert }                   from 'assert';
import _                            from 'lodash';

//----------------------------------------------------------------//
function getEnv ( name, fallback ) {
    const value = _.has ( process.env, name ) ? process.env [ name ] : fallback;
    assert ( value !== undefined, `Missing ${ name } environment variable.` );
    return value;
}

export const BOT_TOKEN                          = getEnv ( 'BOT_TOKEN' );
export const CHANNEL_ID                         = getEnv ( 'CHANNEL_ID' );
export const COMMUNITY_NAME                     = getEnv ( 'COMMUNITY_NAME' );
export const SERVICE_URL                        = getEnv ( 'SERVICE_URL' );
export const SQLITE_FILE                        = getEnv ( 'SQLITE_FILE', './volume/sqlite.db' );
