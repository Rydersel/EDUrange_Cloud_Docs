#!/bin/bash

function execute_and_continue {
    "$@"
    if [ $? -ne 0 ]; then
        echo "Command failed: $@"
    else
        echo "Command succeeded: $@"
    fi
}

function execute_and_exit_on_failure {
    "$@"
    if [ $? -ne 0 ]; then
        echo "Failed to Build Image, Exiting."
        exit 1
    else
        echo "Building Image Successful :)"
    fi
}

execute_and_continue kubectl delete deployment docs

execute_and_continue kubectl delete svc docs

execute_and_exit_on_failure docker buildx build --platform linux/amd64 -t registry.rydersel.cloud/docs . --push

execute_and_exit_on_failure kubectl apply -f deployment.yaml

echo "Success! docs deployed to cluster"
