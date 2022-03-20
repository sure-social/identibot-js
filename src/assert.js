// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

//----------------------------------------------------------------//
export function assert ( condition, error ) {

    if ( !condition ) {
    	if ( error ) {
        	console.log ( error );
        	console.trace ();
    	}
        throw new Error ( error || 'Assetion failed.' );
    }
}
