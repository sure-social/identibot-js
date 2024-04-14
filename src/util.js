// Copyright (c) 2022 Fall Guy LLC All Rights Reserved.

import { assert }           from './assert.js';
import sodium               from 'libsodium-wrappers';

export const COMMUNITY_ID_REGEX             = /^[0-9a-z.-_]+$/
export const USERNAME_REGEX                 = /^[0-9a-z.-_]+$/
export const MAGIC_NUMBER_REGEX             = /^[0-9a-f-]{8}$/

//----------------------------------------------------------------//
export function format ( variant, username, magic ) {

    const components = toComponents ( variant, username, magic );

    assert ( isValid ( components ), 'Missing tag components.' );
    return ( `${ components.community }:${ components.username }:${ components.magic }` ).toLowerCase ();
}

//----------------------------------------------------------------//
export function hash ( variant, username, magic  ) {

    const components = toComponents ( variant, username, magic );

    if ( isValid ( components )) {
        const plaintext = `${ components.magic }${ components.username }${ components.community }`;
        return sodium.to_hex ( sodium.crypto_generichash ( sodium.crypto_generichash_BYTES_MAX, plaintext ));
    }
    return '';
}

//----------------------------------------------------------------//
export function isValid ( variant, username, magic ) {

    const components = toComponents ( variant, username, magic );
    
    return (
        components.community
        && components.username
        && components.magic
        && components.community.match ( COMMUNITY_ID_REGEX )
        && components.username.match ( USERNAME_REGEX )
        && components.magic.match ( MAGIC_NUMBER_REGEX )
    );
}

//----------------------------------------------------------------//
export function toComponents ( variant, username, magic ) {

    if ( typeof ( variant ) === 'object' ) return variant;

    if ( variant && username && magic ) {
        return {
            community:      variant,
            username:       username,
            magic:          magic,
        };
    }

    const components = variant.trim ().toLowerCase ().split ( ':' );
    
    return {
        community:      components [ 0 ],
        username:       components [ 1 ],
        magic:          components [ 2 ],
    }
}
