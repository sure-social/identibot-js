#/bin/bash

SCRIPT_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TAG=fallguydev/identibot-js

pushd ${SCRIPT_HOME}
    docker build -t $TAG .
    docker push $TAG
popd
