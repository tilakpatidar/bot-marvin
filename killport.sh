#!/bin/sh
PNUMPER=$1;
sudo kill -9 `lsof -w -n -i tcp:$PNUMPER| awk '{print $2}'|awk 'END{print}'`;
